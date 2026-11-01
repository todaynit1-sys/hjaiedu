# 신현준 연구사 AI환경연구소 실시간 강의실

기존 강의용 채팅 사이트를 복제한 독립 운영 버전입니다.

소스 저장소: https://github.com/todaynit1-sys/hjaiedu

문의: **hjuni@korea.kr**. HJ 이니셜과 잎을 결합한 자체 벡터 로고, 네이비 헤더, 읽기 쉬운 채팅 화면을 사용합니다. 로고 원본은 `public/branding/hj-environment-symbol.svg`, 가로 로고는 `hj-environment-wordmark.svg`입니다.

- 수강생 주소: https://mamo-edu.hjsy.workers.dev/
- 강사 주소: https://mamo-edu.hjsy.workers.dev/host?room=MAMOAI
- 기본 참여 코드: `MAMOAI`
- 강사 접속: 상단 공기 심볼을 5번 누른 뒤 기존 접속 코드 `0423` 입력

채팅, 링크·당일 파일 공유, 메시지 고정·삭제, 실시간 투표, 참여 링크·QR, 별도 강의실 생성, 한국 시간 자정 초기화 기능을 유지합니다. 강사 업로드는 개당 10MiB이며, 기존 실습 PDF 12종도 제공합니다. 기존 수업 설문을 유지하고 문의 이메일은 hjuni@korea.kr로 제공합니다.

React/Vite + Cloudflare Workers + SQLite Durable Object 구조입니다. Worker 이름은 `mamo-edu`, 기본 강의실은 `MAMOAI`, 내부 객체는 `mamo-class-board`입니다. 별도 Worker와 저장소를 사용하므로 기존 `edu`의 대화·투표·강사 세션과 독립적으로 운영합니다. 기존 환경 파일, 인증 정보와 운영 데이터를 복사하지 않았습니다.

## 개발 및 검증

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:worker
npm run dev
```

로컬 주소는 http://localhost:3010 입니다. `scripts/verify-worker.mjs`는 로컬 런타임에서 50명 동시 접속·투표, 채팅, 권한, 파일 공유와 자정 초기화를 검증합니다.

## 배포

GitHub에 코드를 저장하는 것과 실제 강의실 서버를 실행하는 것은 별개입니다. 전체 기능은 Cloudflare **Workers**에 배포합니다. GitHub Pages에서는 WebSocket 서버와 데이터 저장 기능이 실행되지 않습니다.

Cloudflare 대시보드 → Workers & Pages → 기존 `mamo-edu` Worker → Settings → Builds에서 `todaynit1-sys/hjaiedu`의 `main`을 연결합니다. 빌드 명령은 `npm run build`, 배포 명령은 `npx wrangler deploy`, Node 버전은 `24`입니다. 기존 `edu` Worker가 아닌 `mamo-edu`를 선택해야 합니다. 저장소에 Cloudflare 토큰을 넣지 않습니다.

Cloudflare 계정 `1ab0cc202cc88e4caa80a36f2450d352`에 인증된 환경에서 `npm run deploy`를 실행합니다. `wrangler.jsonc`의 Worker 이름과 Durable Object 클래스·migration을 유지하면 운영 데이터를 이어서 사용합니다. 강사 코드는 선택적으로 `HOST_PASSWORD` secret으로 설정할 수 있습니다.

화면의 연구소명·강사명은 `lib/brand.ts`, 새 심볼·워드마크·공유 이미지는 `public/branding/hj-environment-*`에 있습니다. 공기 심볼은 강의실을 위해 만든 독자적인 그래픽입니다. 브랜드 표기는 신현준 연구사 AI환경연구소입니다.
