const randomUUID = () => crypto.randomUUID();
import type { Day, Poll, PollKind, Room, Snapshot } from './types.ts';

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function newPoll(kind: PollKind, question?: string, options?: string[]): Poll {
  return {
    id: randomUUID(), kind, open: true, archived: false, votes: {},
    question: question ?? (kind === 'mood' ? '지금 컨디션 어때요?' : '잠깐 쉬었다 갈까요?'),
    options: options ?? (kind === 'mood' ? ['좋아요', '보통이에요', '조금 힘들어요'] : ['계속할 수 있어요', '쉬고 싶어요'])
  };
}
export function ensureDay(room: Room, date = today()): Day {
  // Only today's data is retained; yesterday's messages, votes and aliases expire together.
  for (const previous of Object.keys(room.days)) if (previous !== date) delete room.days[previous];
  if (!room.days[date]) room.days[date] = { date, active: true, messages: [], polls: [newPoll('mood'), newPoll('break')], presence: {} };
  return room.days[date];
}
export function newRoom(title: string, demo = false): Room {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const room: Room = { code: Array.from(bytes, b => alphabet[b % alphabet.length]).join(''), title, demo, createdAt: new Date().toISOString(), days: {} };
  ensureDay(room);
  return room;
}
export function demoRoom(): Room {
  const room = newRoom('함께 만드는 AI 활용 수업', true);
  room.code = 'DEMO26';
  const day = ensureDay(room);
  day.messages = [
    { id: randomUUID(), text: '오늘의 수업 자료 · AI 활용 가이드', url: 'https://www.notion.so/', createdAt: new Date(Date.now() - 10 * 60_000).toISOString(), pinned: true },
    { id: randomUUID(), text: '반가워요! 아래에서 오늘의 컨디션을 알려주세요. 수업 중에 공유하는 링크도 여기에서 바로 열 수 있어요.', url: null, createdAt: new Date(Date.now() - 8 * 60_000).toISOString(), pinned: false },
    { id: randomUUID(), text: '실습에서 함께 사용할 ChatGPT', url: 'https://chatgpt.com/', createdAt: new Date(Date.now() - 4 * 60_000).toISOString(), pinned: false }
  ];
  return room;
}
export function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new AppError(`${label}을(를) 1~${max}자로 입력해주세요.`);
  return value.trim();
}
export function safeUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) throw new AppError('링크 주소를 확인해주세요.');
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new AppError('http:// 또는 https://로 시작하는 링크를 입력해주세요.'); }
}
export function snapshot(room: Room, date: string, guest: string | null, mode: 'local' | 'cloud'): Snapshot {
  const day = room.days[date];
  if (!day) throw new AppError('이 날짜의 강의 기록이 없습니다.', 404);
  return {
    code: room.code, title: room.title, demo: room.demo, date, today: today(),
    active: day.active && date === today(), dates: Object.keys(room.days).sort().reverse(),
    online: date === today() ? Object.values(day.presence).filter(at => Date.now() - at < 45_000).length : 0,
    messages: day.messages.map(({ authorId, ...message }) => ({ ...message, mine: Boolean(guest && authorId === guest) })), mode, updatedAt: new Date().toISOString(),
    polls: day.polls.map(({ votes, ...poll }) => ({ ...poll, counts: poll.options.map((_, i) => Object.values(votes).filter(v => v === i).length), total: Object.keys(votes).length, myVote: guest ? votes[guest] ?? null : null }))
  };
}
export function mutate(room: Room, action: Record<string, unknown>, guest: string | null, host: boolean): void {
  const date = today();
  if (action.date !== undefined && action.date !== date) throw new AppError('지난 강의 기록은 변경할 수 없습니다.', 409);
  const day = ensureDay(room, date);
  if (action.type === 'heartbeat') {
    if (!guest) throw new AppError('먼저 강의실에 참여해주세요.', 401);
    day.presence = Object.fromEntries(Object.entries(day.presence).filter(([, at]) => Date.now() - at < 45_000));
    if (day.active) day.presence[guest] = Date.now();
    return;
  }
  if (action.type === 'vote') {
    if (!guest) throw new AppError('먼저 강의실에 참여해주세요.', 401);
    const poll = day.polls.find(p => p.id === action.pollId);
    if (!day.active || !poll?.open || poll.archived) throw new AppError('이 투표는 마감되었습니다.', 409);
    if (!Number.isInteger(action.option) || (action.option as number) < 0 || (action.option as number) >= poll.options.length) throw new AppError('응답 항목을 확인해주세요.');
    poll.votes[guest] = action.option as number;
    return;
  }
  if (action.type === 'message') {
    if (!host && !guest) throw new AppError('먼저 강의실에 참여해주세요.', 401);
    if (!day.active) throw new AppError('강의가 종료되어 채팅을 보낼 수 없습니다.', 409);
    if (day.messages.length >= 2000) throw new AppError('하루에 최대 2,000개까지 메시지를 보낼 수 있습니다.');
    if (!host && day.messages.filter(m => m.authorId === guest && Date.now() - Date.parse(m.createdAt) < 60_000).length >= 10) throw new AppError('메시지를 너무 빠르게 보내고 있어요. 잠시 후 다시 보내주세요.', 429);
    const content = text(action.text, '내용', 2000); const url = safeUrl(action.url);
    day.participants ??= {};
    if (!host && guest && !day.participants[guest]) day.participants[guest] = `수강생 ${String(Object.keys(day.participants).length + 1).padStart(2, '0')}`;
    day.messages.push({ id: randomUUID(), text: content, url, pinned: false, createdAt: new Date().toISOString(), author: host ? 'host' : 'student', authorName: host ? '강사' : day.participants[guest!], ...(host ? {} : { authorId: guest! }) });
    return;
  }
  if (!host) throw new AppError('강사 로그인이 필요합니다.', 401);
  switch (action.type) {
    case 'room-reset': {
      if (action.target === 'chat') { day.messages = []; break; }
      if (action.target !== 'mood' && action.target !== 'break') throw new AppError('초기화할 항목을 확인해주세요.');
      const kind = action.target;
      const current = day.polls.find(p => p.kind === kind && !p.archived);
      const replacement = newPoll(kind, current?.question, current ? [...current.options] : undefined);
      const position = day.polls.findIndex(p => p.kind === kind);
      // A new ID rejects delayed votes for the previous round. Only this kind is cleared.
      day.polls = day.polls.filter(p => p.kind !== kind);
      day.polls.splice(position < 0 ? day.polls.length : Math.min(position, day.polls.length), 0, replacement);
      break;
    }
    case 'pin': {
      const message = day.messages.find(m => m.id === action.id);
      if (!message) throw new AppError('게시물을 찾을 수 없습니다.', 404);
      const next = !message.pinned;
      day.messages.forEach(m => { m.pinned = m.id === action.id && next; });
      break;
    }
    case 'delete':
      if (!day.messages.some(m => m.id === action.id)) throw new AppError('게시물을 찾을 수 없습니다.', 404);
      day.messages = day.messages.filter(m => m.id !== action.id);
      break;
    case 'active':
      if (typeof action.active !== 'boolean') throw new AppError('강의 상태를 확인해주세요.');
      day.active = action.active;
      break;
    case 'poll-toggle': {
      const poll = day.polls.find(p => p.id === action.id && !p.archived);
      if (!poll) throw new AppError('투표를 찾을 수 없습니다.', 404);
      poll.open = !poll.open;
      break;
    }
    case 'poll-reset': {
      const poll = day.polls.find(p => p.id === action.id && !p.archived);
      if (!poll) throw new AppError('투표를 찾을 수 없습니다.', 404);
      if (!day.active) throw new AppError('강의를 다시 시작해주세요.', 409);
      if (day.polls.length >= 50) throw new AppError('하루에 투표를 최대 50개 만들 수 있습니다.');
      poll.open = false; poll.archived = true;
      day.polls.splice(day.polls.indexOf(poll) + 1, 0, newPoll(poll.kind, poll.question, [...poll.options]));
      break;
    }
    case 'poll-create': {
      if (!day.active) throw new AppError('강의를 다시 시작해주세요.', 409);
      if (day.polls.length >= 50) throw new AppError('하루에 투표를 최대 50개 만들 수 있습니다.');
      if (!Array.isArray(action.options) || action.options.length < 2 || action.options.length > 5) throw new AppError('응답 항목을 2~5개 입력해주세요.');
      const options = action.options.map(o => text(o, '응답 항목', 40));
      if (new Set(options).size !== options.length) throw new AppError('응답 항목이 중복되었습니다.');
      day.polls.push(newPoll('custom', text(action.question, '질문', 100), options));
      break;
    }
    default: throw new AppError('지원하지 않는 요청입니다.');
  }
}
