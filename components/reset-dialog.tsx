import { RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ResetTarget } from '../lib/types';

export const RESET_LABELS: Record<ResetTarget, string> = { chat: '채팅', mood: '컨디션', break: '쉬는시간' };

export function ResetDialog({ target, busy, onAction, onClose }: { target: ResetTarget; busy: boolean; onAction: (input: Record<string, unknown>, success: string) => Promise<void>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null); const cancelRef = useRef<HTMLButtonElement>(null); const [error, setError] = useState('');
  useEffect(() => { const previous = document.activeElement as HTMLElement; const dialog = ref.current; dialog?.showModal(); cancelRef.current?.focus(); return () => { dialog?.close(); previous?.focus(); }; }, []);
  const label = RESET_LABELS[target];
  async function reset() {
    setError('');
    try { await onAction({ type: 'room-reset', target }, `${label}을 초기화했어요.`); onClose(); }
    catch (e) { setError((e as Error).message); }
  }
  return <dialog className="share-dialog reset-dialog" ref={ref} aria-labelledby="reset-dialog-title" aria-describedby="reset-dialog-description" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><button className="dialog-close icon-button" disabled={busy} onClick={onClose} aria-label="초기화 확인 닫기"><X size={20} /></button><h2 id="reset-dialog-title">{label}을 초기화할까요?</h2><p id="reset-dialog-description">{target === 'chat' ? '오늘의 채팅, 고정 메시지와 첨부 파일을 모두 지웁니다.' : `오늘의 ${label} 응답과 이전 투표 결과를 지우고 다시 응답을 받습니다.`} 다른 항목은 유지되며, 지운 내용은 되돌릴 수 없어요.</p>{error && <p className="error" role="alert">{error}</p>}<div className="reset-dialog-actions"><button className="secondary" ref={cancelRef} disabled={busy} onClick={onClose}>취소</button><button className="primary" disabled={busy} onClick={reset}><RotateCcw size={15} />{busy ? '초기화 중' : '초기화하기'}</button></div></dialog>;
}
