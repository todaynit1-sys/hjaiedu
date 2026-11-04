import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { PublicPoll } from '../lib/types';
import { PollCard } from './poll-card';

type Props = {
  title: string;
  polls: PublicPoll[];
  host: boolean;
  active: boolean;
  busy: boolean;
  onAction: (input: Record<string, unknown>, success: string) => Promise<void>;
  onManage: (id: string) => void;
  onClose: () => void;
};

export function ClassroomPolls({ title, polls, host, active, busy, onAction, onManage, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); trigger?.focus(); };
  }, []);
  return <dialog ref={dialog} className="share-dialog classroom-polls-dialog" aria-labelledby="classroom-polls-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <button className="dialog-close icon-button" onClick={onClose} aria-label="투표 창 닫기"><X size={20} /></button>
    <h2 id="classroom-polls-title">{title}</h2>
    <div className="classroom-poll-list">
      {polls.map(poll => <PollCard key={poll.id} poll={poll} host={host} active={active && !poll.archived}
        busy={busy} onAction={onAction} onManage={() => onManage(poll.id)} />)}
      {polls.length === 0 && <p>표시할 투표가 없어요.</p>}
    </div>
  </dialog>;
}
