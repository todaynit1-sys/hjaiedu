const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { mkdirSync, writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3010';
async function waitUntil(fn, message) { for (let i=0;i<40;i++) { if(await fn()) return; await new Promise(r=>setTimeout(r,200)); } throw new Error(message); }
async function readyStage(page) {
  await page.locator('canvas.auditorium-world[data-ready="true"]').waitFor();
  await page.locator('.auditorium-scene[data-world="ready"]').waitFor();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
(async () => {
  mkdirSync('.local/screenshots', { recursive: true });
  const browser = await chromium.launch({ headless: true, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'], ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const teacher = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const studentA = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const studentB = await browser.newContext();
  const errors = [];
  const page = await teacher.newPage(); page.on('pageerror',e=>errors.push(e.message));
  const mainJoins = await Promise.all([studentA.request.post(base+'/api/rooms/MAMOAI',{data:{type:'join'}}),studentB.request.post(base+'/api/rooms/MAMOAI',{data:{type:'join'}})]);
  assert(mainJoins.every(response=>response.status()===200),'Main room initialization failed');
  assert((await Promise.all(mainJoins.map(response=>response.json()))).every(room=>room.code==='MAMOAI'));
  await page.goto(base); await readyStage(page);
  assert.equal(await page.getByLabel('채팅 메시지',{exact:true}).isVisible(),false);
  assert.equal(await page.getByLabel('강의실 참여 코드',{exact:true}).count(),0);
  await page.screenshot({ path: '.local/screenshots/home-desktop.png', fullPage: true });
  await page.keyboard.press('Tab'); assert.equal(await page.locator('.skip-link').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Tab');
  await page.getByRole('button',{name:'채팅',exact:true}).click();
  await page.getByRole('heading',{name:'실시간 채팅',exact:true}).waitFor();
  assert.equal(await page.getByLabel('채팅 메시지',{exact:true}).isEnabled(),true);
  for (let tap = 0; tap < 5; tap++) await page.getByRole('button',{name:'AI환경연구소 로고',exact:true}).click();
  await page.getByLabel('강사 접속 코드').fill(process.env.TEST_HOST_PASSWORD || '0423');
  await page.getByRole('button', { name: '강사로 들어가기' }).click();
  await page.waitForURL(/host\?room=MAMOAI/);
  await readyStage(page);
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
  await readyStage(student);
  await readyStage(page);
  await readyStage(second);
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
  await page.getByRole('button',{name:'채팅',exact:true}).click();
  await page.getByLabel('채팅 메시지',{exact:true}).fill('강사와 수강생이 함께 나누는 실시간 채팅입니다.'); await page.getByRole('button',{name:'메시지 보내기',exact:true}).click();
  await page.getByRole('button',{name:'강당',exact:true}).click();
  await readyStage(page);
  await student.locator('.classroom-board-content').getByText('강사와 수강생이 함께 나누는 실시간 채팅입니다.',{exact:true}).waitFor({timeout:10000});
  await waitUntil(async()=>await student.getByRole('button',{name:'채팅',exact:true}).getAttribute('aria-describedby')==='new-chat-hint',
    'The auditorium view must notify students of incoming chat');
  await student.getByLabel('채팅 메시지',{exact:true}).fill('한글 조합 중');
  await student.getByLabel('채팅 메시지',{exact:true}).evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,isComposing:true})));
  assert.equal(await student.getByLabel('채팅 메시지',{exact:true}).inputValue(),'한글 조합 중');
  assert.equal((await(await teacher.request.get(roomURL)).json()).messages.some(m=>m.text==='한글 조합 중'),false);
  await student.getByLabel('채팅 메시지',{exact:true}).fill('수강생 질문이 강사에게 보이나요?'); await student.getByLabel('채팅 메시지',{exact:true}).press('Enter');
  const firstBubble = occupied.filter({hasText:'수강생 01'}).locator('.classroom-seat-bubble');
  await firstBubble.getByText('수강생 질문이 강사에게 보이나요?',{exact:true}).waitFor({timeout:10000});
  await second.getByRole('button',{name:'채팅',exact:true}).click();
  await second.getByLabel('채팅 메시지',{exact:true}).fill('저도 잘 보여요!');
  await second.getByLabel('채팅 메시지',{exact:true}).press('Enter');
  await second.getByRole('button',{name:'강당',exact:true}).click();
  await readyStage(second);
  await occupied.filter({hasText:'수강생 02'}).locator('.classroom-seat-bubble').getByText('저도 잘 보여요!',{exact:true}).waitFor();
  await page.getByRole('button',{name:'채팅',exact:true}).click();
  await page.getByRole('button',{name:'링크 첨부',exact:true}).click(); await page.getByLabel('채팅 메시지',{exact:true}).fill('실습 자료'); await page.getByLabel('링크 주소').fill('https://chatgpt.com/'); await page.getByRole('button',{name:'메시지 보내기',exact:true}).click();
  await student.locator('.classroom-board-content').getByText('실습 자료',{exact:true}).waitFor({timeout:10000});
  await page.locator('.chat-message').filter({hasText:'실습 자료'}).locator('.message-menu summary').click();
  await page.getByRole('button',{name:'상단 고정',exact:true}).click();
  await page.getByRole('button',{name:'강당',exact:true}).click();
  const classroomButton = student.getByRole('button',{name:'강당',exact:true});
  const chatButton = student.getByRole('button',{name:'채팅',exact:true});
  await student.getByLabel('채팅 메시지',{exact:true}).fill('작성 중인 질문');
  await chatButton.click();
  assert.equal(await student.getByLabel('채팅 메시지',{exact:true}).inputValue(), '작성 중인 질문');
  await waitUntil(async()=>await chatButton.getAttribute('aria-describedby')===null,'Opening chat clears its unread indicator');
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
  for (const [width,height] of [[1440,900],[810,535],[390,844],[320,568]]) {
    await student.setViewportSize({width,height});
    await readyStage(student);
    await student.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,left:0,behavior:'instant'})});
    assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true, 'Overflow at '+width);
    assert.equal(await student.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true,'Page scroll at '+width);
    if (width >= 761) {
      assert.equal(await student.getByLabel('채팅 메시지',{exact:true}).isVisible(),false,'Desktop auditorium reserves its full view for the stage');
      await chatButton.click();
      const composer = await student.getByLabel('채팅 메시지',{exact:true}).boundingBox();
      assert(composer.y>=0 && composer.y+composer.height<=height,'Chat composer outside first viewport at '+width);
      const desktopDraft = await student.getByLabel('채팅 메시지',{exact:true}).inputValue();
      await student.screenshot({path:'.local/screenshots/chat-'+width+'.png',fullPage:true});
      await classroomButton.click();
      await readyStage(student);
      await chatButton.click();
      assert.equal(await student.getByLabel('채팅 메시지',{exact:true}).inputValue(),desktopDraft,'Desktop view changes preserve the chat draft');
      await classroomButton.click();
      await readyStage(student);
    } else {
      const composer = await student.getByLabel('채팅 메시지',{exact:true}).boundingBox();
      assert(composer.y>=0 && composer.y+composer.height<=height,'Mobile composer outside first viewport at '+width);
    }
    const points = await student.locator('.classroom-seat').evaluateAll(items=>items.map(el=>({x:parseFloat(el.style.left), y:parseFloat(el.style.top)})));
    assert.equal(new Set(points.map(point=>point.x+'/'+point.y)).size,20,'Unique auditorium positions at '+width);
    assert(points.every(point=>point.x>0 && point.x<100 && point.y>0 && point.y<100),'All seats inside auditorium at '+width);
    assert(points[0].y<points[1].y && points[3].y<points[2].y,'Projected first row curves around stage at '+width);
    assert.equal(await student.locator('.classroom-seat').count(), 20);
    const deskBottom = await student.locator('.classroom-seat').evaluateAll(items=>Math.max(...items.map(el=>el.getBoundingClientRect().bottom)));
    const footer = await student.locator('.classroom-seating-footer').boundingBox();
    assert(deskBottom <= footer.y + 1, 'Desk rows overlap the controls at '+width);
    if (width < 761) {
      await student.getByRole('button',{name:'캐릭터 선택',exact:true}).scrollIntoViewIfNeeded();
      const shell = await student.locator('.chat-composer').boundingBox();
      const picker = await student.getByRole('button',{name:'캐릭터 선택',exact:true}).boundingBox();
      assert(picker.y+picker.height <= shell.y+1,'Avatar control must scroll into view above composer at '+width);
      await student.locator('.classroom-pane').evaluate(el=>{el.scrollTop=0;});
    }
    const heading = await student.getByRole('heading',{name:'AI 강의실',exact:true}).boundingBox();
    const mood = await moods.boundingBox();
    assert(mood && mood.y <= heading.y+heading.height+16, 'Mood choices placed with the heading at '+width);
    for (const choice of await moods.getByRole('button').all()) assert(await choice.isVisible());
    await student.screenshot({path:'.local/screenshots/student-'+width+'.png',fullPage:true});
  }
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,left:0,behavior:'instant'})});
  await page.getByRole('button',{name:'강당',exact:true}).click();
  await readyStage(page);
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
      return { size: parseFloat(getComputedStyle(p).fontSize), height: frame.height, expanded: el.hasAttribute('data-expanded'),
        fits: body.scrollHeight <= body.clientHeight+1 && body.scrollWidth <= body.clientWidth+1 &&
          textAndLinks.every(box => box.top >= frame.top && box.bottom <= frame.bottom && box.left >= frame.left && box.right <= frame.right) };
    });
  }
  await postNote(shortNote);
  const compact = await boardMetrics();
  await postNote(mediumNote);
  await waitUntil(async () => {
    const m = await boardMetrics();
    const expanded = await board.getAttribute('data-expanded') !== null;
    return m.fits && (m.size <= compact.size || expanded);
  }, 'Medium post must fit the screen or expand into a readable board');
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
  await waitUntil(async () => {
    const m = await boardMetrics();
    return m.fits && Math.abs(m.height-compact.height)<2 && m.size>=compact.size-1 && m.expanded===compact.expanded;
  }, 'Short posts restore compact board height and readable text').catch(async error=>{
    await student.screenshot({path:'.local/screenshots/chalkboard-restore-error.png'});
    error.message+=' '+JSON.stringify({compact,current:await boardMetrics(),stage:await board.evaluate(el=>({expanded:el.hasAttribute('data-expanded'),parent:el.parentElement.className,style:el.parentElement.getAttribute('style')}))});
    throw error;
  });
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
  await student.getByRole('button',{name:'내 캐릭터 일어나기',exact:true}).tap();
  const floor = student.getByRole('group',{name:'캐릭터 이동 영역',exact:true});
  const bounds = await floor.boundingBox();
  const destination = {x:Math.round(bounds.width*.84),y:Math.round(bounds.height*.72)};
  await floor.tap({position:destination});
  assert(await student.locator('.classroom-walker.is-mine').evaluate(el =>
    el.getAnimations().some(animation => animation.effect.getKeyframes().length === 3)),
    'A long crossing must animate through the central aisle');
  const walker = second.locator('.classroom-walker[title="몽실구름"]');
  await walker.waitFor();
  await waitUntil(async () => Math.abs(parseFloat(await walker.evaluate(el=>el.style.left)) - destination.x / bounds.width * 100) < 1,
    'Touch/click movement must reach the other student');
  await floor.focus();
  await student.keyboard.press('ArrowRight');
  const moved = await student.locator('.classroom-walker.is-mine').evaluate(el=>el.style.left);
  await waitUntil(async () => (await walker.evaluate(el=>el.style.left)) === moved, 'Arrow-key movement must be broadcast');
  await student.reload();
  await student.locator('.classroom-walker.is-mine').waitFor();
  await student.getByRole('button',{name:'내 자리로',exact:true}).click();
  await waitUntil(async () => await walker.count() === 0, 'Returning to seat must remove roaming character for everyone');
  await student.locator('.classroom-seat.is-mine .classroom-head').waitFor();
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/host?room='+code);
  await page.getByRole('heading',{name:'실시간 기능 검증 수업'}).waitFor();
  await student.getByRole('button',{name:'활동',exact:true}).click();
  const activities = student.getByRole('dialog',{name:'교실 활동',exact:true});
  await activities.getByRole('button',{name:'질문 있어요',exact:true}).click();
  await waitUntil(async()=>await page.locator('.raised-hand').count() === 1,'Raised hand must reach instructor');
  await activities.getByRole('button',{name:'박수',exact:true}).click();
  await second.locator('.classroom-seat[title="몽실구름"] [data-kind="clap"]').waitFor();
  await activities.getByRole('button',{name:'단체사진 미리보기',exact:true}).click();
  const photoDownload = student.waitForEvent('download');
  await activities.getByRole('button',{name:'단체사진 PNG 저장',exact:true}).click();
  const photo = await photoDownload;
  assert.match(photo.suggestedFilename(),/^AI강의실-단체사진-.*\.png$/);
  assert.equal(await photo.failure(),null);
  const photoBytes = require('node:fs').readFileSync(await photo.path());
  assert.equal(photoBytes.subarray(1,4).toString(),'PNG');
  require('node:fs').copyFileSync(await photo.path(),'.local/screenshots/classroom-group-photo.png');
  await activities.getByRole('button',{name:'교실 활동 닫기',exact:true}).click();
  const greetingRequest = target => target.waitForResponse(response => response.request().method()==='POST' && response.url().endsWith('/api/rooms/'+code) && response.request().postDataJSON()?.type==='greet');
  await second.getByRole('button',{name:'내 주변',exact:true}).click();
  await student.getByRole('button',{name:'내 주변',exact:true}).click();
  const firstGreeting = greetingRequest(second);
  await second.getByRole('button',{name:'몽실구름에게 인사하기',exact:true}).click();
  const firstResponse = await firstGreeting;
  assert.equal(firstResponse.status(),200);
  const firstGreetingBody = await firstResponse.json();
  const replyGreeting = greetingRequest(student);
  await student.getByRole('button',{name:'수강생 02에게 인사하기',exact:true}).click();
  const replyResponse = await replyGreeting;
  assert.equal(replyResponse.status(),200);
  const replyGreetingBody = await replyResponse.json();
  assert.equal(replyGreetingBody.seats.find(seat=>seat.name==='몽실구름').activity.reaction.kind,'heart',JSON.stringify({first:firstGreetingBody.seats,last:replyGreetingBody.seats,firstAt:firstGreetingBody.updatedAt,lastAt:replyGreetingBody.updatedAt}));
  await second.locator('.classroom-seat[title="몽실구름"] [data-kind="heart"]').waitFor();
  await page.getByRole('button',{name:/^활동/}).click();
  const hostActivities = page.getByRole('dialog',{name:'교실 활동',exact:true});
  await hostActivities.getByRole('button',{name:'응답 완료',exact:true}).click();
  await waitUntil(async()=>await second.locator('.raised-hand').count() === 0,'Instructor can acknowledge raised hand');
  await hostActivities.getByLabel('문제',{exact:true}).fill('AI는 실무에 활용할 수 있다.');
  await hostActivities.getByRole('button',{name:'OX 퀴즈 시작',exact:true}).click();
  await hostActivities.getByRole('button',{name:'교실 활동 닫기',exact:true}).click();
  await student.getByRole('button',{name:'O 선택',exact:true}).click();
  await second.locator('.classroom-walker[title="몽실구름"]').waitFor();
  await waitUntil(async()=>parseFloat(await second.locator('.classroom-walker[title="몽실구름"]').evaluate(el=>el.style.left))<50,'Quiz answer moves character to O zone');
  await student.getByRole('button',{name:'전체 보기',exact:true}).click();
  const quizDeskBottom = await student.locator('.classroom-seat').evaluateAll(items=>Math.max(...items.map(el=>el.getBoundingClientRect().bottom)));
  const quizFooter = await student.locator('.classroom-seating-footer').boundingBox();
  assert(quizDeskBottom <= quizFooter.y+1,'Quiz desks must not overlap activity controls');
  await student.screenshot({path:'.local/screenshots/classroom-quiz-mobile.png'});
  await page.getByRole('button',{name:'정답 공개',exact:true}).click();
  await student.getByText('정답은 O · 참여 1명',{exact:true}).waitFor();
  await page.getByRole('button',{name:'퀴즈 닫기',exact:true}).click();
  await student.getByRole('button',{name:'내 자리로',exact:true}).click();
  await verifyAuditoriumCapacity(browser, teacher, base, waitUntil);
  assert.deepEqual(errors,[]);
  assert.equal(roomGets,0,'The room must use WebSocket push instead of HTTP polling'); assert(liveConnections>=1,'No live WebSocket was opened');
  writeFileSync('.local/browser-verification.json', JSON.stringify({ passed: true, code,
    checks: ['instructor login', '20 visible desks', 'two students with distinct seat bubbles', 'teacher chalkboard',
      'student avatar visible to peers', 'visible live mood counts and vote replacement',
      'adaptive chalk size', '2000-character chalkboard with line breaks, link and file at 320/390/1440',
      'full-width auditorium and separate desktop chat', 'desktop and mobile tab draft', 'chat unread indicator', 'reference PDFs', 'polls and archive', 'Korean IME', 'moderation and QR',
      'WebSocket delivery', '1440/810/390/320 layouts', 'raised hands and acknowledgments', 'reactions and reciprocal greetings',
      'OX quiz, answer regions and correct-answer reveal', 'group-photo PNG download',
      '20 to 50 live WebGL seats', 'WebGL context loss, fallback and rendered restoration', 'browser errors']
  }, null, 2));
  console.log('PASS: full-width WebGL auditorium, separate desktop and mobile chat, preserved drafts, teacher chalkboard, materials, voting and moderation.');
  await browser.close();
})().catch(e=>{ console.error(e);process.exit(1); });

