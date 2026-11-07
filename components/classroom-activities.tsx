import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleHelp, Hand, Heart, MessageSquare, PartyPopper, Sparkles, ThumbsUp, X } from 'lucide-react';
import { QUESTION_ANSWER_MAX_LENGTH, QUESTION_PROMPT_MAX_LENGTH, type Character, type ClassroomSeat, type ReactionKind, type Snapshot } from '../lib/types';
import '../app/classroom-activities.css';

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

export function ClassroomQuestion({ data, onAction, host }: {
  data: Snapshot; onAction?: ClassroomAction; host: boolean;
}) {
  const round = data.questionRound;
  const [open, setOpen] = useState(false);
  if (!host && !round) return null;

  const label = host ? (round ? '질문 관리' : '질문 출제') : (round?.open ? '질문 답하기' : '답변 보기');
  return <>
    <button className="classroom-question-trigger" type="button" aria-haspopup="dialog" aria-label={label} title={label}
      onClick={() => setOpen(true)}>
      <MessageSquare size={16} aria-hidden="true" /><span>{label}</span>
    </button>
    {open && <QuestionDialog key={round?.id ?? 'new'} round={round} host={host}
      onAction={onAction} onClose={() => setOpen(false)} />}
  </>;
}

function QuestionDialog({ round, host, onAction, onClose }: {
  round: Snapshot['questionRound']; host: boolean; onAction?: ClassroomAction; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const requestPending = useRef(false);
  const titleId = useId();
  const promptId = useId();
  const answerId = useId();
  const visibilityId = useId();
  const [prompt, setPrompt] = useState('');
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
      </div>}

      {!host && round?.open && <form className="question-form"
        onSubmit={event => { event.preventDefault(); if (answer.trim()) void send({type:'question-answer', roundId:round.id, text:answer.trim()}, '답변을 저장했어요.'); }}>
        <label htmlFor={answerId}>내 답변</label>
        <textarea id={answerId} value={answer} maxLength={QUESTION_ANSWER_MAX_LENGTH} rows={3} required disabled={busy || !onAction}
          aria-describedby={visibilityId} onChange={event => setDraft(event.target.value)} placeholder="짧게 적어주세요." />
        <p id={visibilityId} className="question-meta">공개 전에는 강사와 본인만 볼 수 있어요. 공개하면 이름과 답변이 모두에게 보여요.</p>
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
          onClick={() => void send({type:'question-publish', roundId:round.id}, '답변을 공개했어요.')}>답변 공개</button>
        <p className="question-meta">{round.open ? '공개하면 질문을 마감하고 이름과 답변을 모두에게 보여줘요.' : '공개하면 이름과 답변을 모두에게 보여줘요.'}</p>
      </div>}

      {host && !round?.open && onAction && <form className="question-form"
        onSubmit={event => { event.preventDefault(); if (prompt.trim()) void send({type:'question-start', prompt:prompt.trim()}); }}>
        <label htmlFor={promptId}>{round ? '새 질문' : '질문'}</label>
        <textarea id={promptId} value={prompt} maxLength={QUESTION_PROMPT_MAX_LENGTH} rows={2} required disabled={busy}
          onChange={event => setPrompt(event.target.value)} placeholder="수강생에게 물어볼 질문을 적어주세요." />
        {round && <p className="question-meta">새 질문을 출제하면 이전 질문과 답변을 대체해요.</p>}
        <div className="question-actions">
          <button type="submit" className="primary" disabled={busy || !prompt.trim()}>질문 열기</button>
          <span className="question-meta">{prompt.length}/{QUESTION_PROMPT_MAX_LENGTH}</span>
        </div>
      </form>}

      {round && (host || round.published) && <section className="question-responses" aria-label={host ? '수강생 답변' : '공개된 답변'}>
        <h3>{host ? '수강생 답변' : '공개된 답변'}</h3>
        {round.answers?.length ? <ul className="question-answer-list">{round.answers.map(item => (
          <li key={item.seatNumber}>
            <b>{item.name}</b>
            <p className="question-answer-text">{item.text}</p>
          </li>
        ))}</ul> : <p className="question-meta">아직 답변이 없어요.</p>}
      </section>}

      {!onAction && (host || round?.open) && <p className="question-meta">강의실에 다시 연결되면 질문을 진행할 수 있어요.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="question-meta" role="status">{notice}</p>}
    </div>
  </dialog>;
}

