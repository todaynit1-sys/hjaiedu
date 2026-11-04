# 신현준 연구사 AI환경연구소 실시간 강의실

20석이 한 화면에 보이는 실시간 AI 강의실입니다. 수강생은 자기 책상이나 **캐릭터 선택**을 눌러 20종 중 하나를 고릅니다. 선택은 같은 날 재접속해도 유지되며, 채팅은 그 캐릭터 위에 말풍선으로 뜹니다. 초록 칠판에는 강사의 마지막 메시지가 보입니다. 21번 이후 좌석은 20석 단위로 넘겨볼 수 있습니다.

소스 저장소: https://github.com/todaynit1-sys/hjaiedu

문의: **hjuni@korea.kr**. 선택한 6번 AI 글자형 벡터 로고, 네이비 헤더, 읽기 쉬운 채팅 화면을 사용합니다. 로고 원본은 `public/branding/ai-environment-mark-v1.svg`, 가로 로고는 `ai-environment-wordmark-v1.svg`입니다.

- 회사 수강생 주소: https://hjaiedu.vercel.app/
- 회사 강사 주소: https://hjaiedu.vercel.app/host?room=MAMOAI
- 회사 전용 Cloudflare 서버: https://mamo-edu.hjsy.workers.dev/
- 기본 참여 코드: `MAMOAI`
- 강사 접속: 상단 공기 심볼을 5번 누른 뒤 기존 접속 코드 `0423` 입력

채팅, 링크·당일 파일 공유, 메시지 고정·삭제, 실시간 투표, 참여 링크·QR, 별도 강의실 생성, 한국 시간 자정 초기화를 지원합니다. 강사 업로드는 개당 10MiB이며, 기본 실습 PDF 12종도 제공합니다. 외부 수업 설문은 개인 AI전략연구소와 같은 구글폼을 사용합니다. 강의실 안의 컨디션과 수업 투표는 회사 전용 서버에 저장됩니다.

Vercel은 회사 강의실 화면을 제공하고 회사 전용 Cloudflare Worker `mamo-edu`가 채팅·투표·당일 첨부파일을 저장합니다. 기본 방은 `MAMOAI`, Durable Object 이름은 `mamo-class-board`입니다. 개인 AI전략연구소는 별도 저장소 `todaynit1-sys/hjsyedu`, Worker `edu`, 방 `HJSYAI`를 사용합니다.

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

PC에서는 교실과 실시간 채팅이 나란히 열립니다. 모바일에서는 **교실**과 **채팅**을 전환하며, 어느 쪽에서도 같은 입력창으로 메시지를 보낼 수 있습니다. **오늘의 컨디션**에서 표정을 누르면 세 항목별 인원수가 모두의 화면에 갱신됩니다. **참고자료**에서는 실습 PDF를 내려받습니다.

### Cloudflare

GitHub에 코드를 저장하는 것과 실제 강의실 서버를 실행하는 것은 별개입니다. 전체 기능은 Cloudflare **Workers**에 배포합니다. GitHub Pages에서는 WebSocket 서버와 데이터 저장 기능이 실행되지 않습니다.

Cloudflare 대시보드 → Workers & Pages → 기존 `mamo-edu` Worker → Settings → Builds에서 `todaynit1-sys/hjaiedu`의 `main`을 연결합니다. 빌드 명령은 `npm run build`, 배포 명령은 `npx wrangler deploy`, Node 버전은 `24`입니다. 기존 `edu` Worker가 아닌 `mamo-edu`를 선택해야 합니다. 저장소에 Cloudflare 토큰을 넣지 않습니다.

Cloudflare 계정 `1ab0cc202cc88e4caa80a36f2450d352`에 인증된 환경에서 `npm run deploy`를 실행합니다. `wrangler.jsonc`의 Worker 이름과 Durable Object 클래스·migration을 유지하면 운영 데이터를 이어서 사용합니다. 강사 코드는 선택적으로 `HOST_PASSWORD` secret으로 설정할 수 있습니다.

화면의 연구소명·강사명은 `lib/brand.ts`, 새 심볼·워드마크·공유 이미지는 `public/branding/ai-environment-*`에 있습니다. 공기 심볼은 강의실을 위해 만든 독자적인 그래픽입니다. 브랜드 표기는 신현준 연구사 AI환경연구소입니다.

## 카카오톡 공유 썸네일

6번 AI 글자형 로고를 바탕으로 만든 입체 네이비·청록색 공유 이미지입니다. 파일은 public/branding/ai-environment-kakao-v3.png (1730×909 PNG)이며 Open Graph와 Twitter 메타태그에 연결합니다. 새 파일명으로 배포하며 카카오 서버의 기존 URL 스크랩 캐시는 별도로 남아 있을 수 있습니다.
