# nfd-nfc-chrome-ext (Gmail Korean Filename Normalizer)

이 크롬/엣지 확장 프로그램은 Gmail에서 첨부파일 업로드 시 **MacOS 기본 NFD(Normalization Form Decomposed) 한글 파일명을 NFC(Normalization Form Composed)** 로 자동 변환합니다.  
이를 통해 수신자가 깨진 한글 파일명을 받는 문제를 방지할 수 있습니다.

---

## ✨ 기능

- **파일 선택**, **드래그&드롭**, **붙여넣기(클립보드 이미지/파일)** 모두 지원  
- 한글 파일명을 **NFD → NFC**로 정규화  
- 중복 업로드 방지 (이벤트 전파 제어)  
- 파일명이 없는 클립보드 이미지는 `pasted-YYYYMMDD-HHMMSS.png` 형식으로 자동 이름 생성  
- Chrome, Microsoft Edge (Chromium 기반) 지원  

---

## 📦 설치 방법

1. 이 저장소를 클론하거나 다운로드합니다.
   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
   또는 우측 상단의 **Code → Download ZIP** 버튼으로 압축 파일을 내려받아 압축을 해제합니다.

2. 브라우저에서 확장 프로그램 관리 페이지를 엽니다.  
   - Chrome: `chrome://extensions/`  
   - Edge: `edge://extensions/`

3. 오른쪽 상단의 **개발자 모드(Developer mode)**를 켭니다.

4. **압축 해제된 확장 프로그램 로드(Load unpacked)** 버튼을 누르고, 다운로드 또는 클론한 프로젝트 폴더를 선택합니다.

5. 확장 프로그램 목록에 **Gmail Korean Filename Normalizer**가 추가되었는지 확인합니다.

6. Gmail을 새로고침한 뒤 파일을 업로드해 정상적으로 **NFD → NFC 변환**이 적용되는지 테스트합니다.

---

## 🖥️ 사용법

1. [Gmail](https://mail.google.com)에 접속합니다.  
2. 새 메일 작성 창을 엽니다.  
3. 첨부파일을 추가하는 방법:
   - **파일 선택** (클립 아이콘)  
   - **드래그&드롭** (메일 본문에 파일 끌어다 놓기)  
   - **붙여넣기 (Ctrl+V / Cmd+V)**  
4. 파일명이 자동으로 NFC로 변환되어 업로드됩니다.

---

## ⚠️ 참고 사항

- 현재는 **Gmail 전용**으로 동작합니다.  
- Gmail의 compose 창은 내부적으로 `about:blank` iframe을 사용하기 때문에 `match_about_blank: true` 옵션으로 주입됩니다.  
- Microsoft Edge에서 사용 시:
  - **다른 스토어 확장 허용(Allow extensions from other stores)**을 켜야 합니다.  
  - 필요 시 **InPrivate 허용** 옵션을 켜야 합니다.  
  - **향상된 보안 모드**가 켜져 있다면 `mail.google.com`을 예외 사이트로 추가해야 할 수 있습니다.  

---

## 📂 프로젝트 구조

```text
├── manifest.json        # 확장 프로그램 매니페스트 (MV3)
├── content-gmail.js     # Gmail용 핵심 로직
├── icon16.png/          # 확장 프로그램 아이콘
├── icon48.png/          # 확장 프로그램 아이콘
├── icon128.png/          # 확장 프로그램 아이콘
└── README.md            # 프로젝트 문서
```

---

## 📝 라이선스

MIT License

Copyright (c) 2025 Young Myoung Ko

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights  
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell  
copies of the Software, and to permit persons to whom the Software is  
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all  
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR  
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE  
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER  
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,  
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE  
SOFTWARE.
