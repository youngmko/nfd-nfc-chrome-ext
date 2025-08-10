// content-gmail.js
(() => {
  // ---------- 공통 유틸 ----------
  function normalizeFiles(fileListLike) {
    const dt = new DataTransfer();
    let changed = false;
    for (const file of fileListLike) {
      const nfcName = file.name.normalize('NFC');
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

  function findComposeRoot(fromEl) {
    return fromEl instanceof Element ? fromEl.closest('[role="dialog"]') : null;
  }

  function findNearestGmailFileInput(fromEl) {
    const compose = findComposeRoot(fromEl);
    const roots = compose ? [compose] : [document];
    for (const root of roots) {
      // Gmail은 compose 다이얼로그 내부에 hidden file input이 있음
      const cands = root.querySelectorAll('input[type="file"][multiple]');
      if (cands.length) return cands[0];
    }
    return document.querySelector('input[type="file"][multiple]') || null;
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

  // ---------- (유지) 파일 선택(change): 원본 change 차단 후 단 한 번만 재발생 ----------
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
      if (!changed) return; // 정규화 불필요 시 Gmail 기본 처리

      // Gmail의 자체 change 핸들러까지 막아 중복 방지
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

  // ---------- (수정) 드래그&드롭: 캡처 단계에서 완전 차단 후 한 번만 주입 ----------
  document.addEventListener(
    'dragover',
    (e) => {
      // 우리가 처리할 drop임을 알리기 위해 기본 동작 방지 (필수는 아니지만 깔끔)
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
    if (!changed) return; // 정규화 불필요 → Gmail 기본 처리(오버레이도 정상 종료)

    const input = findNearestGmailFileInput(e.target);
    if (!input) return;

    // Gmail의 실제 drop 처리(업로드)를 막고 우리가 주입
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();

    injectFilesToInput(input, files, { dispatch: true });

    // 🔽 오버레이 닫기: Gmail 내부 핸들러가 동작하도록 빈 드롭/드래그 종료 이벤트 합성
    try {
      const targetEl = (e.target instanceof Element) ? e.target : document;

      // 빈 DataTransfer 생성
      const emptyDT = new DataTransfer();

      // 약간의 지연 후(주입 완료 보장), 합성 이벤트 전파
      setTimeout(() => {
        // drop (빈 파일) – 업로드는 일어나지 않음, 오버레이 정리 트리거
        targetEl.dispatchEvent(new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: emptyDT
        }));
        // dragleave / dragend – 추가로 오버레이 정리에 도움
        document.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
        document.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true }));
      }, 0);
    } catch (_) {
      // 합성 이벤트가 실패해도 치명적이지 않음. (대부분의 환경에서 동작)
    }
  },
  true // 캡처 단계
);
// ---------- (수정) 붙여넣기: 캡처 단계에서 완전 차단 후 한 번만 주입 ----------
  document.addEventListener(
    'paste',
    (e) => {
      const cd = e.clipboardData;
      if (!cd) return;

      const files = Array.from(cd.files || []);
      if (files.length === 0) return;

      const { files: nfiles, changed } = normalizeFiles(files);
      if (!changed) return; // 정규화 필요 없으면 Gmail 기본 처리

      const input = findNearestGmailFileInput(e.target);
      if (!input) return;

      // Gmail의 paste 파일 처리까지 완전히 차단
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();

      injectFilesToInput(input, nfiles, { dispatch: true });
    },
    true // 캡처 단계
  );
})();