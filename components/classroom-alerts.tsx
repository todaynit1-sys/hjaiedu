import { useId, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, CircleHelp, ListChecks, MessageSquare, X } from 'lucide-react';
import { QUESTION_ANSWER_MAX_LENGTH, type PublicMessage, type PublicQuestionRound } from '../lib/types';
import '../app/classroom-alerts.css';

const PREVIEW_LIMIT = 140;

function previewText(text: string) {
  const characters = Array.from(text.trim().replace(/\s+/g, ' '));
  return characters.length > PREVIEW_LIMIT ? characters.slice(0, PREVIEW_LIMIT).join('') + '…' : characters.join('');
}

const alertIcons = { message: MessageSquare, question: CircleHelp, results: ListChecks };

function ClassroomAlert({ kind, title, dismissLabel, onDismiss, children }: {
  kind: keyof typeof alertIcons;
  title: string;
  dismissLabel: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const Icon = alertIcons[kind];
  return <section className="classroom-alert" data-kind={kind} aria-labelledby={titleId}>
    <h2 id={titleId} className="classroom-alert-title"><Icon size={17} aria-hidden="true" />{title}</h2>
    <button type="button" className="classroom-alert-close" aria-label={dismissLabel} onClick={onDismiss}>
      <X size={18} aria-hidden="true" />
    </button>
    {children}
  </section>;
}

type AnswerQuestion = (roundId: string, text: string) => Promise<void>;

function QuestionCard({ round, onAnswer, onDismiss }: {
  round: PublicQuestionRound;
  onAnswer?: AnswerQuestion;
  onDismiss: () => void;
}) {
  const answerId = useId();
  const promptId = useId();
  const privacyId = useId();
  const pending = useRef(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const answer = draft.trim();
    if (!onAnswer || !answer || pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError('');
    try {
      await onAnswer(round.id, answer);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '답변을 보내지 못했어요. 다시 시도해 주세요.');
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  return <ClassroomAlert kind="question" title="새 질문" dismissLabel="질문 나중에 보기" onDismiss={onDismiss}>
    <p id={promptId} className="classroom-alert-prompt">{round.prompt}</p>
    <form className="classroom-alert-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label htmlFor={answerId} className="sr-only">내 답변</label>
      <textarea id={answerId} rows={2} placeholder="내 답변을 적어 주세요" value={draft}
        maxLength={QUESTION_ANSWER_MAX_LENGTH} disabled={submitting}
        aria-describedby={`${promptId} ${privacyId}`} onChange={event => setDraft(event.target.value)} />
      <div className="classroom-alert-form-footer">
        <p id={privacyId}>강사가 공개하면 이름과 답변이 모두에게 보여요.</p>
        <button type="submit" className="classroom-alert-action" disabled={!onAnswer || submitting || !draft.trim()}>
          {submitting ? '보내는 중' : '답변 보내기'}
        </button>
      </div>
      {!onAnswer && <p className="classroom-alert-status" role="status">다시 연결되면 답변을 보낼 수 있어요.</p>}
      {error && <p className="classroom-alert-error" role="alert">{error}</p>}
    </form>
  </ClassroomAlert>;
}

function QuestionResultsCard({ round, onDismiss }: { round: PublicQuestionRound; onDismiss: () => void }) {
  return <ClassroomAlert kind="results" title="공개된 답변" dismissLabel="공개된 답변 닫기" onDismiss={onDismiss}>
    <p className="classroom-alert-prompt">{round.prompt}</p>
    <p className="classroom-alert-count">답변 {round.total}개</p>
    {round.answers?.length ? <ul className="classroom-alert-answers" tabIndex={0} aria-label="수강생 답변">
      {round.answers.map(answer => <li key={answer.seatNumber}>
        <b>{answer.name}</b>
        <p>{answer.text}</p>
      </li>)}
    </ul> : <p className="classroom-alert-status">아직 답변이 없어요.</p>}
  </ClassroomAlert>;
}

export function ClassroomAlerts({ message, question, onOpenChat, onDismissMessage, onDismissQuestion, onAnswerQuestion }: {
  message?: PublicMessage;
  question?: PublicQuestionRound;
  onOpenChat: () => void;
  onDismissMessage: () => void;
  onDismissQuestion: () => void;
  onAnswerQuestion?: AnswerQuestion;
}) {
  const messageText = message ? previewText(message.text.trim() || message.attachment?.name || '새 메시지가 도착했어요.') : '';
  const questionText = question ? previewText(question.prompt) : '';

  return <>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message && <span key={message.id}>강사 알림. {messageText}</span>}
    </div>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {question?.published ? <span key={`${question.id}-published`}>답변 {question.total}개가 공개됐어요.</span>
        : question && <span key={question.id}>새 질문. {questionText}</span>}
    </div>
    {(message || question) && <aside className="classroom-alerts" aria-label="강의 알림">
      <div className="classroom-alerts-stack">
        {question?.published ? <QuestionResultsCard round={question} onDismiss={onDismissQuestion} />
          : question && <QuestionCard key={question.id} round={question} onAnswer={onAnswerQuestion} onDismiss={onDismissQuestion} />}
        {message && <ClassroomAlert kind="message" title="강사 알림" dismissLabel="강사 알림 닫기" onDismiss={onDismissMessage}>
          <p className="classroom-alert-text">{messageText}</p>
          <button type="button" className="classroom-alert-action" onClick={onOpenChat}>
            채팅 보기<ArrowRight size={15} aria-hidden="true" />
          </button>
        </ClassroomAlert>}
      </div>
    </aside>}
  </>;
}
