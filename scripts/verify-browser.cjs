const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { mkdirSync, writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
async function waitUntil(fn, message) { for (let i=0;i<40;i++) { if(await fn()) return; await new Promise(r=>setTimeout(r,200)); } throw new Error(message); }
(async () => {
  mkdirSync('.local/screenshots', { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const teacher = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const studentA = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const studentB = await browser.newContext();
  const errors = [];
  const page = await teacher.newPage(); page.on('pageerror',e=>errors.push(e.message));
  const mainJoins = await Promise.all([studentA.request.post(base+'/api/rooms/MAMOAI',{data:{type:'join'}}),studentB.request.post(base+'/api/rooms/MAMOAI',{data:{type:'join'}})]);
  assert(mainJoins.every(response=>response.status()===200),'Main room initialization failed');
  assert((await Promise.all(mainJoins.map(response=>response.json()))).every(room=>room.code==='MAMOAI'));
  await page.goto(base); await page.getByRole('heading',{name:'실시간 채팅',exact:true}).waitFor();
  assert.equal(await page.getByLabel('채팅 메시지',{exact:true}).isEnabled(),true);
  assert.equal(await page.getByLabel('강의실 참여 코드',{exact:true}).count(),0);
  await page.screenshot({ path: '.local/screenshots/home-desktop.png', fullPage: true });
  await page.keyboard.press('Tab'); assert.equal(await page.locator('.skip-link').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Tab');
  for (let tap = 0; tap < 5; tap++) await page.getByRole('button',{name:'AI환경연구소 로고',exact:true}).click();
  await page.getByLabel('강사 접속 코드').fill(process.env.TEST_HOST_PASSWORD || '0423');
  await page.getByRole('button', { name: '강사로 들어가기' }).click();
  await page.waitForURL(/host\?room=MAMOAI/);
  await page.getByRole('heading', { name: '실시간 채팅',exact:true }).waitFor();
  assert.match(page.url(),/host\?room=MAMOAI/);
  const create = await teacher.request.post(base+'/api/rooms', { data: { title: '실시간 기능 검증 수업' } }); assert.equal(create.status(), 200);
  const { code } = await create.json();
  const roomURL = base+'/api/rooms/'+code;
  assert.equal((await studentA.request.post(base+'/api/rooms', { data: { title:'unauthorized' } })).status(),401);
  await studentA.request.post(roomURL, { data:{type:'join'} }); await studentB.request.post(roomURL,{data:{type:'join'}});
  const initial = await (await studentA.request.get(roomURL)).json(); const pollId = initial.polls[0].id;
  assert.equal(initial.polls.some(poll => poll.kind === 'break'), false);
  const guestChat = await studentA.request.post(roomURL,{data:{type:'message',text:'익명 채팅 검증',author:'host',authorName:'강사'}}); assert.equal(guestChat.status(),200);
  const guestMessage = (await guestChat.json()).messages.at(-1); assert.equal(guestMessage.author,'student'); assert.equal(guestMessage.authorName,'수강생 01'); assert.equal(guestMessage.mine,true); assert.equal('authorId' in guestMessage,false);
  assert.equal((await studentA.request.post(roomURL,{data:{type:'pin',id:guestMessage.id}})).status(),401);
  assert.equal((await teacher.request.post(roomURL,{data:{type:'message',text:'unsafe',url:'javascript:alert(1)'}})).status(),400);
  await Promise.all([studentA.request.post(roomURL,{data:{type:'vote',pollId,option:0}}),studentB.request.post(roomURL,{data:{type:'vote',pollId,option:2}})]);
  let value = await (await teacher.request.get(roomURL)).json(); assert.equal(value.polls[0].total,2); assert.deepEqual(value.polls[0].counts,[1,0,1]);
  await studentA.request.post(roomURL,{data:{type:'vote',pollId,option:1}});
  value = await (await teacher.request.get(roomURL)).json(); assert.equal(value.polls[0].total,2); assert.deepEqual(value.polls[0].counts,[0,1,1]); assert.equal(JSON.stringify(value).includes('votes'),false);
  // Simultaneous authenticated anonymous sessions must not lose votes.
  const voters = await Promise.all(Array.from({length:16},()=>browser.newContext()));
  await Promise.all(voters.map(context=>context.request.post(roomURL,{data:{type:'join'}})));
  const results = await Promise.all(voters.map((context,i)=>context.request.post(roomURL,{data:{type:'vote',pollId,option:i%3}})));
  assert(results.every(r=>r.status()===200));
  value = await (await teacher.request.get(roomURL)).json(); assert.equal(value.polls[0].total,18);
  await teacher.request.post(roomURL,{data:{type:'poll-reset',id:pollId}});
  value = await (await teacher.request.get(roomURL)).json(); assert.equal(value.polls.find(p=>p.id===pollId).total,18); assert.equal(value.polls.find(p=>p.id===pollId).archived,true);
  const oldVote = await studentA.request.post(roomURL,{data:{type:'vote',pollId,option:0}}); assert.equal(oldVote.status(),409);
  assert.equal((await teacher.request.post(roomURL,{headers:{origin:'https://other.example'},data:{type:'message',text:'cross-origin'}})).status(),403);
  await page.goto(base+'/host?room='+code); await page.getByRole('heading',{name:'실시간 기능 검증 수업'}).waitFor();
  const student = await studentA.newPage(); student.on('pageerror',e=>errors.push(e.message));
  let roomGets = 0; let liveConnections = 0;
  student.on('request', request => { if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/rooms/'+code) roomGets++; });
  student.on('websocket', socket => { if (socket.url().endsWith('/api/rooms/'+code+'/live')) liveConnections++; });
  await student.goto(base+'/room/'+code); await student.getByRole('heading',{name:'실시간 기능 검증 수업'}).waitFor();
  const second = await studentB.newPage();
  await second.goto(base+'/room/'+code);
  const occupied = page.locator('.classroom-seat.is-occupied');
  await waitUntil(async () => (await occupied.count()) === 2, 'Expected one desk for each connected student');
  assert.equal(await page.locator('.classroom-seats > li').count(), 20);
  assert.equal(await student.locator('.classroom-seat.is-mine').count(), 1);
  await student.getByRole('button',{name:'캐릭터 선택',exact:true}).click();
  const picker = student.getByRole('dialog',{name:'캐릭터 선택',exact:true});
  await picker.waitFor();
  const choices = picker.getByRole('group',{name:'캐릭터',exact:true}).getByRole('button');
  assert.equal(await choices.count(), 20);
  const drawings = await choices.evaluateAll(buttons => buttons.map(button => button.querySelector('svg[viewBox="16 -2 60 48"]').innerHTML));
  assert.equal(new Set(drawings).size, 20, 'Each character needs a distinct illustration');
  await student.screenshot({ path: '.local/screenshots/character-picker-mobile.png' });
  await student.setViewportSize({width:320,height:568});
  assert(await choices.evaluateAll(buttons => buttons.every(button => {
    const rect = button.getBoundingClientRect();
    return rect.width >= 44 && rect.height >= 44;
  })), 'All choices are tappable on a small phone');
  await picker.getByRole('button',{name:'아기우파',exact:true}).click();
  await waitUntil(async () => (await second.locator('.classroom-seat[data-character="axolotl"]').filter({hasText:'수강생 01'}).count()) === 1,
    'The other student must see the selected axolotl on the correct desk');
  await student.setViewportSize({width:390,height:844});
  assert.equal(await page.getByRole('button',{name:'캐릭터 선택',exact:true}).count(), 0);
  await page.getByLabel('채팅 메시지',{exact:true}).fill('강사와 수강생이 함께 나누는 실시간 채팅입니다.'); await page.getByRole('button',{name:'메시지 보내기',exact:true}).click();
  await student.locator('.classroom-board-content').getByText('강사와 수강생이 함께 나누는 실시간 채팅입니다.',{exact:true}).waitFor({timeout:10000});
  await student.getByLabel('채팅 메시지',{exact:true}).fill('한글 조합 중');
  await student.getByLabel('채팅 메시지',{exact:true}).evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,isComposing:true})));
  assert.equal(await student.getByLabel('채팅 메시지',{exact:true}).inputValue(),'한글 조합 중');
  assert.equal((await(await teacher.request.get(roomURL)).json()).messages.some(m=>m.text==='한글 조합 중'),false);
  await student.getByLabel('채팅 메시지',{exact:true}).fill('수강생 질문이 강사에게 보이나요?'); await student.getByLabel('채팅 메시지',{exact:true}).press('Enter');
  const firstBubble = occupied.filter({hasText:'수강생 01'}).locator('.classroom-seat-bubble');
  await firstBubble.getByText('수강생 질문이 강사에게 보이나요?',{exact:true}).waitFor({timeout:10000});
  await second.getByLabel('채팅 메시지',{exact:true}).fill('저도 잘 보여요!');
  await second.getByLabel('채팅 메시지',{exact:true}).press('Enter');
  await occupied.filter({hasText:'수강생 02'}).locator('.classroom-seat-bubble').getByText('저도 잘 보여요!',{exact:true}).waitFor();
  await page.getByRole('button',{name:'링크 첨부',exact:true}).click(); await page.getByLabel('채팅 메시지',{exact:true}).fill('실습 자료'); await page.getByLabel('링크 주소').fill('https://chatgpt.com/'); await page.getByRole('button',{name:'메시지 보내기',exact:true}).click();
  await student.locator('.classroom-board-content').getByText('실습 자료',{exact:true}).waitFor({timeout:10000});
  await page.locator('.chat-message').filter({hasText:'실습 자료'}).locator('.message-menu summary').click();
  await page.getByRole('button',{name:'상단 고정',exact:true}).click();
  const classroomButton = student.getByRole('button',{name:'교실',exact:true});
  const chatButton = student.getByRole('button',{name:'채팅',exact:true});
  await student.getByLabel('채팅 메시지',{exact:true}).fill('작성 중인 질문');
  await chatButton.click();
  assert.equal(await student.getByLabel('채팅 메시지',{exact:true}).inputValue(), '작성 중인 질문');
  await student.locator('.chat-pinned').waitFor({timeout:10000});
  await student.getByRole('button',{name:'참고자료 다운로드'}).click();
  assert((await student.locator('dialog a[href*="/materials/"]').count()) > 0);
  await student.keyboard.press('Escape');
  await classroomButton.click();
  await page.getByRole('button',{name:'새 투표 만들기',exact:true}).click();
  await page.getByLabel('질문',{exact:true}).fill('실습을 따라오고 있나요?');
  await page.getByLabel('응답 항목',{exact:true}).fill('잘 따라가고 있어요\n한 번 더 알려주세요');
  await page.getByRole('button',{name:'투표 시작하기'}).click();
  await student.getByRole('button',{name:/^수업 투표 \d+개 보기$/}).click();
  await student.getByRole('heading',{name:'실습을 따라오고 있나요?'}).waitFor({timeout:10000});
  await student.getByRole('button',{name:'투표 창 닫기'}).click();
  const newPoll = (await (await studentA.request.get(roomURL)).json()).polls.find(p=>p.kind==='mood'&&!p.archived);
  const moods = student.getByRole('group',{name:'오늘의 컨디션',exact:true});
  await moods.getByRole('button',{name:'좋아요 0명',exact:true}).click();
  await waitUntil(async()=>{ const s=await(await teacher.request.get(roomURL)).json();return s.polls.find(p=>p.id===newPoll.id).counts[0]===1; },'Student vote did not arrive');
  const peerMoods = second.getByRole('group',{name:'오늘의 컨디션',exact:true});
  await peerMoods.getByRole('button',{name:'좋아요 1명',exact:true}).waitFor();
  await moods.getByRole('button',{name:'보통이에요 0명',exact:true}).click();
  await peerMoods.getByRole('button',{name:'보통이에요 1명',exact:true}).waitFor();
  assert.equal(await peerMoods.getByRole('button',{name:'좋아요 0명',exact:true}).isVisible(), true);
  assert.equal(await peerMoods.getByRole('button',{name:'조금 힘들어요 0명',exact:true}).isVisible(), true);
  await teacher.request.post(roomURL,{data:{type:'active',active:false}});
  assert.equal((await studentA.request.post(roomURL,{data:{type:'vote',pollId:newPoll.id,option:0}})).status(),409);
  assert.equal((await studentA.request.post(roomURL,{data:{type:'message',text:'종료된 강의에 전송'}})).status(),409);
  await teacher.request.post(roomURL,{data:{type:'active',active:true}});
  await page.getByRole('button',{name:'참여 링크',exact:true}).click(); await page.getByAltText('강의실 '+code+' 참여 QR코드').waitFor();
  assert.equal(await page.locator('dialog').evaluate(el=>el.open),true);
  await page.screenshot({path:'.local/screenshots/share-qr.png',fullPage:true}); await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog').count(),0);
  for (const [width,height] of [[1440,900],[390,844],[320,568]]) {
    await student.setViewportSize({width,height});
    await student.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,left:0,behavior:'instant'})});
    assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true, 'Overflow at '+width);
    assert.equal(await student.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true,'Page scroll at '+width);
    const composer = await student.getByLabel('채팅 메시지',{exact:true}).boundingBox(); assert(composer.y>=0 && composer.y+composer.height<=height,'Composer outside first viewport at '+width);
    const columns = await student.locator('.classroom-seats').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, width === 1440 ? 5 : 4, 'Seat columns at '+width);
    assert.equal(await student.locator('.classroom-seat').count(), 20);
    const lastDesk = await student.locator('.classroom-seat').last().boundingBox();
    if (width < 761) {
      const shell = await student.locator('.chat-composer').boundingBox();
      const picker = await student.getByRole('button',{name:'캐릭터 선택',exact:true}).boundingBox();
      if (picker.y+picker.height > shell.y+1 || lastDesk.y+lastDesk.height > shell.y+1) {
        await student.screenshot({ path: '.local/screenshots/geometry-'+width+'.png' });
        const sizes = await student.locator('.classroom-scene, .classroom-board, .classroom-seats, .classroom-seating-footer, .chat-composer, .classroom-pane').evaluateAll(items =>
          items.map(el => [el.className,el.getBoundingClientRect().y,el.getBoundingClientRect().height,el.hasAttribute('data-expanded')]));
        assert.fail('Normal classroom, last desk and avatar picker must fit above the composer at '+width+': '+JSON.stringify(sizes));
      }
    }
    const heading = await student.getByRole('heading',{name:'AI 강의실',exact:true}).boundingBox();
    const mood = await moods.boundingBox();
    assert(mood && mood.y <= heading.y+heading.height+16, 'Mood choices placed with the heading at '+width);
    for (const choice of await moods.getByRole('button').all()) assert(await choice.isVisible());
    await student.screenshot({path:'.local/screenshots/student-'+width+'.png',fullPage:true});
  }
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,left:0,behavior:'instant'})});
  await page.screenshot({path:'.local/screenshots/teacher-desktop.png',fullPage:true});
  await page.setViewportSize({width:320,height:1000}); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'Teacher overflow at 320');
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  await page.screenshot({path:'.local/screenshots/teacher-mobile.png',fullPage:true});
  await page.goto(base); await page.getByRole('heading',{name:'AI 강의실',exact:true}).waitFor(); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'Home overflow at 320'); assert.equal(await page.getByLabel('채팅 메시지',{exact:true}).isEnabled(),true); await page.screenshot({path:'.local/screenshots/home-mobile.png',fullPage:true});
  await page.goto(base+'/join'); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'Optional join overflow at 320');
  await student.getByLabel('강의실 설정',{exact:true}).click();
  await student.getByRole('button',{name:'이전 투표 결과 보기',exact:true}).click();
  assert.equal(await student.locator('.compact-poll').count(),1); assert.match(await student.locator('.compact-poll-total').innerText(),/18명/);
  await student.getByRole('button',{name:'투표 창 닫기'}).click();
  // Measure the rendered text and links, including a maximum-length post on a phone.
  const board = student.locator('.classroom-board');
  const content = board.locator('.classroom-board-content');
  const shortNote = '잠깐 같이 볼까요?';
  const mediumNote = '강의자료에서 대기환경 실습 파일을 열고 측정값을 입력해 보세요. '.repeat(5).trim();
  const longNote = ('측정값을 적어주세요. 🌱 ' + 'PM25'.repeat(17) + '\n').repeat(35).slice(0, 1997) + ' 끝!';
  async function postNote(note) {
    const result = await teacher.request.post(roomURL, { data: { type: 'message', text: note } });
    assert.equal(result.status(), 200);
    await waitUntil(async () => (await content.locator('p').textContent()) === note, 'Teacher post did not appear on the board');
  }
  async function boardMetrics() {
    return board.evaluate(el => {
      const body = el.querySelector('.classroom-board-content');
      const p = body.querySelector('p');
      const frame = el.getBoundingClientRect();
      const textAndLinks = Array.from(body.querySelectorAll('p,a')).map(item => item.getBoundingClientRect());
      return { size: parseFloat(getComputedStyle(p).fontSize), height: frame.height,
        fits: body.scrollHeight <= body.clientHeight+1 && body.scrollWidth <= body.clientWidth+1 &&
          textAndLinks.every(box => box.top >= frame.top && box.bottom <= frame.bottom && box.left >= frame.left && box.right <= frame.right) };
    });
  }
  await postNote(shortNote);
  const compact = await boardMetrics();
  await postNote(mediumNote);
  await waitUntil(async () => { const m = await boardMetrics(); return m.fits && m.size < compact.size; }, 'Medium post must shrink and fit the mobile board');
  const file = Buffer.from('local QA');
  const uploaded = await teacher.request.post(roomURL+'/files', { data: file, headers: {
    'content-type': 'application/octet-stream', 'x-upload-id': crypto.randomUUID(), 'x-class-date': value.date,
    'x-file-name': encodeURIComponent('강의 안내.txt'), 'x-file-caption': encodeURIComponent(longNote), 'x-file-url': 'https://example.org/'
  } });
  assert.equal(uploaded.status(), 200);
  await content.getByRole('link', { name: '강의 안내.txt' }).waitFor();
  assert.equal(await content.locator('p').textContent(), longNote);
  for (const width of [320,390,1440]) {
    await student.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    await waitUntil(async () => (await boardMetrics()).fits, 'Clipped long chalkboard post at '+width);
    const seatsBelowBoard = await student.locator('.classroom-seats').boundingBox();
    const boardBounds = await board.boundingBox();
    assert(seatsBelowBoard.height > 100 && seatsBelowBoard.y >= boardBounds.y + boardBounds.height - 1,
      'Expanded board must preserve all desk rows below the message at '+width);
  }
  await student.setViewportSize({ width: 320, height: 568 });
  await postNote(shortNote);
  await waitUntil(async () => { const m = await boardMetrics(); return m.fits && Math.abs(m.height-compact.height)<2 && Math.abs(m.size-compact.size)<1; }, 'Short posts restore original board size');
  await student.getByRole('button', {name:'닉네임 설정', exact:true}).click();
  const nicknameDialog = student.getByRole('dialog', {name:'닉네임 설정', exact:true});
  await nicknameDialog.getByLabel('수업에서 사용할 이름').fill('몽실구름');
  await nicknameDialog.getByRole('button', {name:'저장하기', exact:true}).click();
  await waitUntil(async () => (await second.locator('.classroom-seat[title="몽실구름"]').count()) === 1, 'Nickname must reach another student');
  const arrival = student.locator('.classroom-seat.is-mine .classroom-arrival');
  await student.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await arrival.evaluate(el => getComputedStyle(el).animationName), 'none');
  await student.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await arrival.evaluate(el => getComputedStyle(el).animationName), 'classroom-arrive');
  await student.reload();
  await student.locator('.classroom-seat.is-mine[title="몽실구름"]').waitFor();
  assert.deepEqual(errors,[]);
  assert.equal(roomGets,0,'The room must use WebSocket push instead of HTTP polling'); assert(liveConnections>=1,'No live WebSocket was opened');
  writeFileSync('.local/browser-verification.json', JSON.stringify({ passed: true, code,
    checks: ['instructor login', '20 visible desks', 'two students with distinct seat bubbles', 'teacher chalkboard',
      'student avatar visible to peers', 'visible live mood counts and vote replacement',
      'adaptive chalk size', '2000-character chalkboard with line breaks, link and file at 320/390/1440',
      'mobile tab draft', 'reference PDFs', 'polls and archive', 'Korean IME', 'moderation and QR',
      'WebSocket delivery', '1440/390/320 layouts', 'browser errors']
  }, null, 2));
  console.log('PASS: 20-seat classroom, two students, teacher chalkboard, mobile tabs, materials, voting, moderation and 1440/390/320 layouts.');
  await browser.close();
})().catch(e=>{ console.error(e);process.exit(1); });

