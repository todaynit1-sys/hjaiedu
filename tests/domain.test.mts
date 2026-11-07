import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUDITORIUM_PAGE_SIZE, auditoriumCapacity, auditoriumQuizPosition, auditoriumSeat } from '../lib/auditorium.ts';
import type { AvatarCustomization } from '../lib/avatar-customization.ts';

test('nicknames keep daily seat identity and are used for new chat messages', () => {
  const room = newRoom('닉네임 수업');
  mutate(room, { type: 'heartbeat' }, 'first', false);
  mutate(room, { type: 'heartbeat' }, 'second', false);
  mutate(room, { type: 'nickname', nickname: '  새싹이  ' }, 'first', false);
  const view = snapshot(room, today(), 'first', 'local');
  assert.equal(view.seats[0].number, 1);
  assert.equal(view.seats[0].name, '새싹이');
  assert.equal(view.seats[1].number, 2);
  mutate(room, { type: 'message', text: '반가워요' }, 'first', false);
  const message = snapshot(room, today(), 'second', 'local').messages.at(-1)!;
  assert.equal(message.authorName, '새싹이');
  assert.equal(message.seatNumber, 1);
  assert.throws(() => mutate(room, { type: 'nickname', nickname: '이름' }, null, true));
  for (const nickname of ['', ' '.repeat(2), 'a'.repeat(21), '이름\n변경']) {
    assert.throws(() => mutate(room, { type: 'nickname', nickname }, 'first', false));
  }
  assert.equal(ensureDay(room).participants?.first, '수강생 01');
});

test('movement shares only each student position and preserves assigned seats', () => {
  const room = newRoom('이동 수업');
  mutate(room, {type: 'heartbeat'}, 'a', false);
  mutate(room, {type: 'heartbeat'}, 'b', false);
  mutate(room, {type: 'move', position: {x: .25, y: .75}, guest: 'b'}, 'a', false);
  let view = snapshot(room, today(), 'b', 'local');
  assert.deepEqual(view.seats[0].position, {x: .25, y: .75});
  assert.equal(view.seats[1].position, undefined);
  assert.equal(view.seats[0].number, 1);
  for (const position of [undefined, {}, {x: NaN,y:.5}, {x:2,y:.5}, {x:.5,y:-1}, {x:'0.5',y:.5}]) {
    assert.throws(() => mutate(room, {type:'move', position}, 'a', false));
  }
  assert.throws(() => mutate(room, {type:'move', position:null}, null, true));
  mutate(room, {type:'move', position:null}, 'a', false);
  view = snapshot(room, today(), 'b', 'local');
  assert.equal(view.seats[0].position, undefined);
  assert.equal(view.seats[0].number, 1);
  mutate(room, {type:'active', active:false}, null, true);
  assert.throws(() => mutate(room, {type:'move', position:{x:.5,y:.5}}, 'a', false));
});

