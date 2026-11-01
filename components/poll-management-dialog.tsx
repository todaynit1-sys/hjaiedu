import { RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PublicPoll } from '../lib/types';

export function PollManagementDialog({ poll, busy, onAction, onClose }: { poll: PublicPoll; busy: boolean; onAction: (input: Record<string, unknown>, success: string) => Promise<void>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal(); closeRef.current?.focus();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  async function apply(type: 'poll-toggle' | 'poll-reset') {
    if (busy) return;
    setError('');
    try {
      await onAction({ type, id: poll.id }, type === 'poll-reset'
        ? '새 투표를 시작했어요. 이전 결과는 기록에 남아요.'
        : `${poll.question} 투표를 ${poll.open ? '마감' : '재개'}했어요.`);
      onClose();
    } catch (e) { setError((e as Error).message); }
  }
  return <dialog ref={ref} className="share-dialog poll-management-dialog" aria-labelledby="poll-management-title" aria-describedby="poll-management-question" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <button ref={closeRef} className="dialog-close icon-button" disabled={busy} onClick={onClose} aria-label="투표 관리 닫기"><X size={20} /></button>
    <h2 id="poll-management-title">투표 관리</h2>
    <p id="poll-management-question">{poll.question}</p>
    <div className="poll-management-actions">
      <button className="primary" disabled={busy} onClick={() => apply('poll-toggle')}>{poll.open ? '응답 마감' : '응답 다시 받기'}</button>
      <button className="secondary" disabled={busy} onClick={() => apply('poll-reset')}><RotateCcw size={16} />다시 물어보기</button>
    </div>
    <p className="hint">다시 물어보면 새 응답을 받습니다. 이전 결과는 기록에 남아요.</p>
    {error && <p className="error" role="alert">{error}</p>}
  </dialog>;
}
