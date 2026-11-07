import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';

// Test-only RPC methods are appended to a local bundle, never to the deployed Worker.
const script = await readFile('.local/worker-build/index.js', 'utf8') + `
export class TestBoard extends ClassBoard {
  async seed(code, room) { await this.ctx.storage.put('room:' + code, JSON.parse(room)); }
  async stored(code) { return JSON.stringify(await this.ctx.storage.get('room:' + code)); }
  async triggerAlarm() { await this.ctx.storage.setAlarm(Date.now() + 30); }
  async alarmTime() { return await this.ctx.storage.getAlarm(); }
  async midnightAt(iso) { return nextMidnight(new Date(iso)); }
  async fileStats(code) { return JSON.stringify({
    files: this.ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM classroom_files WHERE room = ?', code).one().n,
    chunks: this.ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM classroom_file_chunks').one().n
  }); }
  async fileDate(id, date) { this.ctx.storage.sql.exec('UPDATE classroom_files SET date = ? WHERE id = ?', date, id); }
  async quotaFixture(id, code, date, size) { this.ctx.storage.sql.exec('INSERT INTO classroom_files (id, room, date, name, size, digest) VALUES (?, ?, ?, ?, ?, ?)', id, code, date, 'quota-fixture', size, 'test'); }
}
`;
const options = convertV4MiniflareOptions({ name: 'mamo-test', script, modules: true, compatibilityDate: '2026-10-09',
  durableObjects: { CLASS_BOARD: { className: 'TestBoard', useSQLite: true } },
  resourcePersistencePath: `.local/worker-test-${crypto.randomUUID()}`, cf: false });
