# 신현준 연구사 AI환경연구소 실시간 강의실

기존 강의용 채팅 사이트를 복제한 독립 운영 버전입니다.

소스 저장소: https://github.com/todaynit1-sys/hjaiedu

문의: **hjuni@korea.kr**. 선택한 6번 AI 글자형 벡터 로고, 네이비 헤더, 읽기 쉬운 채팅 화면을 사용합니다. 로고 원본은 `public/branding/ai-environment-mark-v1.svg`, 가로 로고는 `ai-environment-wordmark-v1.svg`입니다.

- 수강생 주소: https://mamo-edu.hjsy.workers.dev/
- Vercel 수강생 주소: https://hjaiedu.vercel.app/
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

### Vercel

`todaynit1-sys/hjaiedu`의 `main`을 Vercel 프로젝트 `hjaiedu`로 가져옵니다. `vercel.json`이 Vite 빌드와 `dist` 출력을 설정합니다. 공개 배포물에는 해시가 붙은 압축 JS/CSS와 사용 중인 로고·폰트·자료만 들어가며 소스맵, 개발 문서와 서버 소스는 포함하지 않습니다. GitHub 저장소 자체는 공개이므로 개발 원본은 저장소에서 볼 수 있습니다.

일반 `/api/*` 요청은 기존 `mamo-edu.hjsy.workers.dev`의 Worker로 연결합니다. WebSocket은 프록시를 거치지 않고, 60초 유효한 서명 접속권을 발급받아 Worker에 직접 연결합니다. 접속권은 방과 기존 세션 권한에 묶이며 URL이나 브라우저 저장소에 보관하지 않습니다. Vercel은 화면을 제공하고 채팅·투표·파일·자정 초기화는 독립 Cloudflare 저장소에서 실행합니다. 양쪽 주소는 같은 강의실 데이터를 사용합니다. 개인 브라우저 세션은 접속 주소별로 구분됩니다.

모바일은 큰 입력·전송 버튼, 16px 입력 글자, 기기 안전 영역을 적용합니다. 입력창에 포커스하면 빠른 투표 영역을 잠시 접어 키보드와 채팅 공간을 확보하고, 입력창을 벗어나면 다시 보입니다.

### Cloudflare

GitHub에 코드를 저장하는 것과 실제 강의실 서버를 실행하는 것은 별개입니다. 전체 기능은 Cloudflare **Workers**에 배포합니다. GitHub Pages에서는 WebSocket 서버와 데이터 저장 기능이 실행되지 않습니다.

Cloudflare 대시보드 → Workers & Pages → 기존 `mamo-edu` Worker → Settings → Builds에서 `todaynit1-sys/hjaiedu`의 `main`을 연결합니다. 빌드 명령은 `npm run build`, 배포 명령은 `npx wrangler deploy`, Node 버전은 `24`입니다. 기존 `edu` Worker가 아닌 `mamo-edu`를 선택해야 합니다. 저장소에 Cloudflare 토큰을 넣지 않습니다.

Cloudflare 계정 `1ab0cc202cc88e4caa80a36f2450d352`에 인증된 환경에서 `npm run deploy`를 실행합니다. `wrangler.jsonc`의 Worker 이름과 Durable Object 클래스·migration을 유지하면 운영 데이터를 이어서 사용합니다. 강사 코드는 선택적으로 `HOST_PASSWORD` secret으로 설정할 수 있습니다.

화면의 연구소명·강사명은 `lib/brand.ts`, 새 심볼·워드마크·공유 이미지는 `public/branding/ai-environment-*`에 있습니다. 공기 심볼은 강의실을 위해 만든 독자적인 그래픽입니다. 브랜드 표기는 신현준 연구사 AI환경연구소입니다.

## 카카오톡 공유 썸네일

6번 AI 글자형 로고를 바탕으로 만든 입체 네이비·청록색 공유 이미지입니다. 파일은 public/branding/ai-environment-kakao-v3.png (1730×909 PNG)이며 Open Graph와 Twitter 메타태그에 연결합니다. 새 파일명으로 배포하며 카카오 서버의 기존 URL 스크랩 캐시는 별도로 남아 있을 수 있습니다.
