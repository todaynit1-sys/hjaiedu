import { ArrowRight, CircleHelp, MessageSquare, X } from 'lucide-react';
import type { PublicMessage, PublicQuestionRound } from '../lib/types';
import '../app/classroom-alerts.css';

const PREVIEW_LIMIT = 140;

function previewText(text: string) {
  const characters = Array.from(text.trim().replace(/\s+/g, ' '));
  return characters.length > PREVIEW_LIMIT ? characters.slice(0, PREVIEW_LIMIT).join('') + '…' : characters.join('');
}

function ClassroomAlert({ kind, title, text, action, dismissLabel, onOpen, onDismiss }: {
  kind: 'message' | 'question';
  title: string;
  text: string;
  action: string;
  dismissLabel: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const Icon = kind === 'question' ? CircleHelp : MessageSquare;
  return <section className="classroom-alert" data-kind={kind} aria-label={title}>
    <h2 className="classroom-alert-title"><Icon size={17} aria-hidden="true" />{title}</h2>
    <button type="button" className="classroom-alert-close" aria-label={dismissLabel} onClick={onDismiss}>
      <X size={18} aria-hidden="true" />
    </button>
    <p className="classroom-alert-text">{text}</p>
    <button type="button" className="classroom-alert-action" aria-haspopup={kind === 'question' ? 'dialog' : undefined} onClick={onOpen}>
      {action}<ArrowRight size={15} aria-hidden="true" />
    </button>
  </section>;
}

export function ClassroomAlerts({ message, question, onOpenChat, onOpenQuestion, onDismissMessage, onDismissQuestion }: {
  message?: PublicMessage;
  question?: PublicQuestionRound;
  onOpenChat: () => void;
  onOpenQuestion: () => void;
  onDismissMessage: () => void;
  onDismissQuestion: () => void;
}) {
  const messageText = message ? previewText(message.text.trim() || message.attachment?.name || '새 메시지가 도착했어요.') : '';
  const questionText = question ? previewText(question.prompt) : '';

  return <>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message && <span key={message.id}>강사 알림. {messageText}</span>}
    </div>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {question && <span key={question.id}>새 질문. {questionText}</span>}
    </div>
    {(message || question) && <aside className="classroom-alerts" aria-label="강의 알림">
      <div className="classroom-alerts-stack">
        {question && <ClassroomAlert kind="question" title="새 질문" text={questionText} action="질문 답하기"
          dismissLabel="새 질문 알림 닫기" onOpen={onOpenQuestion} onDismiss={onDismissQuestion} />}
        {message && <ClassroomAlert kind="message" title="강사 알림" text={messageText} action="채팅 보기"
          dismissLabel="강사 알림 닫기" onOpen={onOpenChat} onDismiss={onDismissMessage} />}
      </div>
    </aside>}
  </>;
}