options.log = new Log(LogLevel.WARN);
let mf = new Miniflare(options);
const sockets = [];
const origin = 'https://classroom.test';
async function request(path, input, cookie, headers = {}) {
  const response = await mf.dispatchFetch(origin + path, { method: input ? 'POST' : 'GET',
    headers: { ...(input ? { 'content-type': 'application/json', origin } : {}), ...(cookie ? { cookie } : {}), ...headers },
    ...(input ? { body: JSON.stringify(input) } : {}) });
  return { response, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function connect(path, cookie) {
  const response = await mf.dispatchFetch(origin + path + '/live', { headers: { upgrade: 'websocket', cookie, origin } });
  assert.equal(response.status, 101);
  const ws = response.webSocket; ws.accept(); sockets.push(ws);
  const peer = { ws, latest: null, messages: [], pong: false };
  ws.addEventListener('message', event => { if (event.data === 'pong') { peer.pong = true; return; } const value = JSON.parse(event.data); peer.messages.push(value); peer.latest = value.data; });
  return peer;
}
async function upload(path, bytes, cookie, options = {}) {
  const id = options.id ?? crypto.randomUUID();
  // Exercise the real local HTTP upload path, including early body rejection.
  const endpoint = await mf.ready;
  const response = await fetch(new URL(path + '/files', endpoint), { method: 'POST', headers: {
    'content-type': 'application/octet-stream', origin: endpoint.origin, ...(cookie ? { cookie } : {}),
    'x-upload-id': id, 'x-file-name': encodeURIComponent(options.name ?? '실습 자료.pdf'),
    'x-class-date': options.date ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    'x-file-caption': encodeURIComponent('오늘 실습 자료입니다.'), ...options.headers
  }, body: bytes, ...(bytes instanceof ReadableStream ? { duplex: 'half' } : {}) });
  return { response, data: await response.json(), id };
}
async function until(fn, label) { for (let i = 0; i < 100; i++) { if (await fn()) return; await new Promise(resolve => setTimeout(resolve, 30)); } throw new Error(label); }
try {
  assert.equal((await request('/api/auth', { password: 'wrong' })).response.status, 401);
  const login = await request('/api/auth', { password: '0423' }); assert.equal(login.response.status, 200);
  const host = login.cookie;
  assert.match(login.response.headers.get('set-cookie'), /HttpOnly.*SameSite=Strict.*Secure/);
  assert.equal((await request('/api/auth', undefined, host)).data.host, true);
  assert.equal((await request('/api/auth', undefined, host.slice(0, -2) + 'xx')).data.host, false);
  assert.equal((await request('/api/rooms', { title: '위조 요청' }, host, { origin: 'https://other.test' })).response.status, 403);
  assert.equal((await request('/api/rooms', { title: '권한 없음' })).response.status, 401);
  const main = await Promise.all(Array.from({ length: 10 }, () => request('/api/rooms/MAMOAI', { type: 'join' })));
  assert(main.every(result => result.data.code === 'MAMOAI'));
  assert(main.every(result => result.data.title === '신현준 연구사 AI환경연구소'));
  // Vercel proxies HTTP, while authenticated live connections go directly to the Worker.
  const vercelHeaders = { origin: 'https://hjaiedu.vercel.app', 'sec-fetch-site': 'same-origin' };
  assert.equal((await request('/api/rooms/MAMOAI/live-ticket', { type: 'connect' }, undefined, vercelHeaders)).response.status, 401);
  const ticket = await request('/api/rooms/MAMOAI/live-ticket', { type: 'connect' }, main[0].cookie, vercelHeaders);
  assert.equal(ticket.response.status, 200);
  const liveHeaders = { upgrade: 'websocket', origin: 'https://hjaiedu.vercel.app', 'sec-fetch-site': 'cross-site', 'sec-websocket-protocol': `classroom-live, classroom-auth.${ticket.data.ticket}` };
  const directLive = await mf.dispatchFetch(origin + '/api/rooms/MAMOAI/live', { headers: liveHeaders });
  assert.equal(directLive.status, 101); assert.equal(directLive.headers.get('sec-websocket-protocol'), 'classroom-live');
  directLive.webSocket.accept(); sockets.push(directLive.webSocket);
  assert.equal((await mf.dispatchFetch(origin + '/api/rooms/MAMOAI/live', { headers: { ...liveHeaders, origin: 'https://evil.test' } })).status, 403);
  assert.equal((await request('/api/rooms/MAMOAI/live-ticket', { type: 'connect' }, main[0].cookie, { origin: 'https://evil.vercel.app' })).response.status, 403);
  const hostTicket = await request('/api/rooms/MAMOAI/live-ticket', { type: 'connect' }, host, vercelHeaders);
  assert.equal(hostTicket.response.status, 200);
  const code = (await request('/api/rooms', { title: '50명 동시 검증' }, host)).data.code;
  const path = `/api/rooms/${code}`;
  const dockRequest = { type: 'start-day', dockInstructor: true };
  const instructorMove = { type: 'instructor-move', position: { x: .5, y: .56 } };
  const disconnectTeacher = async peer => {
    peer.ws.close();
    await until(async () => !(await request(path, undefined, host)).data.instructor, 'Instructor socket did not close');
  };
  assert.equal((await request(path, dockRequest)).response.status, 401);
  for (const move of [instructorMove, { type: 'instructor-move', wander: true }]) {
    const moved = await request(path, move, host);
    assert.equal(moved.response.status, 200);
    assert.equal((await request(path, { type: 'start-day' }, host)).response.status, 200);
    const resumed = await connect(path, host);
    await until(() => resumed.latest?.instructor, 'Instructor did not reconnect');
    if (move.position) assert.deepEqual(resumed.latest.instructor.position, move.position);
    else assert(resumed.latest.instructor.wanderSince);
    await disconnectTeacher(resumed);
    assert.equal((await request(path, dockRequest, host)).response.status, 200);
    const docked = await connect(path, host);
    await until(() => docked.latest?.instructor, 'Instructor did not reenter');
    assert.deepEqual(docked.latest.instructor, {}, 'A fresh instructor entry clears earlier motion');
    await disconnectTeacher(docked);
  }
  const teacher = await connect(path, host);
  const students = [];
  for (let i = 0; i < 50; i++) {
    const joined = await request(path, { type: 'join' });
    students.push({ cookie: joined.cookie, peer: await connect(path, joined.cookie) });
  }
  await until(() => teacher.latest?.online === 50, '50 connections did not appear');
  assert.deepEqual(teacher.latest.seats.map(s => s.number), Array.from({ length: 50 }, (_, i) => i + 1));
  assert(teacher.latest.seats.every(s => !s.mine));
  assert.deepEqual(teacher.latest.polls.map(p => p.kind), ['mood']);
  assert.deepEqual(teacher.latest.instructor, {});
  assert.equal((await request(path, instructorMove, students[0].cookie)).response.status, 403);
  assert.equal((await request(path, { ...instructorMove, position: { x: 2, y: .56 } }, host)).response.status, 400);
  assert.equal((await request(path, instructorMove, host)).response.status, 200);
  await until(() => students[0].peer.latest?.instructor?.position?.y === .56, 'Instructor movement did not broadcast');
  assert.deepEqual((await request(path, dockRequest, host)).data.instructor.position, instructorMove.position,
    'Another host tab keeps the live instructor in place');
  assert.equal(students[0].peer.latest.online, 50);
  assert.equal(students[0].peer.latest.seats.length, 50);
  const studentWander = { type: 'move', wander: true };
  assert.equal((await request(path, studentWander, students[0].cookie)).response.status, 200);
  await until(() => Boolean(students[1].peer.latest?.seats[0].wanderSince), 'Student wander did not broadcast');
  assert.equal((await request(path, { type: 'instructor-move', wander: true }, host)).response.status, 200);
  const quiz = await request(path, { type: 'quiz-start', question: '자율 이동이 OX 답을 고를까요?', answer: 'X' }, host);
  assert.equal(quiz.response.status, 200);
  assert.equal(quiz.data.seats[0].wanderSince, undefined);
  assert.equal(quiz.data.instructor.wanderSince, undefined);
  assert.equal((await request(path, studentWander, students[0].cookie)).response.status, 409);
  const duringQuiz = await request(path, instructorMove, host);
  assert.deepEqual(duringQuiz.data.quiz.counts, [0, 0]);
  const newClientWander = await request(path, { ...studentWander, ignoreLegacyQuiz: true }, students[0].cookie);
  assert.equal(newClientWander.response.status, 200);
  assert(newClientWander.data.seats[0].wanderSince);
  const newClientMove = await request(path, { type: 'move', ignoreLegacyQuiz: true, position: { x: .5, y: .56 } }, students[0].cookie);
  assert.equal(newClientMove.response.status, 200);
  assert.deepEqual(newClientMove.data.quiz.counts, [0, 0]);
  await request(path, { type: 'move', ignoreLegacyQuiz: true, position: null }, students[0].cookie);
  await request(path, { type: 'quiz-clear', quizId: quiz.data.quiz.id }, host);
  await request(path, { type: 'instructor-move', position: null }, host);
  await until(() => students[0].peer.latest?.instructor && !students[0].peer.latest.instructor.position, 'Instructor did not return to the board');

  const startQuestion = { type: 'question-start', prompt: '오늘 가장 기억에 남은 내용은 무엇인가요?' };
  assert.equal((await request(path, { ...startQuestion, viewerHost: true }, students[0].cookie)).response.status, 403);
  assert.equal((await request(path, { ...startQuestion, prompt: '가'.repeat(161) }, host)).response.status, 400);
  const started = await request(path, startQuestion, host);
  assert.equal(started.response.status, 200);
  const roundId = started.data.questionRound.id;
  assert.deepEqual(started.data.questionRound, {
    id: roundId, prompt: startQuestion.prompt, open: true, published: false, total: 0, myAnswer: null, answers: []
  });
  assert.equal((await request(path, startQuestion, host)).response.status, 409);
  const answer = { type: 'question-answer', roundId, text: '짧게 요약하기' };
  assert.equal((await request(path, answer)).response.status, 401);
  assert.equal((await request(path, answer, host)).response.status, 403);
  assert.equal((await request(path, { ...answer, text: '가'.repeat(201) }, students[0].cookie)).response.status, 400);
  assert.equal((await request(path, { ...answer, roundId: 'stale' }, students[0].cookie)).response.status, 409);
  const firstAnswer = await request(path, answer, students[0].cookie);
  assert.equal(firstAnswer.response.status, 200);
  assert.equal(firstAnswer.data.questionRound.myAnswer, answer.text);
  assert.equal(firstAnswer.data.questionRound.answers, undefined);
  const changedText = '예시를 통해 이해한 내용';
  const peerText = '질문과 답변을 정리하는 방법';
  const edited = await request(path, { ...answer, text: ` ${changedText} `, name: '위조한 이름', seatNumber: 50 }, students[0].cookie);
  assert.equal(edited.data.questionRound.myAnswer, changedText);
  assert.equal(edited.data.questionRound.total, 1);
  assert.equal((await request(path, { ...answer, text: peerText }, students[1].cookie)).response.status, 200);
  await until(() => teacher.latest?.questionRound?.answers?.length === 2 &&
    students[0].peer.latest?.questionRound?.total === 2 && students[2].peer.latest?.questionRound?.total === 2,
  'Question answers did not broadcast to the correct viewers');
  const sharedAnswers = [
    { seatNumber: 1, name: '수강생 01', text: changedText },
    { seatNumber: 2, name: '수강생 02', text: peerText }
  ];
  assert.deepEqual(teacher.latest.questionRound.answers, sharedAnswers);
  assert.equal(students[0].peer.latest.questionRound.myAnswer, changedText);
  assert.equal(students[0].peer.latest.questionRound.answers, undefined);
  assert.equal(students[2].peer.latest.questionRound.myAnswer, null);
  assert.equal(students[2].peer.latest.questionRound.answers, undefined);
  const forgedView = await request(path + '?viewerHost=true', undefined, students[2].cookie);
  assert.equal(forgedView.data.questionRound.answers, undefined);
  assert(!JSON.stringify(forgedView.data).includes(changedText));
  assert.equal((await request(path, { type: 'question-publish', roundId }, students[0].cookie)).response.status, 403);
  const closed = await request(path, { type: 'question-close', roundId }, host);
  assert.equal(closed.response.status, 200);
  assert.equal(closed.data.questionRound.open, false);
  assert.equal(closed.data.questionRound.published, false);
  assert.equal((await request(path, undefined, students[1].cookie)).data.questionRound.answers, undefined);
  assert.equal((await request(path, answer, students[0].cookie)).response.status, 409);
  const published = await request(path, { type: 'question-publish', roundId }, host);
  assert.equal(published.response.status, 200);
  assert.equal(published.data.questionRound.open, false);
  assert.equal(published.data.questionRound.published, true);
  await until(() => students[2].peer.latest?.questionRound?.published === true, 'Question publication did not broadcast');
  assert.deepEqual(students[2].peer.latest.questionRound.answers, sharedAnswers);
  assert.deepEqual((await request(path, undefined, students[2].cookie)).data.questionRound.answers, sharedAnswers);
  assert.equal((await request(path, undefined, main[0].cookie)).data.questionRound.answers, undefined);
  const visitor = await request(path);
  assert.equal(visitor.data.questionRound.published, true);
  assert.equal(visitor.data.questionRound.answers, undefined);
  assert(!JSON.stringify(visitor.data).includes(changedText));

  const pollId = teacher.latest.polls[0].id;
  const results = await Promise.all(students.map((student, i) => request(path, { type: 'vote', pollId, option: i % 3 }, student.cookie)));
  assert(results.every(result => result.response.status === 200));
  await until(() => students.every(student => student.peer.latest?.polls[0].total === 50), '50 votes did not broadcast');
  assert.deepEqual(teacher.latest.polls[0].counts, [17, 17, 16]);
  assert(students.every((student, i) => student.peer.latest.polls[0].myVote === i % 3));
  assert.equal(teacher.latest.polls[0].myVote, null);
  assert(!JSON.stringify(teacher.latest).includes('votes'));
  await request(path, { type: 'message', text: '수강생의 실시간 질문', author: 'host', seatNumber: 20 }, students[0].cookie);
  await until(() => teacher.latest?.messages.length === 1 && students[1].peer.latest?.messages.length === 1, 'Chat did not broadcast');
  assert.equal(students[0].peer.latest.messages[0].mine, true);
  assert.equal(students[1].peer.latest.messages[0].mine, false);
  assert.equal(teacher.latest.messages[0].author, 'student');
  assert.equal(teacher.latest.messages[0].seatNumber, 1);
  await request(path, { type: 'message', text: '다른 자리에서 질문합니다.' }, students[1].cookie);
  await until(() => students[0].peer.latest?.messages.at(-1)?.seatNumber === 2, 'Two students must speak from distinct desks');
  assert.deepEqual(students[1].peer.latest.seats.filter(s => s.mine), [{ number: 2, name: '수강생 02', mine: true, character: 'sprout' }]);
  const pick = { type: 'character', character: 'cat', seatNumber: 2, guest: 'another-student' };
  assert.equal((await request(path, pick)).response.status, 401);
  assert.equal((await request(path, pick, host)).response.status, 403);
  assert.equal((await request(path, { ...pick, character: '<img>' }, students[0].cookie)).response.status, 400);
  assert.equal((await request(path, pick, students[0].cookie)).response.status, 200);
  await until(() => students[1].peer.latest.seats[0].character === 'cat' && teacher.latest.seats[0].character === 'cat', 'Chosen character was not broadcast');
  assert.equal(students[1].peer.latest.seats[1].character, 'sprout', 'A forged seat number cannot change another student');
  assert(!JSON.stringify(teacher.latest).includes('authorId'));
  assert.equal((await request(path, { type: 'delete', id: teacher.latest.messages[0].id }, students[0].cookie)).response.status, 401);
  const duplicate = await connect(path, students[0].cookie);
  await until(() => duplicate.latest?.online === 50, 'Duplicate tab count is wrong');
  assert.deepEqual(duplicate.latest.seats.filter(s => s.mine), [{ number: 1, name: '수강생 01', mine: true, character: 'cat' }]);
  const avatar = {
    hair: 'waves', hairColor: 'brown', skin: 'peach', expression: 'grin',
    clothing: 'puffer', clothingColor: 'sage', accessory: 'headphones'
  };
  const customize = { type: 'avatar-customize', avatar: { ...avatar, markup: '<svg>' }, seatNumber: 2, guest: 'another-student' };
  assert.equal((await request(path, customize)).response.status, 401);
  assert.equal((await request(path, customize, host)).response.status, 403);
  assert.equal((await request(path, { ...customize, avatar: { ...avatar, accessory: 'wrong' } }, students[0].cookie)).response.status, 400);
  const savedAvatar = await request(path, customize, students[0].cookie);
  assert.equal(savedAvatar.response.status, 200);
  assert.deepEqual(savedAvatar.data.seats[0].avatar, avatar);
  assert.equal(savedAvatar.data.seats[1].avatar, undefined);
  assert.equal('avatars' in savedAvatar.data, false);
  await until(() => teacher.latest.seats[0].avatar?.accessory === 'headphones' &&
    students[1].peer.latest.seats[0].avatar?.accessory === 'headphones', 'Customized appearance did not broadcast');
  duplicate.ws.send('ping'); await until(() => duplicate.pong, 'Automatic hibernation ping response missing');
  assert.equal((await request(path,{type:'greet',seatNumber:2},students[0].cookie)).response.status,200);
  const reciprocalGreeting = await request(path,{type:'greet',seatNumber:1},students[1].cookie);
  assert.equal(reciprocalGreeting.data.seats[0].activity.reaction.kind,'heart');
  assert.equal(reciprocalGreeting.data.seats[1].activity.reaction.kind,'heart');
  duplicate.ws.close(1000); students[0].peer.ws.close(1000);
  await until(() => teacher.latest?.online === 49, 'Disconnected participant remained online');
  assert.equal(teacher.latest.seats.some(s => s.number === 1), false);
  const rejoined = await connect(path, students[0].cookie);
  await until(() => rejoined.latest?.seats.some(s => s.number === 1 && s.mine), 'Reconnect must restore the original daily seat');
  assert.equal(rejoined.latest.seats.find(s => s.mine).character, 'cat');
  assert.deepEqual(rejoined.latest.seats.find(s => s.mine).avatar, avatar);
  assert.equal((await request(path, pick, students[0].cookie)).response.status, 200);
  await until(() => rejoined.latest.seats.find(s => s.mine)?.avatar === undefined &&
    teacher.latest.seats[0].avatar === undefined, 'Choosing a preset must clear the custom appearance');
  rejoined.ws.close(1000);
  await until(() => teacher.latest?.online === 49, 'Reconnected tab did not close');
  await request(path, { type: 'poll-reset', id: pollId }, host);
  await until(() => teacher.latest?.polls[0].archived, 'Archived poll missing');
  assert.equal(teacher.latest.polls[0].total, 50);

  await mf.unsafeEvictDurableObject('mamo-test', 'TestBoard', { name: 'mamo-class-board', webSockets: 'hibernate' });
  await request(path, { type: 'message', text: '휴면 후에도 연결 유지' }, host);
  await until(() => students[1].peer.latest?.messages.length === 3, 'Hibernated sockets did not resume');
  const hostMessage = students[1].peer.latest.messages.at(-1);
  assert.equal(hostMessage.author, 'host'); assert.equal(hostMessage.seatNumber, undefined);
  assert.equal(students[1].peer.latest.seats.find(s => s.mine).number, 2);
  assert.equal((await request('/api/auth', undefined, host)).data.host, true);

  for (const target of ['chat', 'mood', 'break']) assert.equal((await request(path, { type: 'room-reset', target }, students[1].cookie)).response.status, 401);
  const customPoll = await request(path, { type: 'poll-create', question: '이해하셨나요?', options: ['네', '아직요'] }, host);
  const customId = customPoll.data.polls.find(p => p.kind === 'custom').id;
  await request(path, { type: 'vote', pollId: customId, option: 1 }, students[1].cookie);
  await request(path, { type: 'pin', id: teacher.latest.messages[0].id }, host);
  assert.equal((await request(path, { type: 'room-reset', target: 'chat' }, host)).response.status, 200);
  await until(() => students[1].peer.latest?.messages.length === 0, 'Chat reset did not broadcast');
  assert.equal(students[1].peer.latest.polls.find(p => p.id === customId).total, 1);
  assert.equal((await request(path, { type: 'room-reset', target: 'mood' }, host)).response.status, 200);
  await until(() => students.every((student, i) => i === 0 || (student.peer.latest?.polls.filter(p => p.kind === 'mood').length === 1 && student.peer.latest.polls.find(p => p.kind === 'mood').total === 0)), 'Mood reset did not reach all connected students');
  const cleanMood = students[1].peer.latest.polls.find(p => p.kind === 'mood');
  assert.equal(cleanMood.myVote, null); assert.notEqual(cleanMood.id, pollId);
  assert.equal((await request(path, { type: 'vote', pollId, option: 0 }, students[1].cookie)).response.status, 409);
  await request(path, { type: 'vote', pollId: cleanMood.id, option: 2 }, students[1].cookie);
  await request(path, { type: 'message', text: '초기화 후에도 채팅 가능' }, students[1].cookie);
  assert.equal((await request(path, { type: 'room-reset', target: 'break' }, host)).response.status, 400);
  await until(() => students[1].peer.latest?.messages.length === 1, 'Chat after reset did not broadcast');
  assert.equal(students[1].peer.latest.polls.find(p => p.id === customId).myVote, 1);
  assert.equal(students[1].peer.latest.polls.find(p => p.kind === 'mood').total, 1);
  assert.equal(students[1].peer.latest.messages.length, 1); assert.equal(students[1].peer.latest.online, 49);

  const ns = await mf.getDurableObjectNamespace('CLASS_BOARD'); const stub = ns.getByName('mamo-class-board');
  const stored = async code => JSON.parse(await stub.stored(code));
  const fileStats = async code => JSON.parse(await stub.fileStats(code));
  const legacyMain = await stored('MAMOAI');
  const legacyDay = Object.values(legacyMain.days)[0];
  legacyDay.messages.push({ id: 'legacy-message', text: '브랜드 변경 전의 채팅', url: null, pinned: true, createdAt: new Date().toISOString() });
  legacyDay.polls[0].votes.fixture = 1;
  for (const oldName of ['HJSY AI Edu', 'HJSY AI edu', '현준선영 AI 교육', '수도권대기환경청 · 신현준 연구사']) {
    legacyMain.title = oldName; await stub.seed('MAMOAI', JSON.stringify(legacyMain));
    const renamed = await request('/api/rooms/MAMOAI');
    assert.equal(renamed.data.title, '신현준 연구사 AI환경연구소');
    assert.equal(renamed.data.messages[0].text, '브랜드 변경 전의 채팅');
    assert.equal(renamed.data.polls[0].total, 1);
    assert.deepEqual((await stored('MAMOAI')).days, legacyMain.days);
  }
  legacyMain.title = '강사가 정한 강의명'; await stub.seed('MAMOAI', JSON.stringify(legacyMain));
  assert.equal((await request('/api/rooms/MAMOAI')).data.title, '강사가 정한 강의명');
  assert.equal(await stub.midnightAt('2026-10-09T14:59:59Z'), Date.parse('2026-10-09T15:00:00Z'));
  assert.equal(await stub.midnightAt('2026-10-09T15:00:00Z'), Date.parse('2026-10-10T15:00:00Z'));
  const old = await stored(code); const oldDay = Object.values(old.days)[0];
  oldDay.date = '2020-01-01'; old.days = { '2020-01-01': oldDay };
  await stub.seed(code, JSON.stringify(old));
  await stub.triggerAlarm();
  await until(async () => !(await stored(code)).days['2020-01-01'], 'Alarm did not remove the previous day');
  await until(() => students[1].peer.latest?.messages.length === 0 && students[1].peer.latest?.polls[0].total === 0, 'Daily reset did not reach an open socket');
  const clean = await stored(code); assert.deepEqual(Object.keys(clean.days), [teacher.latest.today]);
  assert.equal(Object.keys(Object.values(clean.days)[0].participants).length, 49, 'Only currently connected guests start the new day seated');
  assert.equal(Object.values(clean.days)[0].characters, undefined, 'Character choices expire at Seoul midnight');
  assert.equal(students[1].peer.latest.seats.filter(s => s.mine).length, 1);
  assert((await stub.alarmTime()) > Date.now());
  await stub.seed('OLD123', JSON.stringify({ ...old, code: 'OLD123' }));
  const fresh = await request('/api/rooms/OLD123?date=2020-01-01');
  assert.equal(fresh.data.messages.length, 0); assert.equal(fresh.data.polls[0].total, 0);
  assert(!(await stored('OLD123')).days['2020-01-01']);
  assert.equal((await request(path, { type: 'message', date: '2020-01-01', text: '오래된 화면' }, host)).response.status, 409);

  // Files: permissions, real binary round trips, chunking, retries, limits and expiry.
  const payload = Uint8Array.from({ length: 1_300_123 }, (_, i) => i % 251);
  assert.equal((await upload(path, new Uint8Array([1]), students[1].cookie)).response.status, 401);
  assert.equal((await upload(path, new Uint8Array([1]), undefined)).response.status, 401);
  assert.equal((await upload(path, new Uint8Array([1]), host, { headers: { origin: 'https://other.test' } })).response.status, 403);
  assert.equal((await upload(path, new Uint8Array([1]), host, { date: '2020-01-01' })).response.status, 409);
  assert.equal((await upload(path, new Uint8Array(), host)).response.status, 400);
  assert.equal((await upload(path, new Uint8Array(10 * 1024 * 1024 + 1), host)).response.status, 413);
  const streamedOverflow = new ReadableStream({ start(controller) {
    for (let i = 0; i < 10; i++) controller.enqueue(new Uint8Array(1024 * 1024));
    controller.enqueue(new Uint8Array([1])); controller.close();
  } });
  assert.equal((await upload(path, streamedOverflow, host)).response.status, 413, 'Chunked uploads must not bypass the byte limit');
  const attached = await upload(path, payload, host, { name: '실습 "앱" 자료.zip' });
  console.log('Files: permission and size checks passed; upload saved.');
  assert.equal(attached.response.status, 200, JSON.stringify(attached.data));
  const file = attached.data.messages.at(-1).attachment;
  assert.equal(file.size, payload.length); assert.equal(file.id, attached.id);
  await until(() => students[1].peer.latest?.messages.some(m => m.attachment?.id === file.id), 'Attachment did not broadcast');
  assert.deepEqual(await fileStats(code), { files: 1, chunks: 3 });
  const retry = await upload(path, payload, host, { id: attached.id, name: file.name });
  assert.equal(retry.response.status, 200); assert.equal(retry.data.messages.filter(m => m.attachment?.id === file.id).length, 1);
  assert.equal((await upload(path, new Uint8Array([1]), host, { id: attached.id, name: file.name })).response.status, 409);
  const downloadPath = origin + path + '/files/' + file.id;
  assert.equal((await mf.dispatchFetch(downloadPath)).status, 401);
  assert.equal((await mf.dispatchFetch(downloadPath, { headers: { cookie: students[1].cookie, origin: 'https://other.test' } })).status, 403);
  assert.equal((await mf.dispatchFetch(origin + '/api/rooms/MAMOAI/files/' + file.id, { headers: { cookie: host } })).status, 404);
  const downloaded = await mf.dispatchFetch(downloadPath, { headers: { cookie: students[1].cookie } });
  assert.match(downloaded.headers.get('content-disposition'), /attachment;.*filename\*=UTF-8''/);
  assert.equal(downloaded.headers.get('content-type'), 'application/octet-stream');
  assert.equal(downloaded.headers.get('cache-control'), 'no-store');
  assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()), payload);
  console.log('Files: exact binary download passed; checking 50 simultaneous downloads.');
  const parallelDownloads = await Promise.all(Array.from({ length: 50 }, async () => {
    const response = await mf.dispatchFetch(downloadPath, { headers: { cookie: students[1].cookie } });
    assert.equal(response.status, 200); const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual(bytes, payload); return bytes.length;
  }));
  assert.equal(parallelDownloads.length, 50);
  console.log('Files: 50 downloads passed; checking deletion and daily expiry.');
  const fileMessage = attached.data.messages.at(-1);
  await request(path, { type: 'delete', id: fileMessage.id }, host);
  assert.equal((await mf.dispatchFetch(downloadPath, { headers: { cookie: host } })).status, 404);
  assert.deepEqual(await fileStats(code), { files: 0, chunks: 0 });
  const maximum = await upload(path, new Uint8Array(10 * 1024 * 1024), host);
  assert.equal(maximum.response.status, 200, 'An exact 10MiB file is allowed');
  await request(path, { type: 'delete', id: maximum.data.messages.at(-1).id }, host);
  const resetFile = await upload(path, payload, host);
  await request(path, { type: 'room-reset', target: 'mood' }, host);
  assert.equal((await fileStats(code)).files, 1);
  await request(path, { type: 'room-reset', target: 'chat' }, host);
  assert.deepEqual(await fileStats(code), { files: 0, chunks: 0 });
  assert.equal((await mf.dispatchFetch(origin + path + '/files/' + resetFile.id, { headers: { cookie: host } })).status, 404);
  const quotaId = crypto.randomUUID();
  await stub.quotaFixture(quotaId, code, clean.days[Object.keys(clean.days)[0]].date, 50 * 1024 * 1024);
  assert.equal((await upload(path, new Uint8Array([1]), host)).response.status, 409);
  await request(path, { type: 'room-reset', target: 'chat' }, host);
  const expires = await upload(path, payload, host);
  await stub.fileDate(expires.id, '2020-01-01');
  await stub.triggerAlarm();
  await until(async () => (await fileStats(code)).files === 0, 'Daily alarm did not delete file bytes');
  assert.deepEqual(await fileStats(code), { files: 0, chunks: 0 });
  assert.equal((await mf.dispatchFetch(origin + path + '/files/' + expires.id, { headers: { cookie: host } })).status, 404);
  const restartFile = await upload(path, payload, host);

  for (const ws of sockets) if (ws.readyState === 1) ws.close(1000);
  await new Promise(resolve => setTimeout(resolve, 100)); await mf.dispose();
  mf = new Miniflare(options);
  assert.equal((await request('/api/auth', undefined, host)).data.host, true, 'Signed session must survive runtime restart');
  assert.equal((await request(path)).data.polls[0].total, 0);
  const afterRestart = await mf.dispatchFetch(origin + path + '/files/' + restartFile.id, { headers: { cookie: host } });
  assert.deepEqual(new Uint8Array(await afterRestart.arrayBuffer()), payload);
  for (let i = 0; i < 8; i++) assert.equal((await request('/api/auth', { password: 'wrong' }, undefined, { 'cf-connecting-ip': '198.51.100.7' })).response.status, 401);
  assert.equal((await request('/api/auth', { password: '0423' }, undefined, { 'cf-connecting-ip': '198.51.100.7' })).response.status, 429);
  await mkdir('.local', { recursive: true });
  await writeFile('.local/worker-verification.json', JSON.stringify({ passed: true, concurrentStudents: 50,
    checks: ['signed instructor and guest cookies', 'CSRF rejection', 'host-only moderation', '50 WebSocket clients and concurrent votes', 'private question answers, edits, close, explicit publication and per-viewer real-time delivery', 'per-viewer privacy', 'duplicate tabs and disconnect counts', 'hibernation ping and eviction recovery', 'poll archive', 'distinct daily student seats and instructor messages, duplicate tabs and reconnect, host-only chat and mood resets preserve custom polls', 'stale votes rejected after reset', 'Seoul midnight scheduling', 'real alarm clears persisted data and broadcasts', 'stale-day reads expire data', 'session survives runtime restart', 'login attempt limit', 'host-only file upload and CSRF rejection', '10MiB boundary and chunked overflow rejection', 'exact binary round trip and 50 concurrent downloads', 'upload retry deduplication', 'room-scoped downloads', 'file bytes removed on deletion, chat reset and actual daily alarm', 'daily file storage quota', 'file persistence across runtime restart'] }, null, 2));
  console.log('PASS: 50 real-time clients, concurrent votes, privacy, signed auth, daily alarm, file uploads, 50 concurrent downloads, expiry, persistence and restart.');
} finally { await mf.dispose(); }
