import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleHelp, Hand, Heart, MessageSquare, PartyPopper, Sparkles, ThumbsUp, X } from 'lucide-react';
import { QUESTION_BANK } from '../lib/question-bank';
import { QUESTION_ANSWER_MAX_LENGTH, QUESTION_KEY_MAX_LENGTH, QUESTION_PROMPT_MAX_LENGTH, SCOLD_TIME, type ClassroomSeat, type ReactionKind, type ScoldKind, type Snapshot } from '../lib/types';
import '../app/classroom-activities.css';
import '../app/classroom-scold.css';
import { saveClassroomMemory } from '../lib/classroom-portfolio';
import { ClassroomPortfolio, photoReflectionLines, renderGroupPhoto, useDownloadPhoto } from './classroom-portfolio';
import { StorybookAvatarArt } from './storybook-avatar-art';

export type ClassroomAction = (input: Record<string, unknown>) => Promise<void>;
const reactions = {
  understood: { label: '이해했어요', Icon: ThumbsUp },
  clap: { label: '박수', Icon: PartyPopper },
  confused: { label: '어려워요', Icon: CircleHelp },
  wave: { label: '안녕!', Icon: Hand },
  heart: { label: '고마워요', Icon: Heart }
};

export function ActivityBadge({ seat, updatedAt }: { seat: ClassroomSeat; updatedAt: string }) {
  const offset = useMemo(() => Date.parse(updatedAt) - Date.now(), [updatedAt]);
  const [, tick] = useState(0);
  const activity = seat.activity;
  const now = Date.now() + offset;
  const reaction = activity?.reaction && activity.reaction.at + 4000 > now ? activity.reaction : undefined;
  const greeting = activity?.greeting && activity.greeting.at + 6000 > now ? activity.greeting : undefined;
  const expiry = Math.min(reaction ? reaction.at + 4000 : Infinity, greeting ? greeting.at + 6000 : Infinity);
  useEffect(() => {
    if (!Number.isFinite(expiry)) return;
    const timer = window.setTimeout(() => tick(value => value + 1), Math.max(1, expiry - Date.now() - offset + 1));
    return () => clearTimeout(timer);
  }, [expiry, offset]);
  if (!activity?.handAt && !reaction && !greeting) return null;
  const KindIcon = reaction ? reactions[reaction.kind].Icon : Hand;
  return <span className="classroom-activity-badge" data-kind={reaction?.kind}>
    {activity?.handAt && <span className="raised-hand" title="질문 있어요"><Hand size={16} /><span className="sr-only">질문 있어요</span></span>}
    {(reaction || greeting) && <span title={reaction ? reactions[reaction.kind].label : `${greeting!.from}번 친구가 인사했어요`}><KindIcon size={16} />
      <span className="sr-only">{reaction ? reactions[reaction.kind].label : `${greeting!.from}번 친구가 인사했어요`}</span></span>}
  </span>;
}

/** Numbers the built-in questions 1-30 across sessions, matching the handout. */
function bankNumber(section: number, index: number) {
  return QUESTION_BANK.slice(0, section).reduce((sum, item) => sum + item.questions.length, 0) + index + 1;
}

export type ScoldChoice = ScoldKind | 'forgive';
export const SCOLD_OPTIONS: { kind: ScoldKind; label: string; hint: string }[] = [
  { kind: 'chalk', label: '분필 던지기', hint: '딱! 하고 맞아요' },
  { kind: 'focus', label: '집중! 꾸중', hint: '머리 위에 호통' },
  { kind: 'hands', label: '손 들고 벌서기', hint: '30초 동안' }
];
const scoldNotice: Record<ScoldKind, string> = {
  chalk: '강사님이 분필을 던졌어요! 정신 차려요.',
  focus: '강사님이 집중하라고 혼냈어요!',
  hands: '손 들고 벌서는 중이에요. 30초만 버텨요!'
};

/** Returns the scolding still on screen for a seat, re-rendering when it runs out. */
export function useLiveScold(seat: ClassroomSeat | undefined, updatedAt: string) {
  const offset = useMemo(() => Date.parse(updatedAt) - Date.now(), [updatedAt]);
  const [, tick] = useState(0);
  const scold = seat?.activity?.scold;
  const now = Date.now() + offset;
  const expires = scold ? scold.at + SCOLD_TIME[scold.kind] : 0;
  const live = scold && expires > now ? scold : undefined;
  useEffect(() => {
    if (!live) return;
    const timer = window.setTimeout(() => tick(value => value + 1), Math.max(1, expires - Date.now() - offset + 1));
    return () => clearTimeout(timer);
  }, [live, expires, offset]);
  return live ? { ...live, elapsed: now - live.at } : undefined;
}

