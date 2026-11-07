import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { Check, ChevronLeft, ChevronRight, Pencil, Smile, X } from 'lucide-react';
import { Chalkboard } from './chalkboard';
import { AvatarArt } from './classroom-avatar';
import { INSTRUCTOR_HOME, useClassroomMovement, useWanderClock, wanderingPosition } from './classroom-movement';
import { WalkingAvatar } from './walking-avatar';
import { ActivityBadge, ClassroomActivities, type ClassroomAction } from './classroom-activities';
import { AuditoriumArt } from './auditorium-art';
import { AuditoriumRenderer, type AuditoriumProjection } from './auditorium-renderer';
import { AUDITORIUM_PAGE_SIZE, AUDITORIUM_SCREEN, auditoriumCapacity, auditoriumSeat } from '../lib/auditorium';
import { CHARACTERS, defaultCharacter, type Character, type ClassroomMove, type PublicMessage, type Snapshot } from '../lib/types';
import '../app/classroom-scene.css';
import '../app/auditorium.css';

const PAGE_SIZE = AUDITORIUM_PAGE_SIZE;
const BUBBLE_TIME = 18_000;
const seatLabel = (number: number) => String(number).padStart(2, '0');
const seatPage = (number: number) => Math.floor((number - 1) / PAGE_SIZE);

function DeskIcon() {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5.5 12V6.5c0-1.4.9-2.5 2.5-2.5h8c1.6 0 2.5 1.1 2.5 2.5V12M5 16.5l-1 3m14.5-3 1 3M9 16.5v2m6-2v2" />
    <rect x="3" y="11.8" width="18" height="4.7" rx="1.8" />
  </svg>;
}

const characterNames: Record<Character, string> = {
  smile: '방긋이', sprout: '새싹이', cheer: '신난이', glasses: '동글안경', sleepy: '꾸벅이', cat: '고양이',
  rabbit: '쫑긋토끼', puppy: '멍뭉이', frog: '개굴이', bear: '곰곰이', penguin: '뒤뚱펭귄',
  hamster: '볼빵햄찌', seal: '물범콩', mushroom: '버섯송이', acorn: '도토리', cloud: '몽실구름',
  chick: '삐약이', otter: '수달이', panda: '판다콩', axolotl: '아기우파'
};

function CharacterPicker({ current, onChange, onClose }: { current: Character; onChange: (value: Character) => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  async function choose(value: Character) {
    if (inFlight.current) return;
    if (value === current) { onClose(); return; }
    inFlight.current = true;
    setSaving(true); setError('');
    try { await onChange(value); onClose(); }
    catch (cause) {
      inFlight.current = false; setSaving(false);
      setError(cause instanceof Error ? cause.message : '저장하지 못했어요. 다시 골라주세요.');
    }
  }
  return <dialog ref={dialog} className="classroom-character-dialog" aria-labelledby="character-picker-title" aria-describedby="character-picker-hint" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="classroom-picker-heading"><h2 id="character-picker-title">캐릭터 선택</h2><button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="캐릭터 선택 닫기"><X size={20} /></button></div>
    <p id="character-picker-hint">{CHARACTERS.length}명 중 내 책상에 앉을 친구를 골라주세요.</p>
    <div className="classroom-character-options" role="group" aria-label="캐릭터" aria-busy={saving}>
      {CHARACTERS.map(value => <button type="button" key={value} aria-pressed={current === value} disabled={saving} onClick={() => choose(value)}>
        {current === value && <Check className="classroom-character-check" size={15} aria-hidden="true" />}
        <svg viewBox="16 0 58 53" aria-hidden="true"><AvatarArt character={value} pose="portrait" /></svg>
        <span>{characterNames[value]}</span>
      </button>)}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
  </dialog>;
}

function NicknameDialog({ current, onSave, onClose }: { current: string; onSave: (nickname: string) => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [nickname, setNickname] = useState(current);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    element?.querySelector('input')?.select();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true); setError('');
    try { await onSave(nickname.trim()); onClose(); }
    catch (cause) {
      inFlight.current = false; setSaving(false);
      setError(cause instanceof Error ? cause.message : '닉네임을 저장하지 못했어요. 다시 시도해주세요.');
    }
  }
  return <dialog ref={dialog} className="classroom-character-dialog classroom-nickname-dialog" aria-labelledby="nickname-title"
    onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="classroom-picker-heading"><h2 id="nickname-title">닉네임 설정</h2><button className="icon-button" type="button" disabled={saving} onClick={onClose} aria-label="닉네임 설정 닫기"><X size={20} /></button></div>
    <form onSubmit={save}>
      <label htmlFor="classroom-nickname">수업에서 사용할 이름</label>
      <input id="classroom-nickname" value={nickname} onChange={event => setNickname(event.target.value)} maxLength={20} required disabled={saving}
        autoComplete="nickname" aria-describedby="nickname-hint" aria-invalid={Boolean(error)} />
      <p id="nickname-hint">1~20자 · 오늘 수업의 채팅과 내 자리에 표시돼요.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={saving || !nickname.trim()}>{saving ? '저장 중' : '저장하기'}</button>
    </form>
  </dialog>;
}

