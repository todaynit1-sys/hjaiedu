import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Smile, X } from 'lucide-react';
import { Chalkboard } from './chalkboard';
import { CHARACTERS, defaultCharacter, type Character, type PublicMessage, type Snapshot } from '../lib/types';
import '../app/classroom-scene.css';

const PAGE_SIZE = 20;
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
  smile: '방긋이', sprout: '새싹이', cheer: '신난이', glasses: '동글안경', sleepy: '꾸벅이', cat: '고양이'
};

function StudentHead({ character }: { character: Character }) {
  const head = character === 'cat'
    ? 'M26 35c-2-4-2-9 0-14l.5-10q.1-3 3-1l9 5q7-2 13 0l8-5q3-1.8 3 1l-.1 10c4 6 3 13-1 17-4 4-10 5-16 5-10 0-16-2-19.4-8Z'
    : 'M26 36c-2-5 0-12 4-17 5-6 11-8 18-7 9 1 17 9 17 18 0 7-4 11-9 13H35c-5-1-8-4-9-7Z';
  return <g>
    <path fill="#fffefa" d={head} />
    {character === 'cat' && <g stroke="none" fill="#efb6a8"><path d="m29 13 .2 5 4-2Zm31 0-4 3 4 2Z" /></g>}
    {character === 'sprout' && <g strokeWidth="1.55"><path d="m44 13 .3-5" /><path d="M44.5 10q-7 1-8-6 7-.5 8 6Zm.2.1Q45 .4 54 1q.2 8-9.3 9.1Z" fill="#a3d0a0" /></g>}
    {character === 'cheer' && <path d="M44 13q-4-7 2-10m-2 8q2-5 6-4" />}
    <g stroke="none" fill="#f1b8ae"><ellipse cx="33" cy="32" rx="3.3" ry="2.1" /><ellipse cx="56" cy="32" rx="3.3" ry="2.1" /></g>
    {character === 'sleepy' ? <g><path d="M34 26q3 4 6 0m9 0q3 4 6 0" /><path d="m62 14 4-1-2 4 4-1m0-9 4-1-2 4 4-1" strokeWidth="1.4" /></g>
      : character === 'cheer' ? <g><circle cx="38" cy="27" r="1.8" fill="currentColor" stroke="none" /><path d="m50 24 4 2-4 2" /></g>
      : <g fill="currentColor" stroke="none"><circle cx="37.5" cy="27" r="1.8" /><circle cx="52" cy="27" r="1.8" /></g>}
    {character === 'glasses' && <g strokeWidth="1.7"><circle cx="38" cy="26.5" r="5.3" /><circle cx="51" cy="26.5" r="5.3" /><path d="M43 26h3m-17-1 4 1m23 0 4-1" /></g>}
    {character === 'cat' ? <g><path d="M41 31q2 4 4 0 2 4 4 0" /><path d="m30 30-6-1m6 4-6 1m35-4 6-1m-6 4 6 1" strokeWidth="1.1" /></g>
      : character === 'cheer' ? <path fill="#eaa7a1" d="M41 31h8q-3 8-8 0Z" /> : <path d="M41 32q3.6 4.5 7.5-.2" />}
  </g>;
}

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
  return <dialog ref={dialog} className="classroom-character-dialog" aria-labelledby="character-picker-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="classroom-picker-heading"><h2 id="character-picker-title">캐릭터 선택</h2><button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="캐릭터 선택 닫기"><X size={20} /></button></div>
    <p>내 책상에 앉을 친구를 골라주세요.</p>
    <div className="classroom-character-options" role="group" aria-label="캐릭터" aria-busy={saving}>
      {CHARACTERS.map(value => <button type="button" key={value} aria-pressed={current === value} disabled={saving} onClick={() => choose(value)}>
        {current === value && <Check className="classroom-character-check" size={15} aria-hidden="true" />}
        <svg viewBox="16 -2 60 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><StudentHead character={value} /></svg>
        <span>{characterNames[value]}</span>
      </button>)}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
  </dialog>;
}