export function ScoldEffect({ seat, updatedAt }: { seat: ClassroomSeat; updatedAt: string }) {
  const scold = useLiveScold(seat, updatedAt);
  if (!scold) return null;
  // A negative delay resumes the animation at the shared moment, so late joiners stay in sync.
  const style = { animationDelay: `-${Math.min(scold.elapsed, 4_000)}ms` };
  return <div className="classroom-scold" data-kind={scold.kind} key={scold.at} aria-hidden="true">
    {scold.kind === 'chalk' && <><span className="classroom-chalk" style={style} /><span className="classroom-bonk" style={style}>딱!</span></>}
    {scold.kind === 'focus' && <span className="classroom-shout" style={style}>집중!!</span>}
    {scold.kind === 'hands' && <span className="classroom-punish-tag"><Hand size={13} /><Hand size={13} />벌서는 중
      <i style={{ animationDuration: `${SCOLD_TIME.hands}ms`, animationDelay: `-${scold.elapsed}ms` }} /></span>}
  </div>;
}

export function ScoldNotice({ seat, updatedAt }: { seat?: ClassroomSeat; updatedAt: string }) {
  const scold = useLiveScold(seat, updatedAt);
  if (!scold) return null;
  return <p className="classroom-scold-notice" key={scold.at} role="status">{scoldNotice[scold.kind]}</p>;
}

