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
  assert.equal(await page.getByLabel('채팅 메시지',{exact:true}).isVisible(),true);
  assert.equal(await page.getByRole('group',{name:'오늘의 컨디션',exact:true}).count(),0);
  assert.equal(await page.locator('.auditorium-topbar').count(),0);
  await page.locator('.classroom-view-tools').getByRole('group',{name:'교실 보기',exact:true}).waitFor();
  assert.equal(await page.getByLabel('강의실 참여 코드',{exact:true}).count(),0);
  await page.screenshot({ path: '.local/screenshots/home-desktop.png', fullPage: true });
  await page.keyboard.press('Tab'); assert.equal(await page.locator('.skip-link').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Tab');
  await page.getByRole('button',{name:'채팅',exact:true}).click();
  await page.getByRole('heading',{name:'실시간 채팅',exact:true}).waitFor();
  await waitUntil(async()=>await page.getByLabel('채팅 메시지',{exact:true}).isEnabled(),'The home chat composer must enable after the live connection opens');
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
  await student.setViewportSize({width:320,height:568});
  const customize = student.getByRole('button',{name:'캐릭터 꾸미기',exact:true});
  await customize.click();
  const editor = student.getByRole('dialog',{name:'내 캐릭터 꾸미기',exact:true});
  const categories = editor.getByRole('group',{name:'꾸미기 종류',exact:true});
  const preview = editor.locator('.avatar-preview-art canvas[data-ready="true"]');
  await preview.waitFor();
  const defaultPreview = await preview.screenshot();
  const avatarChoices = [
    ['머리', ['단발','분홍']], ['얼굴', ['꿀빛','꾸벅꾸벅']],
    ['옷', ['니트','하늘색']], ['소품', ['고양이 귀']],
  ];
  for (const [category, choices] of avatarChoices) {
    await categories.getByRole('button',{name:category,exact:true}).click();
    assert(await editor.locator('.avatar-category, .avatar-options-grid button').evaluateAll(buttons => buttons.every(button => {
      const rect = button.getBoundingClientRect();
      return rect.width >= 44 && rect.height >= 44;
    })), 'All avatar choices are tappable at 320px in '+category);
    for (const choice of choices) {
      const option = editor.getByRole('button',{name:choice,exact:true});
      await option.click();
      assert.equal(await option.getAttribute('aria-pressed'),'true');
    }
    assert(await preview.evaluate(canvas => {
      const art = canvas.getBoundingClientRect();
      const workspace = canvas.closest('.avatar-editor-workspace').getBoundingClientRect();
      return art.top >= workspace.top-1 && art.bottom <= workspace.bottom+1;
    }), 'The full 3D preview must remain visible while choosing '+category+' at 320px');
  }
  assert(!(await preview.screenshot()).equals(defaultPreview),'The rendered 3D preview must react to the avatar draft');
  await student.screenshot({path:'.local/screenshots/avatar-editor-mobile.png'});
  const expectedAvatar = {hair:'bob',hairColor:'pink',skin:'honey',expression:'sleepy',clothing:'knit',clothingColor:'sky',accessory:'cat'};
  const pendingSnapshot = await (await studentB.request.get(roomURL)).json();
  assert.equal(pendingSnapshot.seats.find(seat=>seat.number===1).avatar,undefined,'The editor must keep an unsubmitted draft private');
  await editor.getByRole('button',{name:'꾸민 모습 저장',exact:true}).click();
  await editor.waitFor({state:'hidden'});
  await second.locator('.classroom-actor[data-seat="1"][data-customized="true"]').waitFor();
  await second.bringToFront();
  await second.locator('canvas.auditorium-world[data-avatars="true"]').waitFor();
  const sharedSnapshot = await (await studentB.request.get(roomURL)).json();
  assert.deepEqual(sharedSnapshot.seats.find(seat=>seat.number===1).avatar,expectedAvatar,
    'The other student must see the saved avatar on the correct seat');
  await student.bringToFront();
  await student.reload();
  await readyStage(student);
  await customize.click();
  for (const [category, choices] of avatarChoices) {
    await categories.getByRole('button',{name:category,exact:true}).click();
    for (const choice of choices) {
      assert.equal(await editor.getByRole('button',{name:choice,exact:true}).getAttribute('aria-pressed'),'true',
        'Reloaded editor must keep '+choice);
    }
  }
  assert.equal(await editor.getByRole('button',{name:'꾸민 모습 저장',exact:true}).isEnabled(),false);
  await editor.getByRole('button',{name:'캐릭터 꾸미기 닫기',exact:true}).click();
  await student.setViewportSize({width:390,height:844});
  assert.equal(await page.getByRole('button',{name:'캐릭터 꾸미기',exact:true}).count(), 0);
  const teacherChatInput = page.getByLabel('채팅 메시지',{exact:true});
  await teacherChatInput.fill('강사와 수강생이 함께 나누는 실시간 채팅입니다.');
  await page.getByRole('button',{name:'메시지 보내기',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'강의실',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByRole('heading',{name:'실시간 채팅',exact:true}).count(),0);
  const messageNotice = page.locator('.toast.visible').filter({hasText:'메시지를 보냈어요.'});
  await messageNotice.waitFor();
  await waitUntil(async()=> {
    const toast = await messageNotice.boundingBox();
    const composer = await page.locator('.chat-composer').boundingBox();
    return toast && composer && toast.y+toast.height <= composer.y;
  },'The send confirmation must stay above the persistent composer');
  await student.locator('.classroom-board-content').getByText('강사와 수강생이 함께 나누는 실시간 채팅입니다.',{exact:true}).waitFor({timeout:10000});
  await waitUntil(async()=>await student.getByRole('button',{name:'채팅',exact:true}).getAttribute('aria-describedby')==='new-chat-hint',
    'The auditorium view must notify students of incoming chat');
  await student.getByLabel('채팅 메시지',{exact:true}).fill('한글 조합 중');
  await student.getByLabel('채팅 메시지',{exact:true}).evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,isComposing:true})));
  assert.equal(await student.getByLabel('채팅 메시지',{exact:true}).inputValue(),'한글 조합 중');
  assert.equal((await(await teacher.request.get(roomURL)).json()).messages.some(m=>m.text==='한글 조합 중'),false);
  await student.getByLabel('채팅 메시지',{exact:true}).fill('수강생 질문이 강사에게 보이나요?'); await student.getByLabel('채팅 메시지',{exact:true}).press('Enter');
  const firstBubble = page.locator('.classroom-actor[data-seat="1"] .classroom-seat-bubble');
  await firstBubble.getByText('수강생 질문이 강사에게 보이나요?',{exact:true}).waitFor({timeout:10000});
  await second.getByRole('button',{name:'채팅',exact:true}).click();
  await second.getByLabel('채팅 메시지',{exact:true}).fill('저도 잘 보여요!');
  await second.getByLabel('채팅 메시지',{exact:true}).press('Enter');
  await second.getByRole('button',{name:'강의실',exact:true}).click();
  await readyStage(second);
  await page.locator('.classroom-actor[data-seat="2"] .classroom-seat-bubble').getByText('저도 잘 보여요!',{exact:true}).waitFor();
  await page.getByRole('button',{name:'채팅',exact:true}).click();
  await page.getByRole('button',{name:'링크 첨부',exact:true}).click(); await page.getByLabel('채팅 메시지',{exact:true}).fill('실습 자료'); await page.getByLabel('링크 주소').fill('https://chatgpt.com/'); await page.getByRole('button',{name:'메시지 보내기',exact:true}).click();
  await student.locator('.classroom-board-content').getByText('실습 자료',{exact:true}).waitFor({timeout:10000});
  await page.locator('.chat-message').filter({hasText:'실습 자료'}).locator('.message-menu summary').click();
  await page.getByRole('button',{name:'상단 고정',exact:true}).click();
  await page.getByRole('button',{name:'강의실',exact:true}).click();
  const classroomButton = student.getByRole('button',{name:'강의실',exact:true});
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
  await student.getByRole('button',{name:'잘 따라가고 있어요',exact:true}).click();
  await student.getByText('응답 완료',{exact:true}).waitFor();
  await student.getByRole('button',{name:'투표 창 닫기'}).click();
  const votedPoll = (await (await teacher.request.get(roomURL)).json()).polls.find(p=>p.kind==='custom'&&!p.archived);
  assert.deepEqual(votedPoll.counts,[1,0]);
  await teacher.request.post(roomURL,{data:{type:'poll-reset',id:votedPoll.id}});
  const newPoll = (await (await teacher.request.get(roomURL)).json()).polls.find(p=>p.kind==='custom'&&!p.archived);
  assert.equal(await student.getByRole('group',{name:'오늘의 컨디션',exact:true}).count(),0);
  assert.equal(await second.getByRole('group',{name:'오늘의 컨디션',exact:true}).count(),0);
  await teacher.request.post(roomURL,{data:{type:'active',active:false}});
  assert.equal((await studentA.request.post(roomURL,{data:{type:'vote',pollId:newPoll.id,option:0}})).status(),409);
  assert.equal((await studentA.request.post(roomURL,{data:{type:'message',text:'종료된 강의에 전송'}})).status(),409);
  await teacher.request.post(roomURL,{data:{type:'active',active:true}});
  await page.getByRole('button',{name:'참여 링크',exact:true}).click(); await page.getByAltText('강의실 '+code+' 참여 QR코드').waitFor();
  assert.equal(await page.locator('dialog').evaluate(el=>el.open),true);
  await page.screenshot({path:'.local/screenshots/share-qr.png',fullPage:true}); await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog').count(),0);
  for (const [width,height] of [[1440,900],[1440,680],[810,535],[390,844],[320,568]]) {
    await student.setViewportSize({width,height});
    await readyStage(student);
    await student.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,left:0,behavior:'instant'})});
    assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true, 'Overflow at '+width);
    const pageHeight = await student.evaluate(()=>({viewport:innerHeight,page:document.documentElement.scrollHeight}));
    assert(pageHeight.page<=pageHeight.viewport,`Page scroll at ${width}×${height} (${pageHeight.page}px document, ${pageHeight.viewport}px viewport)`);
    if (width === 1440 && height === 680) {
      await waitUntil(async () => {
        const viewport = await student.locator('.auditorium-viewport').boundingBox();
        const floor = await student.locator('.classroom-floor').boundingBox();
        const screen = await student.locator('.classroom-board').boundingBox();
        return floor.width >= viewport.width*.76 && screen.width >= viewport.width*.42
          && floor.width / floor.height <= 2.36;
      }, 'The stage and screen should use the available width in a short desktop window');
    }
    const classroomComposer = await student.getByLabel('채팅 메시지',{exact:true}).boundingBox();
    assert(classroomComposer && classroomComposer.y>=0 && classroomComposer.y+classroomComposer.height<=height,
      'Classroom composer outside first viewport at '+width);
    if (width >= 761) {
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
    }
    const points = await student.locator('.classroom-seat').evaluateAll(items=>items.map(el=>({x:parseFloat(el.style.left), y:parseFloat(el.style.top)})));
    assert.equal(new Set(points.map(point=>point.x+'/'+point.y)).size,20,'Unique auditorium positions at '+width);
    assert(points.every(point=>point.x>0 && point.x<100 && point.y>0 && point.y<100),'All seats inside auditorium at '+width);
    assert(points.slice(0,4).every(point=>Math.abs(point.y-points[0].y)<.05), 'The front row is aligned at '+width);
    assert(points[0].x<points[1].x && points[1].x<50 && points[2].x>50 && points[2].x<points[3].x,
      'The front row leaves a central aisle at '+width);
    assert.equal(await student.locator('.classroom-seat').count(), 20);
    const deskBottom = await student.locator('.classroom-seat').evaluateAll(items=>Math.max(...items.map(el=>el.getBoundingClientRect().bottom)));
    const footer = await student.locator('.classroom-seating-footer').boundingBox();
    assert(deskBottom <= footer.y + 1, 'Desk rows overlap the controls at '+width);
    if (width < 761) {
      await customize.scrollIntoViewIfNeeded();
      const shell = await student.locator('.chat-composer').boundingBox();
      const customizeButton = await customize.boundingBox();
      assert(customizeButton.y+customizeButton.height <= shell.y+1,'Avatar control must scroll into view above composer at '+width);
      await student.locator('.classroom-pane').evaluate(el=>{el.scrollTop=0;});
    }
    await student.screenshot({path:width === 1440 && height === 680 ? '.local/screenshots/auditorium-wide-short.png' : '.local/screenshots/student-'+width+'.png',fullPage:true});
  }
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,left:0,behavior:'instant'})});
  await page.getByRole('button',{name:'강의실',exact:true}).click();
  await readyStage(page);
  await page.screenshot({path:'.local/screenshots/teacher-desktop.png',fullPage:true});
  await page.setViewportSize({width:320,height:1000}); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'Teacher overflow at 320');
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  await page.screenshot({path:'.local/screenshots/teacher-mobile.png',fullPage:true});
  await page.goto(base); await page.getByRole('heading',{name:'AI 강의실',exact:true}).waitFor(); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'Home overflow at 320'); assert.equal(await page.getByLabel('채팅 메시지',{exact:true}).isEnabled(),true); await page.screenshot({path:'.local/screenshots/home-mobile.png',fullPage:true});
  await page.goto(base+'/join'); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'Optional join overflow at 320');
  await student.getByLabel('강의실 설정',{exact:true}).click();
  await student.getByRole('button',{name:'이전 투표 결과 보기',exact:true}).click();
  assert.equal(await student.locator('.compact-poll').count(),1);
  assert.match(await student.locator('.compact-poll-total').innerText(),/1명/);
  await student.getByRole('heading',{name:'실습을 따라오고 있나요?'}).waitFor();
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
    await waitUntil(async () => await student.locator('.auditorium-scene').evaluate(scene => {
      const board = scene.querySelector('.classroom-board');
      const content = board?.querySelector('.classroom-board-content');
      if (!board || !content) return false;
      const seats = scene.querySelector('.classroom-seats').getBoundingClientRect();
      const frame = board.getBoundingClientRect();
      return seats.height > 100 && seats.top >= frame.bottom - 1 && content.getBoundingClientRect().bottom <= frame.bottom + 1;
    }), 'Expanded board must preserve all desk rows below the message at '+width);
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
  await second.emulateMedia({reducedMotion:'reduce'});
  await student.reload();
  await student.locator('.classroom-seat.is-mine[title="몽실구름"]').waitFor();
  const peerActor = second.locator('.classroom-actor[data-seat="1"][data-customized="true"]');
  await peerActor.waitFor();
  const seatedActor = await peerActor.elementHandle();
  const seatedAnchor = await peerActor.evaluate(el=>({left:el.style.left,top:el.style.top}));
  assert.equal(await peerActor.getAttribute('data-pose'),'seated');
  await student.getByRole('button',{name:'내 캐릭터 일어나기',exact:true}).tap();
  const floor = student.getByRole('group',{name:'캐릭터 이동 영역',exact:true});
  const bounds = await floor.boundingBox();
  const destination = {x:Math.round(bounds.width*.84),y:Math.round(bounds.height*.72)};
  await floor.tap({position:destination});
  assert(await student.locator('.classroom-walker.is-mine').evaluate(el => {
    const width = el.closest('.classroom-floor').clientWidth;
    const destinationX = parseFloat(el.style.left)/100;
    return el.getAnimations().some(animation => animation.effect.getKeyframes().slice(1,-1)
      .some(frame => Math.abs(destinationX+parseFloat(frame.translate)/width-.5)<.01));
  }),
    'A long crossing must animate through the central aisle');
  const walker = second.locator('.classroom-walker[title="몽실구름"]');
  await walker.waitFor();
  await waitUntil(async () => Math.abs(parseFloat(await walker.evaluate(el=>el.style.left)) - destination.x / bounds.width * 100) < 1,
    'Touch/click movement must reach the other student');
  assert.equal(await peerActor.evaluate((element,original)=>element===original,seatedActor),true,
    'Standing must retain the same rendered actor that was sitting at the desk');
  assert.equal(await peerActor.getAttribute('data-pose'),'standing');
  assert.equal(await peerActor.evaluate(element=>element.getAnimations().length),0,
    'An observer who requests reduced motion must not animate walking');
  await second.emulateMedia({reducedMotion:'no-preference'});
  await seatedActor.dispose();
  await floor.focus();
  await student.keyboard.press('ArrowRight');
  const moved = await student.locator('.classroom-walker.is-mine').evaluate(el=>el.style.left);
  await waitUntil(async () => (await walker.evaluate(el=>el.style.left)) === moved, 'Arrow-key movement must be broadcast');
  await student.reload();
  await student.locator('.classroom-walker.is-mine').waitFor();
  await walker.waitFor();
  const standingActor = await peerActor.elementHandle();
  await student.getByRole('button',{name:'내 자리로',exact:true}).click();
  await waitUntil(async () => await walker.count() === 0, 'Returning to seat must remove roaming character for everyone');
  await waitUntil(async()=>await peerActor.getAttribute('data-returning')!==null,
    'Returning must animate the existing actor back to the seat');
  await second.screenshot({path:'.local/screenshots/classroom-actor-return.png'});
  await waitUntil(async()=>await peerActor.getAttribute('data-pose')==='seated' && await peerActor.getAttribute('data-returning')===null,
    'The actor must sit down after reaching the desk');
  assert.equal(await peerActor.evaluate((element,original)=>element===original,standingActor),true,
    'Returning to the desk must preserve the same actor element');
  assert.deepEqual(await peerActor.evaluate(el=>({left:el.style.left,top:el.style.top})),seatedAnchor,
    'The actor must return to its original seat anchor');
  await standingActor.dispose();
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/host?room='+code);
  await page.getByRole('heading',{name:'실시간 기능 검증 수업'}).waitFor();
  await readyStage(page);

  const peerInstructor = student.locator('.classroom-walker.is-instructor[title="강사"]');
  await peerInstructor.waitFor();
  const instructorHome = await peerInstructor.evaluate(element=>({left:element.style.left,top:element.style.top}));
  await page.getByRole('button',{name:'움직이기',exact:true}).click();
  const instructorFloor = page.getByRole('group',{name:'캐릭터 이동 영역',exact:true});
  const instructorFloorBounds = await instructorFloor.boundingBox();
  const instructorDestination = {x:Math.round(instructorFloorBounds.width*.73),y:Math.round(instructorFloorBounds.height*.66)};
  await instructorFloor.click({position:instructorDestination});
  await waitUntil(async()=>{
    const point = await peerInstructor.evaluate(element=>({left:parseFloat(element.style.left),top:parseFloat(element.style.top)}));
    return Math.abs(point.left-instructorDestination.x/instructorFloorBounds.width*100)<1
      && Math.abs(point.top-instructorDestination.y/instructorFloorBounds.height*100)<1;
  },'Instructor movement must reach the student in normalized classroom coordinates');
  await page.getByRole('button',{name:'칠판 앞으로',exact:true}).click();
  await waitUntil(async()=>peerInstructor.evaluate((element,home)=>element.style.left===home.left&&element.style.top===home.top,instructorHome),
    'Returning to the chalkboard must also return the instructor for the student');

  const moveMode = student.getByLabel('캐릭터 이동 방식',{exact:true});
  await moveMode.selectOption('wander');
  await walker.waitFor();
  const firstWanderPoint = await walker.evaluate(element=>element.style.left+','+element.style.top);
  await waitUntil(async()=>await walker.evaluate(element=>element.style.left+','+element.style.top)!==firstWanderPoint,
    'A peer must see the student continue moving in autonomous mode');
  const manualMovement = student.waitForResponse(response=>{
    const request = response.request();
    if (request.method()!=='POST'||response.url()!==roomURL) return false;
    const action = request.postDataJSON();
    return action?.type==='move'&&!action.wander&&Boolean(action.position);
  });
  await moveMode.selectOption('manual');
  const manualResponse = await manualMovement;
  assert.equal(manualResponse.status(),200);
  const manualSeat = (await manualResponse.json()).seats.find(seat=>seat.mine);
  assert(manualSeat?.position&&!manualSeat.wanderSince,'Switching to manual must keep the current position and stop wandering');
  await waitUntil(async()=>{
    const point = await walker.evaluate(element=>({x:parseFloat(element.style.left)/100,y:parseFloat(element.style.top)/100}));
    return Math.abs(point.x-manualSeat.position.x)<.0002&&Math.abs(point.y-manualSeat.position.y)<.0002;
  },'Peers must receive the position when the student stops wandering');
  await student.getByRole('button',{name:'내 자리로',exact:true}).click();
  await waitUntil(async()=>await walker.count()===0,'A student leaving autonomous mode must be able to return to their seat');

  await student.getByRole('button',{name:'활동',exact:true}).click();
  const activities = student.getByRole('dialog',{name:'교실 활동',exact:true});
  await activities.getByRole('button',{name:'질문 있어요',exact:true}).click();
  await waitUntil(async()=>await page.locator('.raised-hand').count() === 1,'Raised hand must reach instructor');
  await activities.getByRole('button',{name:'박수',exact:true}).click();
  await peerActor.locator('[data-kind="clap"]').waitFor();
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
  await peerActor.locator('[data-kind="heart"]').waitFor();
  await page.getByRole('button',{name:/^활동/}).click();
  const hostActivities = page.getByRole('dialog',{name:'교실 활동',exact:true});
  await hostActivities.getByRole('button',{name:'응답 완료',exact:true}).click();
  await waitUntil(async()=>await second.locator('.raised-hand').count() === 0,'Instructor can acknowledge raised hand');
  await hostActivities.getByRole('button',{name:'교실 활동 닫기',exact:true}).click();

  const prompt = 'AI를 환경업무에 활용할 첫 과제는 무엇인가요?';
  const answer = '습도 센서 기록을 먼저 확인하겠습니다.';
  await page.getByRole('button',{name:'질문 출제',exact:true}).click();
  const hostQuestion = page.getByRole('dialog',{name:/^질문 (출제|관리)$/});
  await hostQuestion.getByLabel('질문',{exact:true}).fill(prompt);
  await hostQuestion.getByRole('button',{name:'질문 열기',exact:true}).click();
  await student.getByRole('button',{name:'질문 답하기',exact:true}).waitFor();
  const mobileToolbar = student.locator('.classroom-view-tools');
  const mobileToolbarButtons = mobileToolbar.getByRole('button');
  assert.equal(await mobileToolbarButtons.count(),6,'The compact classroom bar should expose all six controls');
  assert(await mobileToolbarButtons.evaluateAll(buttons => {
    const bar = buttons[0].closest('.classroom-view-tools').getBoundingClientRect();
    const boxes = buttons.map(button => button.getBoundingClientRect());
    return boxes.every((box,index) => box.width>=44 && box.height>=44 &&
      box.left>=bar.left && box.right<=bar.right && box.top>=bar.top && box.bottom<=bar.bottom &&
      Math.abs(box.y+box.height/2-boxes[0].y-boxes[0].height/2)<=2 &&
      (index===0 || box.left>=boxes[index-1].right));
  }), 'Question, camera, tabs and materials must fit on one 320px toolbar with distinct touch targets');
  await student.screenshot({path:'.local/screenshots/classroom-toolbar-320.png'});
  await student.getByRole('button',{name:'질문 답하기',exact:true}).click();
  const studentQuestion = student.getByRole('dialog',{name:'질문 답하기',exact:true});
  await studentQuestion.getByText(prompt,{exact:true}).waitFor();
  await studentQuestion.getByLabel('내 답변',{exact:true}).fill(answer);
  await studentQuestion.getByRole('button',{name:'답변 보내기',exact:true}).click();
  await studentQuestion.getByRole('button',{name:'답변 수정',exact:true}).waitFor();
  await student.screenshot({path:'.local/screenshots/classroom-question-mobile.png'});
  await studentQuestion.getByRole('button',{name:'질문 창 닫기',exact:true}).click();

  await second.getByRole('button',{name:'채팅',exact:true}).click();
  assert.equal(await second.getByRole('group',{name:'교실 보기',exact:true}).count(),0);
  await second.getByRole('button',{name:'질문 답하기',exact:true}).click();
  const peerQuestion = second.getByRole('dialog',{name:'질문 답하기',exact:true});
  await peerQuestion.getByText(prompt,{exact:true}).waitFor();
  assert.equal(await peerQuestion.getByText(answer,{exact:true}).count(),0);
  assert.equal(await peerQuestion.getByLabel('내 답변',{exact:true}).inputValue(),'');
  const peerOpenRound = (await (await studentB.request.get(roomURL)).json()).questionRound;
  assert.equal(peerOpenRound.total,1);
  assert.equal(peerOpenRound.myAnswer,null);
  assert.equal('answers' in peerOpenRound,false,'Peer snapshots must withhold the answer list before publication');
  await peerQuestion.getByRole('button',{name:'질문 창 닫기',exact:true}).click();

  if (!await hostQuestion.isVisible()) await page.getByRole('button',{name:'질문 관리',exact:true}).click();
  await hostQuestion.getByRole('region',{name:'수강생 답변',exact:true}).getByText(answer,{exact:true}).waitFor();
  await hostQuestion.getByRole('button',{name:'질문 마감',exact:true}).click();
  await second.getByRole('button',{name:'답변 보기',exact:true}).waitFor();
  const peerClosedRound = (await (await studentB.request.get(roomURL)).json()).questionRound;
  assert.equal(peerClosedRound.open,false);
  assert.equal('answers' in peerClosedRound,false,'Closing the question must not publish peer answers');
  await hostQuestion.getByRole('button',{name:'답변 공개',exact:true}).click();
  await second.getByRole('button',{name:'답변 보기',exact:true}).click();
  const publishedQuestion = second.getByRole('dialog',{name:'답변 보기',exact:true});
  await publishedQuestion.getByRole('region',{name:'공개된 답변',exact:true}).getByText(answer,{exact:true}).waitFor();
  await publishedQuestion.getByRole('button',{name:'질문 창 닫기',exact:true}).click();
  await hostQuestion.getByRole('button',{name:'질문 창 닫기',exact:true}).click();
  await verifyAuditoriumCapacity(browser, teacher, base, waitUntil);
  assert.deepEqual(errors,[]);
  assert.equal(roomGets,0,'The room must use WebSocket push instead of HTTP polling'); assert(liveConnections>=1,'No live WebSocket was opened');
  writeFileSync('.local/browser-verification.json', JSON.stringify({ passed: true, code,
    checks: ['instructor login', '20 visible desks', 'two students with distinct seat bubbles', 'teacher chalkboard',
      '3D avatar editor at 320px, draft privacy, peer update and reload persistence', 'classroom without mood controls',
      'adaptive chalk size', '2000-character chalkboard with line breaks, link and file at 320/390/1440',
      'single-line 320px classroom toolbar', 'full-width auditorium and persistent composer', 'desktop classroom chat send', 'desktop and mobile tab draft', 'chat unread indicator', 'reference PDFs', 'polls and archive', 'Korean IME', 'moderation and QR',
      'WebSocket delivery', '1440/810/390/320 layouts', 'raised hands and acknowledgments', 'reactions and reciprocal greetings',
      'short-answer questions in classroom and chat, private submission, close and publication', 'group-photo PNG download', 'instructor movement and return visible to students',
      'student autonomous movement, manual takeover and continuous animated return to seat',
      '20 to 50 live WebGL seats', 'WebGL context loss, fallback and rendered restoration', 'browser errors']
  }, null, 2));
  console.log('PASS: bright WebGL classroom, instructor movement, autonomous student movement, separate chat, teacher chalkboard, materials, voting and moderation.');
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
    await instructor.locator('.classroom-actor[data-seat="50"] [data-kind="clap"]').waitFor();
    await instructor.screenshot({path:'.local/screenshots/auditorium-50-desktop.png',fullPage:true});
    await activities.getByRole('button',{name:'교실 활동 닫기',exact:true}).click();

    await student.setViewportSize({width:320,height:568});
    await readyStage(student);
    await student.locator('.classroom-pane').evaluate(element=>{element.scrollTop=0;});
    assert.equal(await student.locator('.classroom-greet-hit').count(),0,
      'Overview must not expose overlapping tiny avatar hit targets');
    await student.screenshot({path:'.local/screenshots/auditorium-50-mobile-overview.png'});
    const nearbyButton = student.getByRole('button',{name:'내 주변',exact:true});
    await nearbyButton.click();
    await readyStage(student);
    const floor = student.getByRole('group',{name:'캐릭터 이동 영역',exact:true});
    const visibleFloor = student.getByRole('region',{name:'교실 좌석',exact:true});
    assert.equal(await nearbyButton.getAttribute('aria-pressed'),'true');
    await visibleFloor.evaluate(element=>element.scrollTo({left:0,top:0,behavior:'instant'}));
    await nearbyButton.click();
    await waitUntil(async()=>await visibleFloor.evaluate(element=>element.scrollLeft>0),
      'Selecting the active nearby view again should re-center the fiftieth seat');
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

    await visibleFloor.scrollIntoViewIfNeeded();
    await visibleFloor.evaluate(element=>{
      const floor = element.querySelector('.classroom-floor');
      element.scrollTo({
        left:(floor.clientWidth-element.clientWidth)/2,
        top:floor.clientHeight*.70-element.clientHeight/2,
        behavior:'instant'
      });
    });
    await student.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const touchPoint = await visibleFloor.evaluate(element=>{
      const bounds = element.getBoundingClientRect();
      const clearance = [-18,0,18];
      for (const yRatio of [.5,.35,.65,.2,.8]) for (const xRatio of [.5,.4,.6,.2,.8]) {
        const x=bounds.x+bounds.width*xRatio,y=bounds.y+bounds.height*yRatio;
        // A touch close to a button may target that button even when the center hits the floor.
        const clear = clearance.every(dx=>clearance.every(dy=>{
          const hit = document.elementFromPoint(x+dx,y+dy);
          return hit?.closest('.classroom-floor')&&!hit.closest('a,button,input,textarea,select,.world-screen');
        }));
        if (clear) return {x,y};
      }
      return null;
    });
    if (!touchPoint) {
      await student.screenshot({path:'.local/screenshots/classroom-near-touch-error.png'});
      const area = await visibleFloor.evaluate(element=> {
        const box = element.getBoundingClientRect();
        const x = box.left+box.width/2;
        const y = box.top+box.height/2;
        return {x,y,scroll:[element.scrollLeft,element.scrollTop],hits:document.elementsFromPoint(x,y).slice(0,5).map(hit=>hit.className)};
      });
      assert.fail('Nearby view needs a reachable floor area for touch movement '+JSON.stringify(area));
    }
    const touchFloorRect = await floor.boundingBox();
    const expectedTouchX = Math.max(.06,Math.min(.94,(touchPoint.x-touchFloorRect.x)/touchFloorRect.width));
    const expectedTouchY = Math.max(.365,Math.min(.92,(touchPoint.y-touchFloorRect.y)/touchFloorRect.height));
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

    await instructor.bringToFront();
    const canvas = instructor.locator('canvas.auditorium-world');
    const lossControl = await canvas.evaluateHandle(element=>element.getContext('webgl2')?.getExtension('WEBGL_lose_context'));
    assert(await lossControl.evaluate(extension=>Boolean(extension)),'The WebGL fixture needs the genuine context-loss extension');
    const widthBeforeLoss = (await canvas.boundingBox()).width;
    await lossControl.evaluate(extension=>extension.loseContext());
    const fallback = instructor.locator('.auditorium-scene[data-world="fallback"]');
    await fallback.locator('.auditorium-seat-base').first().waitFor();
    assert(await fallback.locator('img.auditorium-backdrop').isVisible(),
      'A context loss must keep the painted classroom behind the SVG furniture');
    assert(await fallback.locator('.classroom-actor-sprite').first().isVisible(),
      'A context loss must show the SVG avatar fallback');
    await instructor.setViewportSize({width:1280,height:810});
    await instructor.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.notEqual((await canvas.boundingBox()).width,widthBeforeLoss,'The lost canvas must be resized during this check');
    assert.equal(await canvas.getAttribute('data-ready'),'false','Resize during context loss must keep the fallback visible');
    assert.equal(await instructor.locator('.classroom-seat.is-occupied').count(),50,'Context loss must retain the live participants');
    await lossControl.evaluate(extension=>extension.restoreContext());
    await readyStage(instructor);
    await instructor.locator('canvas.auditorium-world[data-avatars="true"]').waitFor();
    assert.equal(await canvas.evaluate(element=>element.getContext('webgl2').isContextLost()),false);
    const frame = require('pngjs').PNG.sync.read(await canvas.screenshot({
      style:'.world-screen,.classroom-seats,.classroom-actor,img.auditorium-backdrop{visibility:hidden!important}'
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