test('classroom activities protect roles, expire visually and keep quiz answers private until reveal', () => {
  const room = newRoom('교실 활동');
  mutate(room, {type:'heartbeat'}, 'a', false);
  mutate(room, {type:'heartbeat'}, 'b', false);
  mutate(room, {type:'hand',raised:true}, 'a', false);
  const handAt = ensureDay(room).activities!.a.handAt;
  mutate(room, {type:'hand',raised:true}, 'a', false);
  assert.equal(ensureDay(room).activities!.a.handAt, handAt);
  assert.equal(snapshot(room,today(),'b','local').seats[0].activity?.handAt,handAt);
  assert.throws(()=>mutate(room,{type:'hand-lower',seatNumber:1},'b',false));
  mutate(room,{type:'hand-lower',seatNumber:1},null,true);
  assert.equal(ensureDay(room).activities!.a.handAt,undefined);
  mutate(room,{type:'reaction',kind:'clap'},'a',false);
  assert.equal(snapshot(room,today(),'b','local').seats[0].activity?.reaction?.kind,'clap');
  assert.throws(()=>mutate(room,{type:'reaction',kind:'clap'},'a',false),/1초/);
  mutate(room,{type:'greet',seatNumber:2},'a',false);
  ensureDay(room).greetings!.a.at -= 12_000;
  mutate(room,{type:'greet',seatNumber:1},'b',false);
  assert.equal(ensureDay(room).activities!.a.reaction?.kind,'heart');
  assert.equal(ensureDay(room).activities!.b.reaction?.kind,'heart');
  assert.throws(()=>mutate(room,{type:'quiz-start',question:'문제',answer:'O'},'a',false));
  mutate(room,{type:'quiz-start',question:'AI는 도구다.',answer:'O'},null,true);
  const id = ensureDay(room).quiz!.id;
  assert.equal(snapshot(room,today(),'a','local').quiz?.answer,undefined);
  assert.throws(()=>mutate(room,{type:'quiz-answer',quizId:'old',choice:'O'},'a',false));
  mutate(room,{type:'quiz-answer',quizId:id,choice:'X'},'a',false);
  assert.equal(ensureDay(room).positions!.a.x > .5,true);
  mutate(room,{type:'move',position:{x:.2,y:.3}},'a',false);
  assert.deepEqual(snapshot(room,today(),'a','local').quiz?.counts,[1,0]);
  mutate(room,{type:'quiz-reveal',quizId:id},null,true);
  assert.equal(snapshot(room,today(),'a','local').quiz?.answer,'O');
  assert.throws(()=>mutate(room,{type:'quiz-answer',quizId:id,choice:'X'},'a',false));
  mutate(room,{type:'quiz-clear',quizId:id},null,true);
  assert.equal(ensureDay(room).quiz,undefined);
});
import { ensureDay, mutate, newRoom, safeUrl, snapshot, today } from '../lib/domain.ts';
test('Seoul midnight deletes yesterday and resets messages, votes, presence and aliases', () => {
  assert.equal(today(new Date('2026-10-08T14:59:59Z')), '2026-10-08');
  assert.equal(today(new Date('2026-10-08T15:00:00Z')), '2026-10-09');
  const room = newRoom('수업');
  const before = ensureDay(room, '2026-10-08');
  before.polls[0].votes.guest = 2;
  before.messages.push({ id: 'old', text: '어제 채팅', url: null, pinned: true, createdAt: '2026-10-08T10:00:00Z' });
  before.presence.guest = Date.now(); before.participants = { guest: '수강생 01' }; before.characters = { guest: 'cat' }; before.active = false;
  const after = ensureDay(room, '2026-10-09');
  assert.deepEqual(after.polls[0].votes, {});
  assert.deepEqual(after.messages, []); assert.deepEqual(after.presence, {});
  assert.equal(after.participants, undefined); assert.equal(after.characters, undefined); assert.equal(after.active, true);
  assert.deepEqual(Object.keys(room.days), ['2026-10-09']);
  assert.equal(JSON.stringify(room).includes('어제 채팅'), false);
  assert.throws(() => snapshot(room, '2026-10-08', null, 'local'), /기록이 없습니다/);
});
test('changing the same browser vote preserves one response and hides identities', () => {
  const room = newRoom('수업'); const day = ensureDay(room); const id = day.polls[0].id;
  mutate(room, { type: 'vote', pollId: id, option: 0 }, 'guest-1', false);
  mutate(room, { type: 'vote', pollId: id, option: 2 }, 'guest-1', false);
  mutate(room, { type: 'vote', pollId: id, option: 1 }, 'guest-2', false);
  const value = snapshot(room, today(), 'guest-1', 'local');
  assert.equal(value.polls[0].total, 2); assert.deepEqual(value.polls[0].counts, [0, 1, 1]); assert.equal(value.polls[0].myVote, 2);
  assert.equal(JSON.stringify(value).includes('guest-1'), false);
  assert.equal('votes' in value.polls[0], false); assert.equal('presence' in value, false);
});
test('repeated visits during one day preserve messages, votes and poll IDs', () => {
  const room = newRoom('수업'); const day = ensureDay(room); const id = day.polls[0].id;
  mutate(room, { type: 'message', text: '오늘 채팅' }, 'guest', false);
  mutate(room, { type: 'vote', pollId: id, option: 1 }, 'guest', false);
  ensureDay(room); ensureDay(room);
  assert.equal(room.days[today()].messages[0].text, '오늘 채팅');
  assert.equal(room.days[today()].polls[0].id, id);
  assert.equal(room.days[today()].polls[0].votes.guest, 1);
});
test('students can chat with server assigned aliases but cannot moderate', () => {
  const room = newRoom('수업'); const day = ensureDay(room);
  for (const type of ['pin', 'delete', 'active', 'poll-create']) assert.throws(() => mutate(room, { type, text: 'hello' }, 'student', false), /강사 로그인/);
  mutate(room, { type: 'message', text: '질문 있어요', author: 'host', authorName: '강사' }, 'student', false);
  mutate(room, { type: 'message', text: '한 번 더요' }, 'student', false);
  const value = snapshot(room, today(), 'student', 'local');
  assert.equal(value.messages[0].author, 'student'); assert.equal(value.messages[0].authorName, '수강생 01');
  assert.equal(value.messages[1].authorName, '수강생 01'); assert.equal(value.messages[0].mine, true);
  assert.equal('authorId' in value.messages[0], false); assert.equal('participants' in value, false);
  mutate(room, { type: 'poll-toggle', id: day.polls[0].id }, null, true);
  assert.throws(() => mutate(room, { type: 'vote', pollId: day.polls[0].id, option: 0 }, 'student', false), /마감/);
  assert.throws(() => mutate(room, { type: 'message', text: 'hi', date: '2020-01-01' }, null, true), /지난 강의/);
});
test('guest chat is rate limited and rejects ended sessions', () => {
  const room = newRoom('수업');
  for (let i = 0; i < 10; i++) mutate(room, { type: 'message', text: '안녕하세요' }, 'guest', false);
  assert.throws(() => mutate(room, { type: 'message', text: '한 번 더' }, 'guest', false), /너무 빠르게/);
  mutate(room, { type: 'active', active: false }, null, true);
  assert.throws(() => mutate(room, { type: 'message', text: '끝' }, 'another', false), /종료/);
});
test('a fresh poll archives its results instead of deleting them', () => {
  const room = newRoom('수업'); const day = ensureDay(room); const old = day.polls[0];
  mutate(room, { type: 'vote', pollId: old.id, option: 0 }, 'guest', false);
  mutate(room, { type: 'poll-reset', id: old.id }, null, true);
  assert.equal(old.archived, true); assert.equal(old.open, false); assert.equal(old.votes.guest, 0);
  assert.equal(day.polls.length, 2); assert.deepEqual(day.polls.find(p => p.kind === 'mood' && !p.archived)?.votes, {});
});
test('only safe link protocols are accepted and text remains text', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'https://user:pass@example.com', 'not a url']) assert.throws(() => safeUrl(url));
  assert.equal(safeUrl('https://example.com/path'), 'https://example.com/path');
  const room = newRoom('수업'); mutate(room, { type: 'message', text: '<script>test</script>' }, null, true);
  assert.equal(ensureDay(room).messages[0].text, '<script>test</script>');
});
test('presence deduplicates browser tabs and expires after 45 seconds', () => {
  const room = newRoom('수업'); const day = ensureDay(room);
  mutate(room, { type: 'heartbeat' }, 'guest', false); mutate(room, { type: 'heartbeat' }, 'guest', false);
  day.presence.old = Date.now() - 46_000;
  const view = snapshot(room, today(), 'guest', 'local');
  assert.equal(view.online, 1);
  assert.deepEqual(view.seats, [{ number: 1, name: '수강생 01', mine: true, character: 'smile' }]);
});
test('a signed student selects only their own character and it survives chat reset', () => {
  const room = newRoom('수업');
  for (const id of ['one', 'two']) mutate(room, { type: 'heartbeat' }, id, false);
  const change = { type: 'character', character: 'cat', guest: 'two', seatNumber: 2 };
  assert.throws(() => mutate(room, change, null, false), /참여/);
  assert.throws(() => mutate(room, change, 'one', true), /수강생만/);
  assert.throws(() => mutate(room, { ...change, character: 'custom' }, 'one', false), /목록/);
  mutate(room, change, 'one', false);
  mutate(room, { type: 'room-reset', target: 'chat' }, null, true);
  const view = snapshot(room, today(), 'two', 'local');
  assert.deepEqual(view.seats.map(seat => seat.character), ['cat', 'sprout']);
  assert.equal('characters' in view, false);
  mutate(room, { type: 'active', active: false }, null, true);
  assert.throws(() => mutate(room, change, 'one', false), /강의실에 입장/);
});
test('avatar customization shares validated options for the signed seat and returns to the legacy preset', () => {
  const room = newRoom('캐릭터 꾸미기');
  for (const guest of ['one', 'two']) mutate(room, { type: 'heartbeat' }, guest, false);
  const avatar: AvatarCustomization = {
    hair: 'waves', hairColor: 'brown', skin: 'peach', expression: 'smile',
    clothing: 'cardigan', clothingColor: 'sky', accessory: 'glasses'
  };
  const change = { type: 'avatar-customize', avatar: { ...avatar, markup: '<svg>' }, guest: 'two', seatNumber: 2 };
  assert.throws(() => mutate(room, change, null, false), /참여/);
  assert.throws(() => mutate(room, change, 'one', true), /수강생만/);
  assert.throws(() => mutate(room, change, 'unknown', false), /강의실에 입장/);
  assert.throws(() => mutate(room, { ...change, avatar: { hair: 'waves' } }, 'one', false), /꾸미기 항목/);
  assert.throws(() => mutate(room, { ...change, avatar: { ...avatar, hairColor: '<img>' } }, 'one', false), /꾸미기 항목/);
  mutate(room, change, 'one', false);
  const view = snapshot(room, today(), 'two', 'local');
  assert.deepEqual(view.seats[0].avatar, avatar);
  assert.equal(view.seats[1].avatar, undefined);
  assert.equal('avatars' in view, false);
  mutate(room, { type: 'character', character: 'cat' }, 'one', false);
  const seat = snapshot(room, today(), 'one', 'local').seats[0];
  assert.equal(seat.character, 'cat');
  assert.equal(seat.avatar, undefined);
  mutate(room, { type: 'active', active: false }, null, true);
  assert.throws(() => mutate(room, change, 'one', false), /강의실에 입장/);
});
test('chat reset clears messages and pins while preserving votes, aliases and presence', () => {
  const room = newRoom('수업'); const day = ensureDay(room);
  mutate(room, { type: 'message', text: '질문' }, 'guest', false);
  mutate(room, { type: 'pin', id: day.messages[0].id }, null, true);
  mutate(room, { type: 'vote', pollId: day.polls[0].id, option: 1 }, 'guest', false);
  mutate(room, { type: 'heartbeat' }, 'guest', false);
  const polls = structuredClone(day.polls); const presence = structuredClone(day.presence);
  mutate(room, { type: 'room-reset', target: 'chat' }, null, true);
  assert.deepEqual(day.messages, []); assert.deepEqual(day.polls, polls); assert.deepEqual(day.presence, presence);
  assert.equal(day.participants?.guest, '수강생 01'); assert.equal(day.active, true);
  mutate(room, { type: 'message', text: '초기화 후 질문' }, 'guest', false);
  assert.equal(day.messages[0].authorName, '수강생 01');
});
test('mood reset removes its history, preserves custom polls and rejects stale votes', () => {
  const kind = 'mood';
  const room = newRoom('수업'); const day = ensureDay(room);
  mutate(room, { type: 'poll-create', question: '준비됐나요?', options: ['네', '아직'] }, null, true);
  const initial = day.polls.find(p => p.kind === kind)!; const other = day.polls.find(p => p.kind !== kind)!;
  mutate(room, { type: 'vote', pollId: initial.id, option: 0 }, 'guest', false);
  mutate(room, { type: 'vote', pollId: other.id, option: 1 }, 'guest', false);
  mutate(room, { type: 'poll-reset', id: initial.id }, null, true);
  const current = day.polls.find(p => p.kind === kind && !p.archived)!;
  mutate(room, { type: 'vote', pollId: current.id, option: 1 }, 'guest', false);
  mutate(room, { type: 'message', text: '남겨둘 채팅' }, 'guest', false);
  mutate(room, { type: 'room-reset', target: kind }, null, true);
  const clean = day.polls.find(p => p.kind === kind)!;
  assert.equal(day.polls.filter(p => p.kind === kind).length, 1);
  assert.notEqual(clean.id, current.id); assert.deepEqual(clean.options, current.options);
  assert.equal(clean.question, current.question); assert.equal(clean.open, true); assert.equal(clean.archived, false);
  assert.deepEqual(clean.votes, {}); assert.equal(other.votes.guest, 1); assert.equal(day.messages[0].text, '남겨둘 채팅');
  assert.equal(snapshot(room, today(), 'guest', 'local').polls.find(p => p.id === clean.id)?.myVote, null);
  assert.throws(() => mutate(room, { type: 'vote', pollId: current.id, option: 0 }, 'guest', false), /마감/);
  mutate(room, { type: 'vote', pollId: clean.id, option: 0 }, 'guest', false);
  assert.equal(clean.votes.guest, 0);
});
test('opening an existing day retires only built-in break polls including archived rounds', () => {
  const room = newRoom('수업'); const day = ensureDay(room);
  const savedMood = structuredClone(day.polls[0]);
  const custom = { ...savedMood, kind: 'custom' as const, question: '잠깐 쉬었다 갈까요?', id: 'my-custom-poll' };
  day.polls.push({ ...savedMood, id: 'break-old', kind: 'break', archived: true }, custom, { ...savedMood, id: 'break-live', kind: 'break' });
  ensureDay(room);
  assert.deepEqual(day.polls, [savedMood, custom]);
  assert.throws(() => mutate(room, { type: 'room-reset', target: 'break' }, null, true), /항목/);
});
test('reset requires host, validates targets and cannot clear a new day from a stale screen', () => {
  const room = newRoom('수업'); mutate(room, { type: 'message', text: '보존' }, 'guest', false);
  const before = structuredClone(room);
  for (const target of ['chat', 'mood', 'break']) assert.throws(() => mutate(room, { type: 'room-reset', target }, 'guest', false), /강사 로그인/);
  assert.throws(() => mutate(room, { type: 'room-reset', target: 'all' }, null, true), /항목/);
  assert.throws(() => mutate(room, { type: 'room-reset', target: 'chat', date: '2020-01-01' }, null, true), /지난 강의/);
  assert.deepEqual(room, before);
});