async function verifyAuditoriumCapacity(browser, teacher, base, waitUntil) {
  const WebSocket = require('ws');
  const contexts = [];
  const sockets = [];
  const pages = [];
  const pageErrors = [];
  const created = await teacher.request.post(base+'/api/rooms', {data:{title:'강당 50명 확인'}});
  assert.equal(created.status(),200);
  const {code} = await created.json();
  const roomPath = '/api/rooms/'+code;
  const liveURL = base.replace(/^http/,'ws')+roomPath+'/live';

  async function joinStudent() {
    const context = await browser.newContext({viewport:{width:1440,height:900},isMobile:true,hasTouch:true});
    contexts.push(context);
    const joined = await context.request.post(base+roomPath,{data:{type:'join'}});
    assert.equal(joined.status(),200);
    const cookies = await context.cookies(base);
    const socket = new WebSocket(liveURL, {headers:{
      Cookie:cookies.map(cookie=>cookie.name+'='+cookie.value).join('; '),
      Origin:base
    }});
    sockets.push(socket);
    socket.on('message',()=>{});
    socket.on('error',()=>{});
    await new Promise((resolve,reject)=>{
      const timer = setTimeout(()=>reject(new Error('Student WebSocket did not open')),10000);
      socket.once('open',()=>{clearTimeout(timer);resolve();});
      socket.once('error',error=>{clearTimeout(timer);reject(error);});
    });
    return context;
  }

  try {
    const instructor = await teacher.newPage();
    pages.push(instructor);
    instructor.on('pageerror',error=>pageErrors.push(error.message));
    await instructor.setViewportSize({width:1440,height:900});
    for (let index=0;index<20;index++) await joinStudent();
    await instructor.goto(base+'/host?room='+code);
    await instructor.getByRole('heading',{name:'강당 50명 확인',exact:true}).waitFor();
    await readyStage(instructor);
    assert.equal(await instructor.locator('.classroom-seat').count(),20);
    for (let index=20;index<50;index++) {
      await joinStudent();
      if ([20,30,40].includes(index)) {
        const expandedCapacity = Math.ceil((index+1)/10)*10;
        await waitUntil(async()=>await instructor.locator('.classroom-seat').count()===expandedCapacity,
          'Live auditorium capacity did not expand to '+expandedCapacity);
        await readyStage(instructor);
      }
    }
    await waitUntil(async()=>await instructor.locator('.classroom-seat.is-occupied').count()===50,
      'The auditorium must render all fifty real connected students');
    await readyStage(instructor);
    assert.equal(await instructor.locator('.classroom-seat').count(),50);
    await instructor.getByText('반원 강당 · 50석',{exact:true}).waitFor();
    const positions = await instructor.locator('.classroom-seat').evaluateAll(seats=>seats.map(seat=>({
      x:parseFloat(seat.style.left),y:parseFloat(seat.style.top)
    })));
    assert.equal(new Set(positions.map(point=>point.x+','+point.y)).size,50);
    assert(positions.every(point=>point.x>0&&point.x<100&&point.y>0&&point.y<100),
      'Every auditorium seat must be within the interactive floor');
    const lowestSeat = await instructor.locator('.classroom-seat').evaluateAll(seats=>Math.max(...seats.map(seat=>seat.getBoundingClientRect().bottom)));
    const footer = await instructor.locator('.classroom-seating-footer').boundingBox();
    assert(lowestSeat<=footer.y+1,'Fifty-seat auditorium overlaps the activity controls');

    const student = await contexts[49].newPage();
    pages.push(student);
    student.on('pageerror',error=>pageErrors.push(error.message));
    await student.goto(base+'/room/'+code);
    await student.locator('.classroom-seat.is-mine').waitFor();
    await readyStage(student);
    await student.getByRole('button',{name:'닉네임 설정',exact:true}).click();
    const nickname = student.getByRole('dialog',{name:'닉네임 설정',exact:true});
    await nickname.getByLabel('수업에서 사용할 이름').fill('강당 오십번');
    await nickname.getByRole('button',{name:'저장하기',exact:true}).click();
    const fiftieth = instructor.locator('.classroom-seat[title="강당 오십번"]');
    await fiftieth.waitFor();
    assert.match(await fiftieth.innerText(),/^50번/);
    await student.getByRole('button',{name:'활동',exact:true}).click();
    const activities = student.getByRole('dialog',{name:'교실 활동',exact:true});
    await activities.getByRole('button',{name:'박수',exact:true}).click();
    await fiftieth.locator('[data-kind="clap"]').waitFor();
    await instructor.screenshot({path:'.local/screenshots/auditorium-50-desktop.png',fullPage:true});
    await activities.getByRole('button',{name:'교실 활동 닫기',exact:true}).click();

    await student.setViewportSize({width:320,height:568});
    assert.equal(await student.locator('.classroom-greet-hit').count(),0,
      'Overview must not expose overlapping tiny avatar hit targets');
    await student.getByRole('button',{name:'내 주변',exact:true}).click();
    await readyStage(student);
    const floor = student.getByRole('group',{name:'캐릭터 이동 영역',exact:true});
    const visibleFloor = student.getByRole('region',{name:'강당 객석',exact:true});
    const ownTarget = student.locator('.classroom-seat.is-mine .classroom-desk-hit');
    const targetRect = await ownTarget.boundingBox();
    assert(targetRect.width>=44&&targetRect.height>=44,
      'Nearby view must provide a touch-sized own-avatar control');
    const floorRect = await floor.boundingBox();
    assert(floorRect.width>=760,'Nearby view must enlarge the real interaction canvas');
    const desk = await student.locator('.classroom-seat.is-mine .classroom-desk').boundingBox();
    const expectedArrowX = Math.max(.06,Math.min(.94,(desk.x+desk.width/2-floorRect.x)/floorRect.width-.04));
    await floor.evaluate(element=>element.focus({preventScroll:true}));
    await student.keyboard.press('ArrowLeft');
    const walker = instructor.locator('.classroom-walker[title="강당 오십번"]');
    await walker.waitFor();
    await waitUntil(async()=>Math.abs(parseFloat(await walker.evaluate(element=>element.style.left))/100-expectedArrowX)<.0002,
      'Arrow movement in a scrolled nearby view must retain normalized screen coordinates');

    const touchPoint = await visibleFloor.evaluate(element=>{
      const bounds = element.getBoundingClientRect();
      for (const yRatio of [.2,.4,.6,.8]) for (const xRatio of [.2,.4,.6,.8]) {
        const x=bounds.x+bounds.width*xRatio,y=bounds.y+bounds.height*yRatio;
        const hit=document.elementFromPoint(x,y);
        if (hit?.closest('.classroom-floor')&&!hit.closest('button,.world-screen')) return {x,y};
      }
      return null;
    });
    assert(touchPoint,'Nearby view needs a reachable floor area for touch movement');
    const touchFloorRect = await floor.boundingBox();
    const expectedTouchX = Math.max(.06,Math.min(.94,(touchPoint.x-touchFloorRect.x)/touchFloorRect.width));
    const expectedTouchY = Math.max(.08,Math.min(.92,(touchPoint.y-touchFloorRect.y)/touchFloorRect.height));
    await student.touchscreen.tap(touchPoint.x,touchPoint.y);
    await waitUntil(async()=>{
      const actual=await walker.evaluate(element=>({x:parseFloat(element.style.left)/100,y:parseFloat(element.style.top)/100}));
      // Touch-generated clicks may round the viewport point to a CSS pixel.
      return Math.abs(actual.x-expectedTouchX)<=1/touchFloorRect.width
        &&Math.abs(actual.y-expectedTouchY)<=1/touchFloorRect.height;
    },'Touch movement must map the scrolled nearby canvas to the same location for other participants').catch(async error=>{
      const actual=await walker.evaluate(element=>({x:parseFloat(element.style.left)/100,y:parseFloat(element.style.top)/100}));
      error.message+=' '+JSON.stringify({actual,expected:{x:expectedTouchX,y:expectedTouchY},
        deltaPixels:{x:(actual.x-expectedTouchX)*touchFloorRect.width,y:(actual.y-expectedTouchY)*touchFloorRect.height},touchPoint});
      throw error;
    });
    await student.screenshot({path:'.local/screenshots/auditorium-50-mobile.png'});
    await student.getByRole('button',{name:'내 자리로',exact:true}).click();
    await waitUntil(async()=>await walker.count()===0,'The fiftieth student must be able to return to their original seat');

    const canvas = instructor.locator('canvas.auditorium-world');
    const lossControl = await canvas.evaluateHandle(element=>element.getContext('webgl2')?.getExtension('WEBGL_lose_context'));
    assert(await lossControl.evaluate(extension=>Boolean(extension)),'The WebGL fixture needs the genuine context-loss extension');
    const widthBeforeLoss = (await canvas.boundingBox()).width;
    await lossControl.evaluate(extension=>extension.loseContext());
    await instructor.locator('.auditorium-scene[data-world="fallback"] .auditorium-art').waitFor();
    await instructor.setViewportSize({width:1280,height:810});
    await instructor.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.notEqual((await canvas.boundingBox()).width,widthBeforeLoss,'The lost canvas must be resized during this check');
    assert.equal(await canvas.getAttribute('data-ready'),'false','Resize during context loss must keep the fallback visible');
    assert.equal(await instructor.locator('.classroom-seat.is-occupied').count(),50,'Context loss must retain the live participants');
    await lossControl.evaluate(extension=>extension.restoreContext());
    await readyStage(instructor);
    assert.equal(await canvas.evaluate(element=>element.getContext('webgl2').isContextLost()),false);
    const frame = require('pngjs').PNG.sync.read(await canvas.screenshot({
      style:'.world-screen,.classroom-seats,.classroom-walker{visibility:hidden!important}'
    }));
    const sceneColors = new Set();
    for (let y=8;y<frame.height;y+=16) for (let x=8;x<frame.width;x+=16) {
      const pixel = (y*frame.width+x)*4;
      sceneColors.add(`${frame.data[pixel]},${frame.data[pixel+1]},${frame.data[pixel+2]}`);
    }
    assert(sceneColors.size>12,'Restored WebGL canvas must draw the auditorium rather than a blank frame');
    await lossControl.dispose();

    sockets[0].close(1000);
    await waitUntil(async()=>sockets[0].readyState===WebSocket.CLOSED,'First student did not disconnect');
    await contexts[0].close();
    const laterContext = await joinStudent();
    const laterStudent = await laterContext.newPage();
    pages.push(laterStudent);
    laterStudent.on('pageerror',error=>pageErrors.push(error.message));
    await laterStudent.goto(base+'/room/'+code);
    await readyStage(laterStudent);
    await waitUntil(async()=>await laterStudent.locator('.classroom-own-seat b').innerText()==='51',
      'A later daily student must keep seat fifty-one instead of being renumbered');
    await laterStudent.getByText('반원 강당 · 20석',{exact:true}).waitFor();
    assert.equal(await laterStudent.locator('.classroom-seat').count(),20);
    assert.equal(await laterStudent.getByRole('button',{name:'앞 좌석 보기',exact:true}).isEnabled(),true);
    assert.deepEqual(pageErrors,[],'Live capacity transitions must not throw browser errors');
    console.log('PASS: fifty real students, live auditorium expansion, peer reactions, mobile movement, rendered WebGL recovery and seat overflow.');
  } finally {
    await Promise.allSettled(pages.map(page=>page.close()));
    await Promise.allSettled(sockets.map(socket=>new Promise(resolve=>{
      if (socket.readyState===WebSocket.CLOSED) {resolve();return;}
      const timer=setTimeout(()=>{socket.terminate();resolve();},1500);
      socket.once('close',()=>{clearTimeout(timer);resolve();});
      if (socket.readyState===WebSocket.OPEN) socket.close(1000);
      else if (socket.readyState===WebSocket.CONNECTING) socket.terminate();
    })));
    await Promise.allSettled(contexts.map(context=>context.close()));
  }
}

