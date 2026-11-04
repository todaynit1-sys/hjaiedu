import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import type { PublicMessage, Snapshot } from '../lib/types';
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

function Chalkboard({ message, code, active }: { message?: PublicMessage; code: string; active: boolean }) {
  const caption = message?.text || (active ? '질문은 편하게 남겨주세요!' : '오늘 강의가 끝났어요.');
  return <div className="classroom-board" role="region" aria-label="강의실 칠판">
    <div className="classroom-board-content" tabIndex={0} key={message?.id ?? 'welcome'}>
      <p className={!message ? 'classroom-board-welcome' : caption.length > 50 ? 'classroom-board-long' : undefined}>{caption}</p>
      {message?.url && <a href={message.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />{new URL(message.url).hostname}</a>}
      {message?.attachment && <a href={`/api/rooms/${code}/files/${message.attachment.id}`} download={message.attachment.name}><Download size={14} aria-hidden="true" />{message.attachment.name}</a>}
    </div>
    <svg className="classroom-board-sprout" width="34" height="39" viewBox="0 0 34 39" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 36c1-7 2-13-.5-18M17 25C8 26 4 19 3.5 14c7-.2 12 3 13.5 11Zm.1-7.5C15 10 22 4 30 3c.6 8-3.5 14.5-12.9 14.5Z" />
    </svg>
    <span className="classroom-board-ledge" aria-hidden="true" />
  </div>;
}

function DeskDrawing({ number, occupied, mine }: { number: number; occupied: boolean; mine: boolean }) {
  const style = number % 6;
  return <svg className="classroom-desk" viewBox="0 0 90 68" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {occupied ? <g>
      {style === 2 && <path d="M43 15q-4-8 2-10m-1 7q1-5 5-5" />}
      <path fill="#fffefa" d="M26 36c-2-5 0-12 4-17 5-6 11-8 18-7 9 1 17 9 17 18 0 7-4 11-9 13H35c-5-1-8-4-9-7Z" />
      <g stroke="none" fill="#f1b8ae"><ellipse cx="33" cy="32" rx="3.3" ry="2.1" /><ellipse cx="56" cy="32" rx="3.3" ry="2.1" /></g>
      {style === 4 ? <g strokeWidth="1.8"><circle cx="38" cy="26.5" r="5" /><circle cx="51" cy="26.5" r="5" /><path d="M43 26h3m-17-1 4 1m23 0 4-1" /></g>
        : style === 5 ? <path d="M34 26q3 4 6 0m9 0q3 4 6 0" />
        : <g fill="currentColor" stroke="none"><circle cx="37.5" cy="27" r="1.9" /><circle cx="52" cy="27" r="1.9" /></g>}
      {style === 3 ? <path fill="#eaa7a1" d="M41 32h8q-3 7-8 0Z" /> : <path d="M41 32q3.6 4.5 7.5-.2" />}
    </g> : <path className="classroom-empty-chair" d="M29 38v-8c0-3 2-5 5-5h22c3 0 5 2 5 5v8" />}
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

export function ClassroomScene({ data, mood }: { data: Snapshot; mood?: ReactNode }) {
  const seats = data.seats ?? [];
  const mySeat = seats.find(seat => seat.mine);
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
        return <li key={number} className={`classroom-seat${seat ? ' is-occupied' : ''}${seat?.mine ? ' is-mine' : ''}`}>
          <span className="sr-only">{seatLabel(number)}번 {seat ? seat.name : '빈 자리'}{seat?.mine ? ', 내 자리' : ''}</span>
          <div className="classroom-desk-wrap">
            {bubble && <div className="classroom-seat-bubble" key={bubble.id} title={bubble.text}><span>{bubble.text}</span></div>}
            <DeskDrawing number={number} occupied={Boolean(seat)} mine={Boolean(seat?.mine)} />
          </div>
        </li>;
      })}
    </ol>
    <div className="classroom-seating-footer">
      <p>{mySeat && <span className="classroom-own-seat">내 자리 <b>{seatLabel(mySeat.number)}</b></span>}<span>수강생 {seats.length}명</span></p>
      {pages.length > 1 && <div className="classroom-page-controls" role="group" aria-label="좌석 범위 선택">
        <button type="button" aria-label="앞 좌석 보기" disabled={pageIndex === 0} onClick={() => turnPage(-1)}><ChevronLeft size={17} aria-hidden="true" /></button>
        <span aria-live="polite">{seatLabel(firstSeat)}–{seatLabel(firstSeat + PAGE_SIZE - 1)}</span>
        <button type="button" aria-label="뒤 좌석 보기" disabled={pageIndex === pages.length - 1} onClick={() => turnPage(1)}><ChevronRight size={17} aria-hidden="true" /></button>
      </div>}
    </div>
  </section>;
}