test('auditorium expands from twenty to fifty seats in five straight rows with an aisle', () => {
  assert.equal(AUDITORIUM_PAGE_SIZE, 50);
  for (const [highest, expected] of [[0, 20], [1, 20], [20, 20], [21, 30], [30, 30], [31, 40], [40, 40], [41, 50], [50, 50], [500, 50]]) {
    assert.equal(auditoriumCapacity(highest), expected);
  }
  for (const capacity of [20, 30, 40, 50]) {
    const seats = Array.from({ length: capacity }, (_, index) => auditoriumSeat(index, capacity));
    assert.equal(new Set(seats.map(seat => `${seat.x}/${seat.y}`)).size, capacity);
    assert(seats.every(seat => seat.x >= .06 && seat.x <= .94 && seat.y >= .08 && seat.y <= .92));
    for (let row = 0; row < 5; row++) {
      const current = seats.filter(seat => seat.row === row);
      assert.equal(current.length, capacity / 5);
      assert(current.every(seat => seat.y === current[0].y));
      assert.equal(current.filter(seat => seat.x <= .4).length, capacity / 10);
      assert.equal(current.filter(seat => seat.x >= .6).length, capacity / 10);
      if (row > 0) assert(current[0].y > seats.find(seat => seat.row === row - 1)!.y);
    }
  }
});

