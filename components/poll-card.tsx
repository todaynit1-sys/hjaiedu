import { Check, Coffee, Meh, Plus, Settings2, Smile, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import type { PublicPoll } from '../lib/types';
export function PollCard({ poll, host, active, busy, onAction, onManage }: { poll: PublicPoll; host: boolean; active: boolean; busy: boolean; onAction: (input: Record<string, unknown>, success: string) => Promise<void>; onManage: () => void }) {
  const Icon = poll.kind === 'mood' ? Smile : poll.kind === 'break' ? Coffee : Sparkles;
  const choices = [Smile, Meh, Coffee];
  const showFooter = !poll.open || !active || (!host && poll.myVote !== null) || (host && active);
  return <section className={`compact-poll poll-${poll.kind}`} aria-labelledby={`poll-${poll.id}`}>
    <div className="compact-poll-top"><span className="compact-poll-kind"><Icon size={15} />{poll.kind === 'mood' ? '오늘의 컨디션' : poll.kind === 'break' ? '쉬어가는 시간' : '우리의 질문'}</span><span className="compact-poll-total"><b>{poll.total}</b>명</span></div><h3 id={`poll-${poll.id}`}>{poll.question}</h3>
    <div className="compact-choices" aria-label="응답 결과">{poll.options.map((option, i) => {
      const ChoiceIcon = choices[i % choices.length]; const percentage = poll.total ? Math.round(poll.counts[i] / poll.total * 100) : 0;
      const label = poll.kind === 'mood' ? ['좋아요', '보통', '힘들어요'][i] : poll.kind === 'break' ? ['계속해요', '쉬고 싶어요'][i] : option;
      const content = <><span className="choice-fill" style={{ width: `${percentage}%` }} aria-hidden="true" />{poll.kind === 'mood' && <ChoiceIcon size={19} />}<span className="choice-name">{label}</span><span className="choice-number">{poll.counts[i]}<small>명</small></span></>;
      return host ? <div key={i} className="compact-choice" aria-label={`${option} ${poll.counts[i]}명`}>{content}</div> : <button key={i} className={`compact-choice ${poll.myVote === i ? 'selected' : ''}`} disabled={!active || !poll.open || busy} aria-label={option} aria-pressed={poll.myVote === i} onClick={() => onAction({ type: 'vote', pollId: poll.id, option: i }, `${option}로 응답했어요.`)}>{content}</button>;
    })}</div>{showFooter && <div className="compact-poll-foot">{(!poll.open || !active || (!host && poll.myVote !== null)) && <span>{!poll.open || !active ? '마감된 투표' : <span className="answered"><Check size={11} />응답 완료</span>}</span>}{host && active && <button className="poll-manage-button" disabled={busy} onClick={onManage} aria-label={`${poll.question} 투표 관리`} aria-haspopup="dialog"><Settings2 size={13} />관리</button>}</div>}
  </section>;
}
export function NewPoll({ busy, onAction }: { busy: boolean; onAction: (input: Record<string, unknown>, success: string) => Promise<void> }) {
  const [question, setQuestion] = useState(''); const [options, setOptions] = useState(''); const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null); const optionsRef = useRef<HTMLTextAreaElement>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setError('');
    const values = options.split('\n').map(o => o.trim()).filter(Boolean);
    if (!question.trim()) { setError('질문을 입력해주세요.'); inputRef.current?.focus(); return; }
    if (values.length < 2 || values.length > 5 || new Set(values).size !== values.length) { setError('중복되지 않는 응답 항목을 2~5개 입력해주세요.'); optionsRef.current?.focus(); return; }
    try { await onAction({ type: 'poll-create', question, options: values }, `${question} 투표를 만들었어요.`); }
    catch (e) { setError((e as Error).message); }
  }
  return <section className="new-poll"><form id="new-poll-form" onSubmit={submit}><label htmlFor="poll-question">질문</label><input id="poll-question" ref={inputRef} value={question} onChange={e => setQuestion(e.target.value)} maxLength={100} disabled={busy} aria-describedby={error ? 'poll-error' : undefined} /><label htmlFor="poll-options">응답 항목</label><textarea id="poll-options" ref={optionsRef} value={options} onChange={e => setOptions(e.target.value)} placeholder={'예: 이해했어요\n한 번 더 설명해주세요'} rows={3} disabled={busy} aria-describedby={`poll-options-hint${error ? ' poll-error' : ''}`} /><p className="hint" id="poll-options-hint">한 줄에 하나씩, 2~5개를 입력해주세요.</p>{error && <p role="alert" id="poll-error" className="error">{error}</p>}<button className="primary" disabled={busy}>{busy ? '만드는 중' : '투표 시작하기'} <Plus size={16} /></button></form></section>;
}
