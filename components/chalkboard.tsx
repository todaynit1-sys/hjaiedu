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

export function Chalkboard({ message, code, active }: { message?: PublicMessage; code: string; active: boolean }) {
  const caption = message?.text || (active ? '질문은 편하게 남겨주세요!' : '오늘 강의가 끝났어요.');
  const boardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const board = boardRef.current, content = contentRef.current, paragraph = captionRef.current;
    if (!board || !content || !paragraph) return;
    const measure = () => fitBoard(board, content, paragraph);
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
  }, [caption, message?.id, message?.url, message?.attachment?.name]);

  return <div ref={boardRef} className="classroom-board fitted-chalkboard" role="region" aria-label="강의실 칠판">
    <div ref={contentRef} className="classroom-board-content">
      <p ref={captionRef} className={!message ? 'classroom-board-welcome' : undefined}>{caption}</p>
      {message?.url && <a href={message.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />{new URL(message.url).hostname}</a>}
      {message?.attachment && <a href={`/api/rooms/${code}/files/${message.attachment.id}`} download={message.attachment.name}><Download size={14} aria-hidden="true" />{message.attachment.name}</a>}
    </div>
    <svg className="classroom-board-sprout" width="34" height="39" viewBox="0 0 34 39" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 36c1-7 2-13-.5-18M17 25C8 26 4 19 3.5 14c7-.2 12 3 13.5 11Zm.1-7.5C15 10 22 4 30 3c.6 8-3.5 14.5-12.9 14.5Z" />
    </svg>
    <span className="classroom-board-ledge" aria-hidden="true" />
  </div>;
}