export function ClassroomActivities({ data, host, onAction, renderHead }: {
  data: Snapshot; host: boolean; onAction?: ClassroomAction; renderHead: (character: Character) => ReactNode;
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
  renderHead: (character: Character) => ReactNode; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const photo = useRef<SVGSVGElement>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mySeat = data.seats.find(seat => seat.mine);
  const photoSeats = data.seats;
  const rows = Math.max(1, Math.ceil(photoSeats.length / 6));
  const photoHeight = 230 + rows * 110;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  async function run(input: Record<string, unknown>) {
    if (!onAction || busy) return;
    setBusy(true); setError('');
    try { await onAction(input); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '다시 시도해주세요.'); }
    finally { setBusy(false); }
  }
  async function savePhoto() {
    if (!photo.current || busy) return;
    setBusy(true); setError('');
    let source = '';
    let download = '';
    try {
      await document.fonts.ready;
      source = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(photo.current)], {type:'image/svg+xml;charset=utf-8'}));
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('단체사진을 만들지 못했어요.')); image.src = source; });
      const canvas = document.createElement('canvas');
      canvas.width = 900; canvas.height = photoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이 브라우저에서는 사진 저장을 지원하지 않아요.');
      context.drawImage(image, 0, 0);
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('사진 저장을 다시 시도해주세요.')), 'image/png'));
      download = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = download; anchor.download = `AI강의실-단체사진-${data.date}.png`;
      document.body.append(anchor); anchor.click(); anchor.remove();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '사진 저장을 다시 시도해주세요.'); }
    finally {
      if (source) URL.revokeObjectURL(source);
      if (download) window.setTimeout(() => URL.revokeObjectURL(download), 30_000);
      setBusy(false);
    }
  }
  return <dialog ref={dialog} className="classroom-character-dialog classroom-activities-dialog" aria-labelledby="classroom-activities-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="classroom-picker-heading"><h2 id="classroom-activities-title">교실 활동</h2><button className="icon-button" aria-label="교실 활동 닫기" type="button" disabled={busy} onClick={onClose}><X size={20}/></button></div>
    <div className="classroom-activities-content">
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
      <section aria-label="수업 단체사진"><h3>오늘의 단체사진</h3><p>지금 접속한 {photoSeats.length}명의 캐릭터와 닉네임을 사진에 담아요.</p>
        <button type="button" disabled={busy} onClick={()=>setTakingPhoto(value=>!value)}>{takingPhoto ? '사진 접기' : '단체사진 미리보기'}</button>
        {takingPhoto && <>
          <svg ref={photo} className="classroom-group-photo" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 900 ${photoHeight}`} role="img" aria-label="AI 강의실 단체사진" style={{color:'#283452',fontFamily:'sans-serif'}}>
            <rect width="900" height={photoHeight} rx="24" fill="#f3f5fc"/>
            <rect x="35" y="25" width="830" height="130" rx="12" fill="#325447" stroke="#d8bd89" strokeWidth="9"/>
            <text x="450" y="75" textAnchor="middle" fill="#fffef7" fontSize="30" fontWeight="700">오늘도 수고했어요!</text>
            <text x="450" y="110" textAnchor="middle" fill="#fffef7" fontSize="20">{data.title.slice(0,36)}</text>
            <text x="450" y="138" textAnchor="middle" fill="#dce9df" fontSize="16">{data.date} · AI환경연구소</text>
            {photoSeats.map((seat,index)=><g key={seat.number} transform={`translate(${45+index%6*140},${185+Math.floor(index/6)*110})`}>
              <svg x="17" y="0" width="88" height="68" viewBox="0 0 90 68" fill="none" stroke="#283452" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{renderHead(seat.character)}</svg>
              <text x="60" y="83" fill="#283452" fontSize="15" textAnchor="middle">{Array.from(seat.name).slice(0,9).join('')}</text>
            </g>)}
            <text x="450" y={photoHeight-20} textAnchor="middle" fontSize="16" fill="#4656a5">신현준 연구사 실시간 강의실 · 함께 배우는 우리</text>
          </svg>
          <button className="primary" type="button" disabled={busy} onClick={savePhoto}>{busy ? '사진 만드는 중' : '단체사진 PNG 저장'}</button>
        </>}
      </section>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  </dialog>;
}
