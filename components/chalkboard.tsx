import { useLayoutEffect, useRef } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import type { PublicMessage } from '../lib/types';
import '../app/chalkboard-fit.css';

function fitBoard(board: HTMLDivElement, content: HTMLDivElement, caption: HTMLParagraphElement) {
  if (!board.clientWidth) return;
  delete board.dataset.expanded;
  caption.style.removeProperty('font-size');
  const style = getComputedStyle(board);
  const available = board.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const fits = () => content.getBoundingClientRect().height <= available;
  if (fits()) return;

  let upper = parseFloat(getComputedStyle(caption).fontSize);
  // At normal text settings the smallest chalk lettering is 15px. Respect larger root text.
  let lower = Math.min(upper, Math.max(15, parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.9375));
  caption.style.fontSize = `${lower}px`;
  if (!fits()) {
    board.dataset.expanded = '';
    return;
  }
  while (upper - lower > 0.5) {
    const size = (upper + lower) / 2;
    caption.style.fontSize = `${size}px`;
    if (fits()) lower = size;
    else upper = size;
  }
  caption.style.fontSize = `${lower}px`;
}

export function Chalkboard({ message, code, active, onExpanded }: { message?: PublicMessage; code: string; active: boolean; onExpanded?: (expanded: boolean) => void }) {
  const caption = message?.text || (active ? '질문은 편하게 남겨주세요!' : '오늘 강의가 끝났어요.');
  const welcome = !message && active;
  const boardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const board = boardRef.current, content = contentRef.current, paragraph = captionRef.current;
    if (!board || !content || !paragraph) return;
    const measure = () => {
      if (!board.clientWidth) return;
      fitBoard(board, content, paragraph);
      onExpanded?.(board.hasAttribute('data-expanded'));
    };
    let frame = 0;
    let disposed = false;
    function schedule() {
      if (disposed || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    }
    measure();
    let width = -1;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(([entry]) => {
      // Fitting changes height. Only a width change requires measuring the same post again.
      if (entry.contentRect.width === width) return;
      width = entry.contentRect.width;
      schedule();
    });
    observer?.observe(board);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    void document.fonts?.ready.then(schedule);
    document.fonts?.addEventListener?.('loadingdone', schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      document.fonts?.removeEventListener?.('loadingdone', schedule);
    };
  }, [caption, message?.id, message?.url, message?.attachment?.name, onExpanded]);

  return <div ref={boardRef} className="classroom-board fitted-chalkboard" data-welcome={welcome || undefined} role="region" aria-label="강의실 칠판">
    {welcome && <svg className="chalkboard-drawing chalkboard-globe" viewBox="0 0 100 108" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="49" cy="67" r="32" />
      <path d="M33 42l7 8-3 10 7 3 2 8 7 5-4 18M69 43l-7 8-1 11 9 2 7 7M18 72c14-8 47-12 64-7M40 37c4 15 10 26 19 35 8 7 12 10 17 12" />
      <path className="chalkboard-leaves" d="M49 35c2-13 9-22 19-29M55 21C50 9 40 6 29 7c5 11 14 17 26 14ZM61 15c12 2 21-2 25-10-12-3-21 0-25 10Z" />
      <path d="M9 45v8m-4-4h8m67 48v6m-3-3h6" />
    </svg>}
    {welcome && <svg className="chalkboard-drawing chalkboard-trees" viewBox="0 0 100 108" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 28c-4-4 1-9 7-9 2-6 9-8 15-4 4-5 12-2 13 4 7-1 10 3 9 6-1 5-9 6-15 4-7 3-16 3-22 0Z" />
      <path className="chalkboard-leaves" d="m70 42-11 16 5-1-11 14 7-1-11 14 17-1v12m4-53 11 16-5-1 11 14-7-1 11 14-17-1v12M37 65 26 79l6-1-11 13 12-1v8m4-33 10 14-6-1 10 13-10-1v8" />
      <path d="M8 55v7m-3.5-3.5h7m76-27v8m-4-4h8" />
    </svg>}
    <div ref={contentRef} className="classroom-board-content">
      <p ref={captionRef} className={!message ? 'classroom-board-welcome' : undefined}>
        {welcome ? <>질문은 편하게 <span className="chalkboard-emphasis">남겨주세요!</span></> : caption}
      </p>
      {message?.url && <a href={message.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />{new URL(message.url).hostname}</a>}
      {message?.attachment && <a href={`/api/rooms/${code}/files/${message.attachment.id}`} download={message.attachment.name}><Download size={14} aria-hidden="true" />{message.attachment.name}</a>}
    </div>
    <div className="chalkboard-tray" aria-hidden="true"><i/><i/><i/></div>
  </div>;
}
