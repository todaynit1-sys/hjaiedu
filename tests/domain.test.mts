import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureDay, mutate, newRoom, safeUrl, snapshot, today } from '../lib/domain.ts';
test('Seoul midnight deletes yesterday and resets messages, votes, presence and aliases', () => {
  assert.equal(today(new Date('2026-10-08T14:59:59Z')), '2026-10-08');
  assert.equal(today(new Date('2026-10-08T15:00:00Z')), '2026-10-09');
  const room = newRoom('수업');
  const before = ensureDay(room, '2026-10-08');
  before.polls[0].votes.guest = 2;
  before.messages.push({ id: 'old', text: '어제 채팅', url: null, pinned: true, createdAt: '2026-10-08T10:00:00Z' });
  before.presence.guest = Date.now(); before.participants = { guest: '수강생 01' }; before.active = false;
  const after = ensureDay(room, '2026-10-09');
  assert.deepEqual(after.polls[0].votes, {});
  assert.deepEqual(after.messages, []); assert.deepEqual(after.presence, {});
  assert.equal(after.participants, undefined); assert.equal(after.active, true);
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
  assert.equal(day.polls.length, 3); assert.deepEqual(day.polls.find(p => p.kind === 'mood' && !p.archived)?.votes, {});
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
  assert.equal(snapshot(room, today(), null, 'local').online, 1);
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
test('poll reset removes only its kind including history and rejects stale votes', () => {
  for (const kind of ['mood', 'break'] as const) {
    const room = newRoom('수업'); const day = ensureDay(room);
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
  }
});
test('reset requires host, validates targets and cannot clear a new day from a stale screen', () => {
  const room = newRoom('수업'); mutate(room, { type: 'message', text: '보존' }, 'guest', false);
  const before = structuredClone(room);
  for (const target of ['chat', 'mood', 'break']) assert.throws(() => mutate(room, { type: 'room-reset', target }, 'guest', false), /강사 로그인/);
  assert.throws(() => mutate(room, { type: 'room-reset', target: 'all' }, null, true), /항목/);
  assert.throws(() => mutate(room, { type: 'room-reset', target: 'chat', date: '2020-01-01' }, null, true), /지난 강의/);
  assert.deepEqual(room, before);
});