function DeskDrawing({ number, character, mine, name }: { number: number; character?: Character; mine: boolean; name?: string }) {
  const nickname = name && name !== `수강생 ${seatLabel(number)}` ? name : '';
  const label = Array.from(nickname);
  return <svg className="classroom-desk" data-nickname={nickname || undefined} viewBox="0 0 90 78" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <g className="auditorium-seat-base">
    <ellipse cx="45" cy="67" rx="25" ry="5" fill="#283452" opacity=".1" stroke="none"/>
    <path d="M25 43V31q0-7 7-7h26q7 0 7 7v12Z" className="classroom-empty-chair"/>
    <path d="m19 52-2 13m54-13 2 13M25 55v8m40-8v8" stroke="#6c583e" strokeWidth="3"/>
    <path d="M16 44l5-6h48l5 6v9H16Z" className="classroom-desk-front"/>
    <path d="M16 44h58" stroke="#ad7949"/>
    </g>
    {character && <g key={character} className="classroom-arrival">
      <g className="classroom-head"><AvatarArt character={character} pose="seated" /></g>
    </g>}
    <text x="45" y="75" textAnchor="middle" fill="currentColor" stroke="none" fontSize={nickname ? 10 : 11} fontWeight="750">{nickname ? label.slice(0, 5).join('') + (label.length > 5 ? '…' : '') : seatLabel(number)}</text>
    {mine && <ellipse cx="45" cy="57" rx="29" ry="12" stroke="#72cff4" strokeWidth="3.4"/>}
  </svg>;
}

function WalkerBody({ character, mine, instructor }: { character: Character; mine?: boolean; instructor?: boolean }) {
  return <svg viewBox="16 -2 60 70" aria-hidden="true">
    <ellipse cx="45" cy="61" rx="18" ry="5" fill="#372318" opacity=".24"/>
    {mine && <ellipse cx="45" cy="61" rx="21" ry="6" fill="#72cff430" stroke="#ecfcff" strokeWidth="3.5"/>}
    {mine && <ellipse cx="45" cy="61" rx="21" ry="6" fill="none" stroke="#55c4ed" strokeWidth="1.5"/>}
    <AvatarArt character={character} pose="walking" instructor={instructor} />
  </svg>;
}

