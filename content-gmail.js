(() => {
  // ---------- 공통 유틸 ----------
  function normalizeFiles(fileListLike) {
    const dt = new DataTransfer();
    let changed = false;
    for (const file of fileListLike) {
      const nfcName = (file.name || '').normalize('NFC');
      if (nfcName !== file.name) {
        const f2 = new File([file], nfcName, {
          type: file.type,
          lastModified: file.lastModified
        });
        dt.items.add(f2);
        changed = true;
      } else {
        dt.items.add(file);
      }
    }
    return { files: dt.files, changed };
  }

  // 붙여넣기에서 파일명이 비어있는 경우 확장자 추정
  function guessExtByType(mime) {
    if (!mime) return '';
    const m = mime.toLowerCase();
    if (m.includes('png')) return '.png';
    if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
    if (m.includes('gif')) return '.gif';
    if (m.includes('webp')) return '.webp';
    if (m.includes('pdf')) return '.pdf';
    if (m.includes('plain')) return '.txt';
    if (m.includes('html')) return '.html';
    return '';
  }

  // ---------- 환경 판별 ----------
  const isGmail = location.hostname === 'mail.google.com';
  const isGChat = location.hostname === 'chat.google.com';

  // ---------- 파일 input 탐색 (Gmail/Chat 겸용) ----------
  function findNearestFileInput(fromEl) {
    // 1) 현재 포커스/이벤트 위치 기준으로 가까운 컴포즈/대화 영역 스코프 찾기
    let scope = null;

    if (fromEl instanceof Element) {
      // Gmail compose dialog
      scope = fromEl.closest('[role="dialog"]');
      // Chat 메시지 입력 영역(메시지 box/스페이스 pane)
      if (!scope) {
        scope =
          fromEl.closest('[aria-label="Message"]') ||               // 일부 Chat 입력기
          fromEl.closest('[aria-label="Message body"]') ||           // 변형
          fromEl.closest('[aria-label="Type a message"]') ||         // 변형
          fromEl.closest('[data-topic-id]') ||                       // 스레드/스페이스 컨테이너
          fromEl.closest('[role="textbox"]');                        // 리치텍스트 본문
      }
    }

    const roots = scope ? [scope, document] : [document];

    // 2) 스코프 내부에서 숨은 file input 우선 탐색
    for (const root of roots) {
      // Chat/Gmail 모두 대체로 hidden input[type=file] multiple 사용
      const cands =
        root.querySelectorAll('input[type="file"][multiple], input[type="file"]');
      for (const el of cands) return el;
    }

    return null;
  }

  function injectFilesToInput(inputEl, files, { dispatch = true } = {}) {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    try {
      inputEl.files = dt.files;
      if (dispatch) {
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  // ---------- 파일 선택(change): 원본 change 차단 후 단 한 번만 재발생 ----------
  const reentryGuard = new WeakSet();

  document.addEventListener(
    'change',
    (e) => {
      const t = e.target;
      if (!(t && t instanceof HTMLInputElement && t.type === 'file')) return;
      if (reentryGuard.has(t)) return;

      const list = t.files;
      if (!list || list.length === 0) return;

      const { files, changed } = normalizeFiles(list);
      if (!changed) return; // 정규화 불필요 → 기본 처리

      // 원본 change를 차단하여 중복 방지
      e.stopImmediatePropagation();
      e.stopPropagation();

      injectFilesToInput(t, files, { dispatch: false });
      reentryGuard.add(t);
      try {
        t.dispatchEvent(new Event('input', { bubbles: true }));
        t.dispatchEvent(new Event('change', { bubbles: true }));
      } finally {
        setTimeout(() => reentryGuard.delete(t), 0);
      }
    },
    true // 캡처 단계
  );

  // ---------- 드래그&드롭 ----------
  document.addEventListener(
    'dragover',
    (e) => {
      const dt = e.dataTransfer;
      if (dt) dt.dropEffect = 'copy';
    },
    true
  );

  document.addEventListener(
    'drop',
    (e) => {
      const dt = e.dataTransfer;
      if (!dt || dt.files.length === 0) return;

      const { files, changed } = normalizeFiles(dt.files);
      if (!changed) return; // 정규화 필요 없으면 기본 처리

      const input = findNearestFileInput(e.target);
      if (!input) return;

      // 기본 drop 차단 후 우리가 주입
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();

      injectFilesToInput(input, files, { dispatch: true });

      // (Gmail 전용) 드롭 오버레이 정리: 합성 이벤트
      if (isGmail) {
        try {
          const targetEl = (e.target instanceof Element) ? e.target : document;
          const emptyDT = new DataTransfer();
          setTimeout(() => {
            targetEl.dispatchEvent(new DragEvent('drop', {
              bubbles: true, cancelable: true, dataTransfer: emptyDT
            }));
            document.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
            document.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true }));
          }, 0);
        } catch (_) { /* noop */ }
      }
    },
    true
  );

    // ---------- 붙여넣기: files 비어있는 브라우저 대비(items 경로 포함) ----------
  // ---------- 붙여넣기: items 우선 + 중복 제거 ----------
  document.addEventListener(
    'paste',
    (e) => {
      const cd = e.clipboardData;
      if (!cd) return;

      // 1) items에서 file 먼저 수집 (있으면 files는 무시)
      const itemsFiles = [];
      for (const it of Array.from(cd.items || [])) {
        if (it && it.kind === 'file') {
          const f = it.getAsFile();
          if (f) itemsFiles.push(f);
        }
      }

      let collected = [];
      if (itemsFiles.length > 0) {
        collected = itemsFiles;
      } else {
        // items에 file이 없을 때만 files 사용 (일부 환경 호환)
        collected = Array.from(cd.files || []);
      }

      if (collected.length === 0) return; // 파일 없으면 기본 동작

      // 2) 중복 제거 (name|size|type|lastModified 키)
      const uniq = new Map();
      for (const f of collected) {
        const key = [
          (f.name || ''),
          String(f.size || 0),
          (f.type || ''),
          String(f.lastModified || 0)
        ].join('|');
        if (!uniq.has(key)) uniq.set(key, f);
      }
      const uniqueFiles = Array.from(uniq.values());

      // 3) 이름 생성/정규화
      function guessExtByType(mime) {
        if (!mime) return '';
        const m = mime.toLowerCase();
        if (m.includes('png')) return '.png';
        if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
        if (m.includes('gif')) return '.gif';
        if (m.includes('webp')) return '.webp';
        if (m.includes('pdf')) return '.pdf';
        if (m.includes('plain')) return '.txt';
        if (m.includes('html')) return '.html';
        return '';
      }

      const now = new Date();
      const ts = now.getFullYear().toString()
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0') + '-'
        + String(now.getHours()).padStart(2, '0')
        + String(now.getMinutes()).padStart(2, '0')
        + String(now.getSeconds()).padStart(2, '0');

      const normalizedFiles = [];
      for (const f of uniqueFiles) {
        let name = (f.name || '').trim();
        if (!name) name = `pasted-${ts}${guessExtByType(f.type)}`;
        const nfcName = name.normalize('NFC');
        normalizedFiles.push(new File([f], nfcName, { type: f.type, lastModified: f.lastModified }));
      }

      // 4) 대상 input 찾기
      const input = (function findNearestFileInput(fromEl) {
        let scope = null;
        if (fromEl instanceof Element) {
          scope = fromEl.closest('[role="dialog"]')  // Gmail compose
              || fromEl.closest('[aria-label="Message"]')
              || fromEl.closest('[aria-label="Message body"]')
              || fromEl.closest('[aria-label="Type a message"]')
              || fromEl.closest('[data-topic-id]')
              || fromEl.closest('[role="textbox"]');
        }
        const roots = scope ? [scope, document] : [document];
        for (const root of roots) {
          const cands = root.querySelectorAll('input[type="file"][multiple], input[type="file"]');
          if (cands.length) return cands[0];
        }
        return null;
      })(e.target);

      if (!input) return;

      // 5) 기본 붙여넣기 차단 후 한 번만 주입
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();

      const dt = new DataTransfer();
      for (const f of normalizedFiles) dt.items.add(f);
      try {
        input.files = dt.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (_) { /* noop */ }
    },
    true
  );
})();