export function ScoldMenu({ seat, scolded, onChoose, onClose }: { seat: ClassroomSeat; scolded: boolean; onChoose: (kind: ScoldChoice) => Promise<void>; onClose: () => void }) {
  const menu = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    menu.current?.querySelector('button')?.focus();
    const away = (event: PointerEvent) => { if (!menu.current?.parentElement?.contains(event.target as Node)) onClose(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', escape); };
  }, [onClose]);
  async function choose(kind: ScoldChoice) {
    setBusy(true); setError('');
    try { await onChoose(kind); onClose(); }
    catch (cause) { setBusy(false); setError(cause instanceof Error ? cause.message : '다시 시도해주세요.'); }
  }
  return <div className="classroom-scold-menu" ref={menu} role="menu" aria-label={`${seat.name} 혼내기`}
    onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
    <p>{seat.name} 혼내기</p>
    {SCOLD_OPTIONS.map(item => <button key={item.kind} type="button" role="menuitem" disabled={busy} onClick={() => choose(item.kind)}>
      <b>{item.label}</b><small>{item.hint}</small></button>)}
    {scolded && <button type="button" role="menuitem" className="is-forgive" disabled={busy} onClick={() => choose('forgive')}><b>용서해주기</b><small>바로 풀어줘요</small></button>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}

export function ClassroomQuestion({ data, onAction, host, open, onOpenChange }: {
  data: Snapshot; onAction?: ClassroomAction; host: boolean; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const round = data.questionRound;
  const trigger = useRef<HTMLButtonElement>(null);
  const countId = useId();
  if (!host && !round) return null;

  const label = host ? (round ? '질문 관리' : '질문 출제') : (round?.open ? '질문 답하기' : '답변 보기');
  const count = host ? round?.total : undefined;
  return <>
    <button className="classroom-question-trigger" type="button" aria-haspopup="dialog" aria-label={label} title={label}
      aria-describedby={count !== undefined ? countId : undefined}
      ref={trigger} onClick={() => onOpenChange(true)}>
      <MessageSquare size={16} aria-hidden="true" /><span>{label}</span>
      <span className="question-short-label" aria-hidden="true">{round && (host || !round.open) ? '답변' : '질문'}</span>
      {Boolean(count) && <b className="question-trigger-count" aria-hidden="true">{count}</b>}
    </button>
    {count !== undefined && <span id={countId} className="sr-only">답변 {count}개</span>}
    {open && <QuestionDialog key={round?.id ?? 'new'} round={round} host={host} students={data.seats.length}
      onAction={onAction} onClose={() => {
        onOpenChange(false);
        requestAnimationFrame(() => trigger.current?.focus());
      }} />}
  </>;
}

function QuestionDialog({ round, host, students, onAction, onClose }: {
  round: Snapshot['questionRound']; host: boolean; students: number; onAction?: ClassroomAction; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const requestPending = useRef(false);
  const titleId = useId();
  const promptId = useId();
  const answerId = useId();
  const visibilityId = useId();
  const bankId = useId();
  const keyId = useId();
  const keyHintId = useId();
  const [prompt, setPrompt] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [bankChoice, setBankChoice] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const answer = draft ?? round?.myAnswer ?? '';

  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  async function send(input: Record<string, unknown>, message?: string) {
    if (!onAction || requestPending.current) return;
    requestPending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await onAction(input);
      if (input.type === 'question-start') { onClose(); return; }
      if (input.type === 'question-answer') setDraft(null);
      if (message) setNotice(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '다시 시도해주세요.');
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }

  return <dialog ref={dialog} className="classroom-character-dialog classroom-question-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!requestPending.current) onClose(); }}>
    <div className="classroom-picker-heading">
      <h2 id={titleId}>{host ? (round ? '질문 관리' : '질문 출제') : (round?.open ? '질문 답하기' : '답변 보기')}</h2>
      <button className="icon-button" aria-label="질문 창 닫기" type="button" disabled={busy} onClick={onClose}><X size={20}/></button>
    </div>
    <div className="classroom-question-content">
      {round && <div className="question-summary">
        <p className="question-prompt">{round.prompt}</p>
        <p role="status" className="question-meta">
          {round.open ? '답변 받는 중' : round.published ? '답변 공개됨' : '마감됨'} · 답변 {round.total}개
        </p>
        {host && <p className="question-tally" aria-hidden="true"><b>{round.total}</b> / {students}명 응답</p>}
      </div>}

      {!host && round?.open && <form className="question-form"
        onSubmit={event => { event.preventDefault(); if (answer.trim()) void send({type:'question-answer', roundId:round.id, text:answer.trim()}, '답변을 저장했어요.'); }}>
        <label htmlFor={answerId}>내 답변</label>
        <textarea id={answerId} value={answer} maxLength={QUESTION_ANSWER_MAX_LENGTH} rows={3} required disabled={busy || !onAction}
          aria-describedby={visibilityId} onChange={event => setDraft(event.target.value)} placeholder="짧게 적어주세요." />
        <p id={visibilityId} className="question-meta">공개 전에는 나만 볼 수 있어요. 강사가 공개하면 이름과 답변이 모두에게 보여요.</p>
        <div className="question-actions">
          <button type="submit" className="primary" disabled={busy || !onAction || !answer.trim()}>
            {round.myAnswer ? '답변 수정' : '답변 보내기'}
          </button>
          <span className="question-meta">{answer.length}/{QUESTION_ANSWER_MAX_LENGTH}</span>
        </div>
      </form>}

      {!host && round && !round.open && <section className="question-responses" aria-label="내 답변">
        <h3>내 답변</h3>
        <p className={round.myAnswer ? 'question-answer-text' : 'question-meta'}>{round.myAnswer ?? '제출한 답변이 없어요.'}</p>
        {!round.published && <p className="question-meta">강사가 공개하면 다른 답변도 볼 수 있어요.</p>}
      </section>}

      {host && round && !round.published && onAction && <div className="question-actions">
        {round.open && <button type="button" disabled={busy}
          onClick={() => void send({type:'question-close', roundId:round.id}, '질문을 마감했어요.')}>질문 마감</button>}
        <button type="button" className="primary" disabled={busy}
          onClick={() => void send({type:'question-publish', roundId:round.id}, '답변을 공개했어요.')}>답변 공개하기</button>
        <p className="question-meta">답변 내용은 공개하기 전까지 강사 화면에도 보이지 않아요. 공개하면 질문이 마감되고 누가 어떤 답을 했는지 모두에게 보여요.</p>
      </div>}

      {host && round && !round.open && onAction && <div className="question-actions">
        <button type="button" disabled={busy}
          onClick={() => void send({type:'question-clear', roundId:round.id}, '칠판에서 질문을 내렸어요.')}>칠판에서 내리기</button>
        <p className="question-meta">질문과 답변을 정리하고 칠판을 원래대로 돌려요.</p>
      </div>}

      {round?.published && round.key && <section className="question-key" aria-label="정답">
        <h3>정답</h3>
        <p>{round.key}</p>
      </section>}

      {round?.published && <section className="question-responses" aria-label="공개된 답변">
        <h3>공개된 답변</h3>
        {round.answers?.length ? <ul className="question-answer-list">{round.answers.map(item => (
          <li key={item.seatNumber}>
            <b>{item.name}</b>
            <p className="question-answer-text">{item.text}</p>
          </li>
        ))}</ul> : <p className="question-meta">아직 답변이 없어요.</p>}
      </section>}

      {host && !round?.open && onAction && <form className="question-form"
        onSubmit={event => { event.preventDefault(); if (prompt.trim()) void send({type:'question-start', prompt:prompt.trim(), key:modelAnswer.trim()}); }}>
        <label htmlFor={bankId}>내장 질문에서 고르기</label>
        <select id={bankId} className="question-bank-select" value={bankChoice} disabled={busy} onChange={event => {
          const value = event.target.value;
          setBankChoice(value);
          const [section, index] = value.split(':').map(Number);
          const picked = QUESTION_BANK[section]?.questions[index];
          if (picked) { setPrompt(picked.prompt); setModelAnswer(picked.answer); }
        }}>
          <option value="">직접 입력하기</option>
          {QUESTION_BANK.map((section, sectionIndex) => <optgroup key={section.title} label={section.title}>
            {section.questions.map((item, index) => <option key={item.prompt} value={`${sectionIndex}:${index}`}>{bankNumber(sectionIndex, index)}. {item.prompt}</option>)}
          </optgroup>)}
        </select>
        <label htmlFor={promptId}>{round ? '새 질문' : '질문'}</label>
        <textarea id={promptId} value={prompt} maxLength={QUESTION_PROMPT_MAX_LENGTH} rows={2} required disabled={busy}
          onChange={event => setPrompt(event.target.value)} placeholder="수강생에게 물어볼 질문을 적어주세요." />
        <label htmlFor={keyId}>정답 (선택)</label>
        <textarea id={keyId} value={modelAnswer} maxLength={QUESTION_KEY_MAX_LENGTH} rows={2} disabled={busy}
          onChange={event => setModelAnswer(event.target.value)} placeholder="답변을 공개할 때 함께 보여줄 정답이에요." aria-describedby={keyHintId} />
        <p id={keyHintId} className="question-meta">정답은 공개 전까지 강사 화면에도 보이지 않아요. 공개하면 칠판과 답변 카드에 수강생 답과 함께 떠요.</p>
        {round && <p className="question-meta">새 질문을 출제하면 이전 질문과 답변을 대체해요.</p>}
        <div className="question-actions">
          <button type="submit" className="primary" disabled={busy || !prompt.trim()}>질문 올리기</button>
          <span className="question-meta">{prompt.length}/{QUESTION_PROMPT_MAX_LENGTH}</span>
        </div>
      </form>}

      {!onAction && (host || round?.open) && <p className="question-meta">강의실에 다시 연결되면 질문을 진행할 수 있어요.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="question-meta" role="status">{notice}</p>}
    </div>
  </dialog>;
}

export function ClassroomActivities({ data, host, onAction, renderHead }: {
  data: Snapshot; host: boolean; onAction?: ClassroomAction; renderHead: (seat: ClassroomSeat) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hands = data.seats.filter(seat => seat.activity?.handAt).sort((a,b) => a.activity!.handAt! - b.activity!.handAt!);
  return <>
    <button className="classroom-character-trigger classroom-activities-trigger" aria-label={host && hands.length ? `활동 · 질문 대기 ${hands.length}명` : '활동'} type="button"
      aria-haspopup="dialog" onClick={() => setOpen(true)}><Sparkles size={15} /><span className="activity-label">활동</span>{hands.length > 0 && <b>{hands.length}</b>}</button>
    {open && <ActivitiesDialog data={data} host={host} hands={hands} onAction={onAction} renderHead={renderHead} onClose={() => setOpen(false)} />}
  </>;
}

function ActivitiesDialog({ data, host, hands, onAction, renderHead, onClose }: {
  data: Snapshot; host: boolean; hands: ClassroomSeat[]; onAction?: ClassroomAction;
  renderHead: (seat: ClassroomSeat) => ReactNode; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const photo = useRef<SVGSVGElement>(null);
  const pending = useRef(false);
  const reflectionId = useId();
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [reflection, setReflection] = useState('');
  const [savedSignature, setSavedSignature] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const downloadPhoto = useDownloadPhoto();
  const mySeat = data.seats.find(seat => seat.mine);
  const photoSeats = data.seats;
  const includeInstructor = host || Boolean(data.instructor);
  const photoMembers = [
    ...(includeInstructor ? [{ id: 'instructor', name: '강사', head: <StorybookAvatarArt character="glasses" instructor pose="idle" /> }] : []),
    ...photoSeats.map(seat => ({ id: String(seat.number), name: seat.name, head: renderHead(seat) }))
  ];
  const rows = Math.max(1, Math.ceil(photoMembers.length / 6));
  const reflectionLines = useMemo(() => photoReflectionLines(reflection), [reflection]);
  const reflectionY = 205 + rows * 110;
  const photoHeight = 230 + rows * 110 + (reflectionLines.length ? 65 + reflectionLines.length * 29 : 0);
  const photoSignature = JSON.stringify({ date: data.date, title: data.title, reflection: reflection.trim(), includeInstructor,
    seats: photoSeats.map(({ number, name, character, avatar }) => ({ number, name, character, avatar })) });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  useEffect(() => {
    dialog.current?.querySelector<HTMLButtonElement>(showPortfolio ? '.classroom-portfolio-back' : '.classroom-portfolio-open')?.focus();
  }, [showPortfolio]);
  async function run(input: Record<string, unknown>) {
    if (!onAction || pending.current) return;
    pending.current = true;
    setBusy(true); setError('');
    try { await onAction(input); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '다시 시도해주세요.'); }
    finally { pending.current = false; setBusy(false); }
  }
  async function savePhoto(destination: 'download' | 'portfolio') {
    if (!photo.current || pending.current) return;
    pending.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const image = await renderGroupPhoto(photo.current, 900, photoHeight);
      if (destination === 'portfolio') {
        await saveClassroomMemory({ id: crypto.randomUUID(), title: data.title, date: data.date, reflection: reflection.trim(), image, savedAt: Date.now() });
        setSavedSignature(photoSignature);
        setNotice('내 수강 기록에 저장했어요.');
      } else downloadPhoto(image, data.date);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '사진 저장을 다시 시도해주세요.'); }
    finally {
      pending.current = false; setBusy(false);
    }
  }
  return <dialog ref={dialog} className="classroom-character-dialog classroom-activities-dialog" aria-labelledby="classroom-activities-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="classroom-picker-heading"><h2 id="classroom-activities-title">{showPortfolio ? '내 수강 기록' : '교실 활동'}</h2><button className="icon-button" aria-label="교실 활동 닫기" type="button" disabled={busy} onClick={onClose}><X size={20}/></button></div>
    <div className="classroom-activities-content">
      {showPortfolio ? <><button type="button" className="classroom-portfolio-back" onClick={() => setShowPortfolio(false)}>교실 활동으로 돌아가기</button><ClassroomPortfolio /></> : <>
      <button type="button" className="classroom-portfolio-open" disabled={busy} onClick={() => setShowPortfolio(true)}>내 수강 기록 보기</button>
      {!host && mySeat && <section aria-label="손들기와 리액션">
        <button className="activity-hand" type="button" disabled={busy || !onAction} aria-pressed={Boolean(mySeat.activity?.handAt)}
          onClick={() => run({type:'hand', raised:!mySeat.activity?.handAt})}><Hand size={20}/>{mySeat.activity?.handAt ? '손 내리기' : '질문 있어요'}</button>
        <div className="activity-reactions">{(Object.keys(reactions) as ReactionKind[]).map(kind => {
          const {label, Icon} = reactions[kind];
          return <button key={kind} type="button" disabled={busy || !onAction} onClick={() => run({type:'reaction',kind})}><Icon size={22}/><span>{label}</span></button>;
        })}</div>
        <p>교실에서 친구 캐릭터를 누르면 인사해요. 30초 안에 답하면 하트가 떠요.</p>
      </section>}
      {host && <section aria-label="질문 대기"><h3>손든 순서 · {hands.length}명</h3>
        {hands.length ? <ol className="activity-hand-queue">{hands.map(seat => <li key={seat.number}><span>{String(seat.number).padStart(2,'0')} · {seat.name}</span>
          <button type="button" disabled={busy || !onAction} onClick={() => run({type:'hand-lower',seatNumber:seat.number})}>응답 완료</button></li>)}</ol> : <p>손을 든 수강생이 여기에 표시돼요.</p>}
      </section>}
      {host && <section aria-label="수강생 혼내기"><h3>혼내기</h3>
        <p>교실에서 수강생 캐릭터를 눌러도 혼낼 수 있어요. 분필·호통은 몇 초, 벌서기는 30초 뒤 풀려요.</p>
        {data.seats.length ? <ul className="activity-scold-list">{data.seats.map(seat => <li key={seat.number}>
          <span>{String(seat.number).padStart(2,'0')} · {seat.name}</span>
          <span className="activity-scold-buttons">{SCOLD_OPTIONS.map(item => <button key={item.kind} type="button" disabled={busy || !onAction}
            onClick={() => run({type:'scold', seatNumber:seat.number, kind:item.kind})}>{item.label}</button>)}
            {seat.activity?.scold && <button type="button" disabled={busy || !onAction} onClick={() => run({type:'scold', seatNumber:seat.number, kind:'forgive'})}>용서</button>}</span>
        </li>)}</ul> : <p>접속한 수강생이 없어요.</p>}
      </section>}
      <section aria-label="수업 단체사진"><h3>오늘의 단체사진</h3><p>지금 접속한 수강생 {photoSeats.length}명{includeInstructor ? '과 강사' : ''}의 캐릭터와 닉네임을 사진에 담아요.</p>
        <button type="button" disabled={busy} onClick={()=>setTakingPhoto(value=>!value)}>{takingPhoto ? '사진 접기' : '단체사진 미리보기'}</button>
        {takingPhoto && <>
          <div className="classroom-photo-reflection">
            <label htmlFor={reflectionId}>짧은 소감 (선택)</label>
            <textarea id={reflectionId} rows={2} maxLength={240} disabled={busy} value={reflection}
              onChange={event => { setReflection(event.target.value); setNotice(''); }} placeholder="오늘 배운 내용이나 느낀 점을 남겨주세요." />
            <p>사진에도 함께 담겨요. <span>{reflection.length}/240</span></p>
          </div>
          <svg ref={photo} className="classroom-group-photo" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 900 ${photoHeight}`} role="img" aria-label="AI 강의실 단체사진" style={{color:'#283452',fontFamily:'sans-serif'}}>
            <rect width="900" height={photoHeight} rx="24" fill="#f3f5fc"/>
            <rect x="35" y="25" width="830" height="130" rx="12" fill="#325447" stroke="#d8bd89" strokeWidth="9"/>
            <text x="450" y="75" textAnchor="middle" fill="#fffef7" fontSize="30" fontWeight="700">오늘도 수고했어요!</text>
            <text x="450" y="110" textAnchor="middle" fill="#fffef7" fontSize="20">{Array.from(data.title).slice(0,36).join('')}</text>
            <text x="450" y="138" textAnchor="middle" fill="#dce9df" fontSize="16">{data.date} · AI환경연구소</text>
            {photoMembers.map((member,index)=><g key={member.id} transform={`translate(${45+index%6*140},${185+Math.floor(index/6)*110})`}>
              <svg x="17" y="0" width="88" height="68" viewBox="0 0 90 68" fill="none" stroke="#283452" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{member.head}</svg>
              <text x="60" y="83" fill="#283452" fontSize="15" textAnchor="middle">{Array.from(member.name).slice(0,9).join('')}</text>
            </g>)}
            {reflectionLines.length > 0 && <g className="classroom-photo-caption">
              <rect x="45" y={reflectionY-12} width="810" height={48+reflectionLines.length*29} rx="12" fill="#fff" />
              <text x="65" y={reflectionY+15} fontSize="16" fontWeight="700" fill="#4656a5">수업 소감</text>
              {reflectionLines.map((line,index) => <text key={index} x="65" y={reflectionY+46+index*29} fontSize="20" fill="#283452">{line}</text>)}
            </g>}
            <text x="450" y={photoHeight-20} textAnchor="middle" fontSize="16" fill="#4656a5">신현준 연구사 실시간 강의실 · 함께 배우는 우리</text>
          </svg>
          <div className="classroom-photo-actions">
            <button className="primary" type="button" disabled={busy || savedSignature === photoSignature} onClick={() => savePhoto('portfolio')}>내 수강 기록에 저장</button>
            <button type="button" disabled={busy} onClick={() => savePhoto('download')}>단체사진 PNG 저장</button>
          </div>
        </>}
      </section>
      {busy && <p role="status">처리하고 있어요.</p>}
      {notice && <p role="status" className="classroom-photo-notice">{notice}</p>}
      </>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  </dialog>;
}