// Use the server timestamp so a phone with a different clock still sees live bubbles.
function useSeatBubbles(data: Snapshot) {
  const clockOffset = useMemo(() => Date.parse(data.updatedAt) - Date.now(), [data.updatedAt]);
  const [, tick] = useReducer((value: number) => value + 1, 0);
  const now = Date.now() + clockOffset;
  const bubbles = new Map<number, PublicMessage>();
  let nextExpiry = Infinity;
  for (const message of data.messages) {
    if (message.author !== 'student' || !message.seatNumber) continue;
    const expires = Date.parse(message.createdAt) + BUBBLE_TIME;
    if (expires > now) {
      bubbles.set(message.seatNumber, message);
      nextExpiry = Math.min(nextExpiry, expires);
    }
  }
  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return;
    const timer = window.setTimeout(tick, Math.max(1, nextExpiry - Date.now() - clockOffset + 1));
    return () => clearTimeout(timer);
  }, [clockOffset, nextExpiry]);
  return bubbles;
}

export function ClassroomScene({ data, onCharacterChange, onNicknameChange, onMove, host = false, visible, onActivity }: { data: Snapshot; onCharacterChange?: (value: Character) => Promise<void>; onNicknameChange?: (nickname: string) => Promise<void>; onMove?: (move: ClassroomMove) => Promise<void>; host?: boolean; visible: boolean; onActivity?: ClassroomAction }) {
  const seats = data.seats ?? [];
  const mySeat = seats.find(seat => seat.mine);
  const [choosingCharacter, setChoosingCharacter] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [activityError, setActivityError] = useState('');
  async function greet(number: number) {
    if (!onActivity) return;
    setActivityError('');
    try { await onActivity({type:'greet',seatNumber:number}); }
    catch (cause) { setActivityError(cause instanceof Error ? cause.message : '인사를 다시 보내주세요.'); }
  }
  const pages = [...new Set([0, ...seats.map(seat => seatPage(seat.number))])].sort((a, b) => a - b);
  const [selectedPage, setSelectedPage] = useState<{ roomDay: string; page: number } | null>(null);
  const roomDay = `${data.code}/${data.date}`;
  const viewport = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'overview' | 'near'>('overview');
  const [projection, setProjection] = useState<AuditoriumProjection | null>(null);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => element.style.setProperty('--available-height', element.clientHeight+'px'));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const page = selectedPage?.roomDay === roomDay && pages.includes(selectedPage.page)
    ? selectedPage.page : mySeat ? seatPage(mySeat.number) : 0;
  const pageIndex = pages.indexOf(page);
  const ownMotion = host ? data.instructor : mySeat;
  const onOwnPage = host || Boolean(mySeat && seatPage(mySeat.number) === page);
  const canMoveHere = Boolean(onMove && ownMotion && onOwnPage);
  const firstSeat = page * PAGE_SIZE + 1;
  const pageSeats = seats.filter(seat => seatPage(seat.number) === page);
  const capacity = auditoriumCapacity(Math.max(1, ...pageSeats.map(seat => seat.number - page * PAGE_SIZE)));
  const world = projection?.seats.length === capacity ? projection : null;
  const seatPoint = (index: number) => world?.seats[index] ?? auditoriumSeat(index, capacity);
  const wandering = data.active;
  const now = useWanderClock(visible && wandering && Boolean(data.instructor?.wanderSince || pageSeats.some(seat => seat.wanderSince)), data.updatedAt);
  const wander = (since: number | undefined, home: {x: number; y: number}, number: number) =>
    wandering ? wanderingPosition(since, now, home, number) : undefined;
  const ownNumber = host ? 0 : mySeat?.number ?? 0;
  const ownHome = host ? INSTRUCTOR_HOME : onOwnPage ? seatPoint(ownNumber - firstSeat) : {x: .5, y: .5};
  const movement = useClassroomMovement(roomDay, ownMotion, ownHome,
    wander(ownMotion?.wanderSince, ownHome, ownNumber), canMoveHere ? onMove : undefined);
  const instructorPosition = host ? movement.position : wander(data.instructor?.wanderSince, INSTRUCTOR_HOME, 0) ?? data.instructor?.position;
  const studentPositions = new Map(pageSeats.map(seat => [seat.number, seat.mine ? movement.position :
    wander(seat.wanderSince, seatPoint(seat.number - firstSeat), seat.number) ?? seat.position]));
  const headsInteractive = view === 'near';
  function centerNearView() {
    if (!viewport.current || !movement.floor.current) return;
    const point = onOwnPage ? movement.position ?? ownHome : {x: .5, y: .5};
    const field = movement.floor.current;
    const visibleFloor = viewport.current;
    visibleFloor.scrollTo({left: point.x * field.clientWidth - visibleFloor.clientWidth / 2,
      top: point.y * field.clientHeight - visibleFloor.clientHeight / 2, behavior: 'instant'});
  }
  useLayoutEffect(() => {
    if (view === 'near') centerNearView();
  }, [view, page, roomDay, capacity, mySeat?.number, world?.width, world?.height]);
  const bubbles = useSeatBubbles(data);
  // Old instructor posts and the seeded demo cards predate the author field.
  const teacher = data.messages.reduce<PublicMessage | undefined>(
    (latest, message) => message.author === 'student' ? latest : message, undefined);
  const currentQuestion = data.questionRound?.open ? data.questionRound : undefined;
  const messageKey = `${currentQuestion?.id ?? teacher?.id ?? 'welcome'}/${world?.width ?? 'fallback'}x${world?.height ?? ''}`;
  const boardExpanded = expandedMessage === messageKey;
  const recordExpansion = useCallback((expanded: boolean) => {
    if (expanded) setExpandedMessage(messageKey);
  }, [messageKey]);
  const latest = data.messages.at(-1);
  const turnPage = (offset: number) => setSelectedPage({ roomDay, page: pages[pageIndex + offset] });
  const screenBounds = world?.screen ?? AUDITORIUM_SCREEN;
  const screenStyle = {
    left:`${screenBounds.left*100}%`, top:`${screenBounds.top*100}%`, width:`${screenBounds.width*100}%`,
    '--screen-height': `${screenBounds.height*100}cqh`
  } as CSSProperties;
  const screen = <div className={`auditorium-stage world-screen${boardExpanded ? ' is-expanded' : ''}`} style={screenStyle}>
    <Chalkboard message={currentQuestion ? {id: currentQuestion.id, text: currentQuestion.prompt, createdAt: data.updatedAt, pinned: false, url: null, mine: false, author: 'host'} : teacher}
      code={data.code} active={data.active} onExpanded={recordExpansion}/>
  </div>;

  return <section className="classroom-scene auditorium-scene" data-world={world ? 'ready' : 'fallback'} aria-labelledby="classroom-title">
    <div className="auditorium-topbar">
    <div className="classroom-scene-heading"><h2 id="classroom-title"><DeskIcon />AI 강의실</h2></div>
    <div className="auditorium-toolbar"><span>{canMoveHere && movement.autonomous ? '자율 이동 중' : canMoveHere && movement.moving ? '바닥을 눌러 이동' : view === 'near' ? '밀어서 둘러보기' : `3D 교실 · ${capacity}석`}</span>
      <div role="group" aria-label="교실 보기">
        <button type="button" aria-pressed={view === 'overview'} onClick={() => setView('overview')}>전체 보기</button>
        <button type="button" aria-pressed={view === 'near'} title="캐릭터를 크게 보고 눌러 인사하기" onClick={() => { if (view === 'near') centerNearView(); else setView('near'); }}>내 주변</button>
      </div>
    </div>
    </div>
    <span className="sr-only classroom-mobile-announcement" role="status">{latest && `${latest.authorName ?? '강사'}: ${latest.text}`}</span>
    {boardExpanded && screen}
    <p id="auditorium-view-hint" className="sr-only">내 주변에서는 화면을 밀어 둘러보고 캐릭터를 눌러 인사할 수 있어요.</p>
    <div ref={viewport} className="auditorium-viewport" data-view={view} aria-label="교실 좌석" aria-describedby="auditorium-view-hint" role="region">
    <div ref={movement.floor} className="classroom-floor" data-moving={canMoveHere && (movement.moving || movement.autonomous) || undefined}
      style={{'--auditorium-columns':capacity / 5} as CSSProperties}
      role="group" aria-label="캐릭터 이동 영역" aria-describedby={onMove ? 'classroom-move-hint' : undefined}
      tabIndex={canMoveHere ? 0 : undefined} onClick={canMoveHere ? movement.click : undefined} onKeyDown={canMoveHere ? movement.keyDown : undefined}>
    <AuditoriumRenderer capacity={capacity} onLayout={setProjection}/>
    {!world && <AuditoriumArt/>}
    {!boardExpanded && screen}
    <ol className="classroom-seats" aria-label={`강의실 좌석 ${firstSeat}번부터 ${firstSeat + capacity - 1}번까지`} start={firstSeat}>
      {Array.from({ length: capacity }, (_, index) => {
        const number = firstSeat + index;
        const seat = seats.find(item => item.number === number);
        const bubble = seat && bubbles.get(number);
        const character = seat && (seat.character ?? defaultCharacter(number));
        const walking = Boolean(studentPositions.get(number));
        const point = seatPoint(index);
        return <li key={number} data-character={character} title={seat?.name}
          style={{left:`${point.x * 100}%`,top:`${point.y * 100}%`,zIndex:Math.round(point.y*100),
            ...(world ? {width:`${world.seats[index].scale*100}%`} : {})}}
          className={`classroom-seat${seat ? ' is-occupied' : ''}${seat?.mine ? ' is-mine' : ''}`}>
          <span className="sr-only">{seatLabel(number)}번 {seat ? seat.name : '빈 자리'}{character && ', ' + characterNames[character]}{seat?.mine ? ', 내 자리' : ''}</span>
          <div className="classroom-desk-wrap">
            {bubble && !walking && <div className="classroom-seat-bubble" key={bubble.id} title={bubble.text}><span>{bubble.text}</span></div>}
            <DeskDrawing number={number} character={walking ? undefined : character} mine={Boolean(seat?.mine)} name={seat?.name} />
            {world && <span className="auditorium-seat-caption" aria-hidden="true">{seat?.name && seat.name !== `수강생 ${seatLabel(number)}` ? seat.name : seatLabel(number)}</span>}
            {seat && !walking && <ActivityBadge seat={seat} updatedAt={data.updatedAt}/>}
            {headsInteractive && seat && !seat.mine && !walking && !host && onActivity && <button className="classroom-desk-hit classroom-greet-hit" type="button" aria-label={`${seat.name}에게 인사하기`}
              onClick={event => { event.stopPropagation(); void greet(seat.number); }}/>}
            {seat?.mine && canMoveHere && !walking && <button className="classroom-desk-hit" type="button" aria-label="내 캐릭터 일어나기"
              title="일어나서 움직이기" onClick={event => {event.stopPropagation(); movement.toggle();}} />}
          </div>
        </li>;
      })}
    </ol>
    {data.instructor && <WalkingAvatar position={instructorPosition ?? INSTRUCTOR_HOME} origin={INSTRUCTOR_HOME}
      floor={movement.floor} mine={host} instructor name="강사">
      <WalkerBody character="glasses" mine={host} instructor />
      <span className="classroom-walker-name">강사</span>
      {host && canMoveHere && !movement.moving && !movement.autonomous && <button className="classroom-walker-greet" type="button"
        aria-label="강사 캐릭터 움직이기" onClick={event => { event.stopPropagation(); movement.toggle(); }} />}
    </WalkingAvatar>}
    {pageSeats.map(seat => {
      const position = studentPositions.get(seat.number);
      if (!position) return null;
      const bubble = bubbles.get(seat.number);
      const index = seat.number - firstSeat;
      return <WalkingAvatar key={seat.number} position={position} origin={seatPoint(index)}
        floor={movement.floor} mine={seat.mine} number={seat.number} name={seat.name}>
        {bubble && <div className="classroom-seat-bubble" key={bubble.id}><span>{bubble.text}</span></div>}
        <WalkerBody character={seat.character ?? defaultCharacter(seat.number)} mine={seat.mine} />
        <span className="classroom-walker-name">{seat.name}</span>
        <ActivityBadge seat={seat} updatedAt={data.updatedAt}/>
        {headsInteractive && !seat.mine && !host && onActivity && <button className="classroom-walker-greet" type="button" aria-label={`${seat.name}에게 인사하기`}
          onClick={event=>{event.stopPropagation(); void greet(seat.number);}}/>}
      </WalkingAvatar>;
    })}
    </div>
    </div>
    <div className="classroom-seating-footer">
      <div className="classroom-seat-info">{mySeat && <span className="classroom-own-seat" title={mySeat.name}>내 자리 <b>{seatLabel(mySeat.number)}</b></span>}
        {mySeat && onNicknameChange && <button className="classroom-character-trigger" type="button" aria-label="닉네임 설정" aria-haspopup="dialog" onClick={() => setEditingNickname(true)}><Pencil size={15} aria-hidden="true" />닉네임</button>}
        {mySeat && onCharacterChange && <button className="classroom-character-trigger" type="button" aria-label="캐릭터 선택" aria-haspopup="dialog" onClick={() => setChoosingCharacter(true)}><Smile size={15} aria-hidden="true" />캐릭터</button>}
        {canMoveHere && <>
          <button className="classroom-character-trigger" type="button" onClick={movement.toggle}>
            {movement.moving || movement.autonomous ? host ? '칠판 앞으로' : '내 자리로' : '움직이기'}
          </button>
          <select className="classroom-move-mode" aria-label="캐릭터 이동 방식"
            value={movement.autonomous ? 'wander' : 'manual'}
            onChange={event => movement.selectMode(event.target.value === 'wander' ? 'wander' : 'manual')}>
            <option value="manual">직접 조종</option>
            <option value="wander">자율 이동</option>
          </select>
        </>}
        <ClassroomActivities data={data} host={host} onAction={onActivity} renderHead={character=><AvatarArt character={character} pose="portrait"/>}/>
        <span className="classroom-student-count">수강생 {seats.length}명</span>
      </div>
      {pages.length > 1 && <div className="classroom-page-controls" role="group" aria-label="좌석 범위 선택">
        <button type="button" aria-label="앞 좌석 보기" disabled={pageIndex === 0} onClick={() => turnPage(-1)}><ChevronLeft size={17} aria-hidden="true" /></button>
        <span aria-live="polite">{seatLabel(firstSeat)}–{seatLabel(firstSeat + capacity - 1)}</span>
        <button type="button" aria-label="뒤 좌석 보기" disabled={pageIndex === pages.length - 1} onClick={() => turnPage(1)}><ChevronRight size={17} aria-hidden="true" /></button>
      </div>}
    </div>
    {onMove && <p id="classroom-move-hint" className={movement.moving || movement.autonomous ? 'classroom-move-hint' : 'sr-only'}>
      {movement.autonomous ? '통로를 걷고 제자리로 돌아와요. 바닥을 누르거나 방향키로 직접 조종할 수 있어요.'
        : `바닥을 터치하거나 방향키로 이동 · Esc로 ${host ? '칠판 앞으로' : '착석'}`}
    </p>}
    {movement.error && <p role="alert" className="error">{movement.error}</p>}
    {activityError && <p role="alert" className="error">{activityError}</p>}
    {choosingCharacter && mySeat && onCharacterChange && <CharacterPicker key={roomDay} current={mySeat.character ?? defaultCharacter(mySeat.number)}
      onChange={onCharacterChange} onClose={() => setChoosingCharacter(false)} />}
    {editingNickname && mySeat && onNicknameChange && <NicknameDialog key={roomDay} current={mySeat.name} onSave={onNicknameChange} onClose={() => setEditingNickname(false)} />}
  </section>;
}
