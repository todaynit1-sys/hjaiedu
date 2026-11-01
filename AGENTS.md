# AI환경연구소 강의실

This is a React/Vite application with a Cloudflare Worker and SQLite Durable Object, not Next.js.

- Preserve Worker name `mamo-edu`, class `ClassBoard`, migration `v1`, room `MAMOAI`, and the existing storage namespace when deploying updates.
- Never deploy this repository to the separate `edu` Worker.
- Keep chat, polls, attachment sharing, five-tap instructor access and daily reset behavior working.
- Personal identity: 신현준 연구사 AI환경연구소. Contact: hjuni@korea.kr.
- Reuse the selected concept 06 AI letterform mark (navy letters with a teal dot) in `public/branding/ai-environment-*`. Use the light variant in navy headers. The previous HJ leaf mark was rejected.
- Keep mobile polls compact so chat remains the main workspace. Check desktop and 320px layouts after UI changes.
- Do not commit credentials, `.local`, `.wrangler`, `dist` or `node_modules`.
- Run `npm run typecheck`, `npm test` and `npm run build`. For server changes run `npm run test:worker`.