function DeskDrawing({ number, character, mine }: { number: number; character?: Character; mine: boolean }) {
  return <svg className="classroom-desk" viewBox="0 0 90 68" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {character ? <StudentHead character={character} /> : <path className="classroom-empty-chair" d="M29 38v-8c0-3 2-5 5-5h22c3 0 5 2 5 5v8" />}
    <path d="m14 56 .5 6m60-6-.5 6" />
    <rect className="classroom-desk-front" x="7" y="36.5" width="76" height="22" rx="7.2" />
    <path d="M14.5 39.5h61" stroke="white" strokeOpacity=".8" strokeWidth="1" />
    <text x="45" y="52.7" textAnchor="middle" fill="currentColor" stroke="none" fontSize="13.8" fontWeight="750">{seatLabel(number)}</text>
    {mine && <path d="M22 63q22 4 46 0" stroke="#4656a5" strokeWidth="2.8" />}
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

export function ClassroomScene({ data, mood, onCharacterChange }: { data: Snapshot; mood?: ReactNode; onCharacterChange?: (value: Character) => Promise<void> }) {
  const seats = data.seats ?? [];
  const mySeat = seats.find(seat => seat.mine);
  const [choosingCharacter, setChoosingCharacter] = useState(false);
  const pages = [...new Set([0, ...seats.map(seat => seatPage(seat.number))])].sort((a, b) => a - b);
  const [selectedPage, setSelectedPage] = useState<{ roomDay: string; page: number } | null>(null);
  const roomDay = `${data.code}/${data.date}`;
  const page = selectedPage?.roomDay === roomDay && pages.includes(selectedPage.page)
    ? selectedPage.page : mySeat ? seatPage(mySeat.number) : 0;
  const pageIndex = pages.indexOf(page);
  const firstSeat = page * PAGE_SIZE + 1;
  const bubbles = useSeatBubbles(data);
  // Old instructor posts and the seeded demo cards predate the author field.
  const teacher = data.messages.reduce<PublicMessage | undefined>(
    (latest, message) => message.author === 'student' ? latest : message, undefined);
  const latest = data.messages.at(-1);
  const turnPage = (offset: number) => setSelectedPage({ roomDay, page: pages[pageIndex + offset] });

  return <section className="classroom-scene" aria-labelledby="classroom-title">
    <div className="classroom-scene-heading"><h2 id="classroom-title"><DeskIcon />AI 강의실</h2>{mood}</div>
    <span className="sr-only classroom-mobile-announcement" role="status">{latest && `${latest.authorName ?? '강사'}: ${latest.text}`}</span>
    <Chalkboard message={teacher} code={data.code} active={data.active} />
    <ol className="classroom-seats" aria-label={`강의실 좌석 ${firstSeat}번부터 ${firstSeat + PAGE_SIZE - 1}번까지`} start={firstSeat}>
      {Array.from({ length: PAGE_SIZE }, (_, index) => {
        const number = firstSeat + index;
        const seat = seats.find(item => item.number === number);
        const bubble = seat && bubbles.get(number);
        const character = seat && (seat.character ?? defaultCharacter(number));
        return <li key={number} data-character={character} className={`classroom-seat${seat ? ' is-occupied' : ''}${seat?.mine ? ' is-mine' : ''}`}>
          <span className="sr-only">{seatLabel(number)}번 {seat ? seat.name : '빈 자리'}{character && ', ' + characterNames[character]}{seat?.mine ? ', 내 자리' : ''}</span>
          <div className="classroom-desk-wrap">
            {bubble && <div className="classroom-seat-bubble" key={bubble.id} title={bubble.text}><span>{bubble.text}</span></div>}
            <DeskDrawing number={number} character={character} mine={Boolean(seat?.mine)} />
            {seat?.mine && onCharacterChange && <button className="classroom-desk-hit" type="button" aria-haspopup="dialog" aria-label={`${seatLabel(number)}번 내 자리 캐릭터 바꾸기`} onClick={() => setChoosingCharacter(true)} />}
          </div>
        </li>;
      })}
    </ol>
    <div className="classroom-seating-footer">
      <div className="classroom-seat-info">{mySeat && <span className="classroom-own-seat">내 자리 <b>{seatLabel(mySeat.number)}</b></span>}
        {mySeat && onCharacterChange && <button className="classroom-character-trigger" type="button" aria-haspopup="dialog" onClick={() => setChoosingCharacter(true)}><Smile size={15} aria-hidden="true" />캐릭터 선택</button>}
        <span className="classroom-student-count">수강생 {seats.length}명</span>
      </div>
      {pages.length > 1 && <div className="classroom-page-controls" role="group" aria-label="좌석 범위 선택">
        <button type="button" aria-label="앞 좌석 보기" disabled={pageIndex === 0} onClick={() => turnPage(-1)}><ChevronLeft size={17} aria-hidden="true" /></button>
        <span aria-live="polite">{seatLabel(firstSeat)}–{seatLabel(firstSeat + PAGE_SIZE - 1)}</span>
        <button type="button" aria-label="뒤 좌석 보기" disabled={pageIndex === pages.length - 1} onClick={() => turnPage(1)}><ChevronRight size={17} aria-hidden="true" /></button>
      </div>}
    </div>
    {choosingCharacter && mySeat && onCharacterChange && <CharacterPicker key={roomDay} current={mySeat.character ?? defaultCharacter(mySeat.number)}
      onChange={onCharacterChange} onClose={() => setChoosingCharacter(false)} />}
  </section>;
}