test('fifty OX participants have unique positions per side without renumbering overflow aliases', () => {
  for (const choice of ['O', 'X'] as const) {
    const positions = Array.from({ length: 50 }, (_, index) => auditoriumQuizPosition(index + 1, choice));
    assert.equal(new Set(positions.map(position => `${position.x}/${position.y}`)).size, 50);
    assert(positions.every(position => position.x >= .06 && position.x <= .94 && position.y >= .08 && position.y <= .92));
    assert(positions.every(position => choice === 'O' ? position.x < .5 : position.x > .5));
  }
  const room = newRoom('쉰 명 이후의 재입장');
  for (let index = 1; index <= 51; index++) mutate(room, { type: 'heartbeat' }, `guest-${index}`, false);
  mutate(room, { type: 'quiz-start', question: '좌석 번호는 유지되나요?', answer: 'O' }, null, true);
  const id = ensureDay(room).quiz!.id;
  mutate(room, { type: 'quiz-answer', quizId: id, choice: 'O' }, 'guest-51', false);
  const mine = snapshot(room, today(), 'guest-51', 'local').seats.find(seat => seat.mine)!;
  assert.equal(mine.number, 51);
  assert.equal(mine.name, '수강생 51');
  assert.deepEqual(mine.position, auditoriumQuizPosition(1, 'O'));
});
