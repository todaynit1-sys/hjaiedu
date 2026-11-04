import { useState } from 'react';
import { Frown, Meh, Smile } from 'lucide-react';
import type { PublicPoll } from '../lib/types';

const faces = [Smile, Meh, Frown];
const shortLabels = ['좋아요', '보통', '힘들어요'];

export function ClassroomMood({ poll, host, active, busy, onVote }: {
  poll: PublicPoll; host: boolean; active: boolean; busy: boolean;
  onVote: (option: number) => Promise<void>;
}) {
  const [pending, setPending] = useState<number | null>(null);
  const selected = pending ?? poll.myVote;
  const total = poll.total + Number(pending !== null && poll.myVote === null);
  async function vote(index: number) {
    if (busy || pending !== null || index === poll.myVote) return;
    setPending(index);
    try { await onVote(index); }
    catch { /* RoomView displays the server's reason. Restore the confirmed vote. */ }
    finally { setPending(null); }
  }
  return <div className="classroom-mood" role="group" aria-label="오늘의 컨디션">
    <div className="mood-caption"><strong>오늘의 컨디션</strong>
      <small className="mood-total">{total}명 참여{!poll.open && ' · 마감'}</small>
    </div>
    {poll.options.map((option, index) => {
      const Face = faces[index] ?? Smile;
      const count = poll.counts[index] + Number(index === selected) - Number(index === poll.myVote);
      const label = `${option} ${count}명`;
      const detail = <><Face size={18} aria-hidden="true" /><span>{shortLabels[index] ?? option}</span><b>{count}명</b></>;
      return host ? <span key={option} className="mood-choice" title={label}>{detail}</span> :
        <button key={option} type="button" className="mood-choice" aria-label={label} aria-pressed={selected === index}
          disabled={!active || !poll.open || busy || pending !== null} onClick={() => void vote(index)}>{detail}</button>;
    })}
  </div>;
}
