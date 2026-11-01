import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, Check, ClipboardList, Copy, Download, ExternalLink, FileSpreadsheet, FileText, Link2, LogOut, MessageCircle, MoreHorizontal, Paperclip, Pin, Plus, QrCode, RotateCcw, Send, Settings2, Trash2, Users, WifiOff, X } from 'lucide-react';
import { Brand } from './brand';
import { AboutLink } from './about-link';
import { BRAND_MARK } from '../lib/brand';
import { ContactLink } from './contact-link';
import { ResetDialog, RESET_LABELS } from './reset-dialog';
import { PollCard, NewPoll } from './poll-card';
import { PollManagementDialog } from './poll-management-dialog';
import { ShareDialog } from './share-dialog';
import { MaterialsDialog } from './materials-dialog';
import { api, dateLabel, timeLabel, uploadFile } from '../lib/client';
import { fileSize, MAX_FILE_BYTES } from '../lib/files';
import { SURVEY_RESPONSES_URL, SURVEY_URL } from '../lib/survey';
import type { PublicMessage, ResetTarget, Snapshot } from '../lib/types';

function MessageText({ text }: { text: string }) {
  return <>{text.split(/(https?:\/\/[^\s<>]+)/g).map((part, i) => /^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : part)}</>;
}
function ChatMessage({ code, message, host, editable, busy, onAction, onNotice }: { code: string; message: PublicMessage; host: boolean; editable: boolean; busy: boolean; onAction: (input: Record<string, unknown>, success: string) => Promise<void>; onNotice: (message: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const teacher = message.author !== 'student'; const mine = message.mine || (host && teacher);
  async function copy() { try { await navigator.clipboard.writeText(message.url ?? message.text); onNotice('복사했어요.'); } catch { onNotice('내용을 선택해서 복사해주세요.'); } }
  return <article className={`chat-message ${mine ? 'my-message' : ''} ${teacher ? 'teacher-message' : ''}`}>
    {!mine && <span className="chat-avatar" aria-hidden="true">{teacher ? <span>강</span> : <span>수</span>}</span>}
    <div className="chat-message-body"><div className="chat-meta"><b>{message.authorName ?? '강사'}</b>{teacher && <span>강사</span>}<time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time></div>
      <div className="chat-bubble"><p><MessageText text={message.text} /></p>{message.url && <a className="chat-link" href={message.url} target="_blank" rel="noopener noreferrer"><Link2 size={16} /><span>{new URL(message.url).hostname.replace('www.', '')}</span><ExternalLink size={14} /></a>}{message.attachment && <a className="chat-file" href={`/api/rooms/${code}/files/${message.attachment.id}`} download={message.attachment.name} aria-label={`${message.attachment.name} 다운로드`}><FileText size={22} aria-hidden="true" /><span><b>{message.attachment.name}</b><small>{fileSize(message.attachment.size)} · 오늘만 다운로드</small></span><Download size={18} aria-hidden="true" /></a>}</div>
      <details className="message-menu"><summary aria-label={`${message.text.slice(0, 20)} 메시지 메뉴`}><MoreHorizontal size={17} /></summary><div><button onClick={copy}><Copy size={14} />복사</button>{host && editable && <><button disabled={busy} onClick={() => onAction({ type: 'pin', id: message.id }, message.pinned ? '고정을 해제했어요.' : '메시지를 고정했어요.')}><Pin size={14} />{message.pinned ? '고정 해제' : '상단 고정'}</button><button disabled={busy} onClick={() => setConfirming(true)}><Trash2 size={14} />삭제</button></>}</div></details>
      {confirming && <div className="chat-delete" role="alert"><span>이 메시지를 삭제할까요?</span><button disabled={busy} onClick={() => onAction({ type: 'delete', id: message.id }, '메시지를 삭제했어요.')}>삭제하기</button><button onClick={() => setConfirming(false)}>취소</button></div>}
    </div>
  </article>;
}
function Composer({ host, busy, active, onAction, onUpload }: { host: boolean; busy: boolean; active: boolean; onAction: (input: Record<string, unknown>, success: string) => Promise<void>; onUpload: (file: File, id: string, caption: string, url: string) => Promise<void> }) {
  const [link, setLink] = useState(false); const [text, setText] = useState(''); const [url, setUrl] = useState(''); const [error, setError] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null); const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{ file: File; id: string } | null>(null);
  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!file.size || file.size > MAX_FILE_BYTES) { setError(file.size ? '파일은 개당 10MB까지 올릴 수 있어요.' : '빈 파일은 올릴 수 없어요.'); return; }
    if (file.name.length > 160) { setError('파일 이름을 160자 이내로 줄여주세요.'); return; }
    setError(''); setAttachment({ file, id: crypto.randomUUID() }); textRef.current?.focus();
  }
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (busy || !active) return; setError('');
    if (!text.trim() && !attachment) { setError('메시지를 입력해주세요.'); textRef.current?.focus(); return; }
    if (link) { try { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(); } catch { setError('http:// 또는 https://로 시작하는 링크를 입력해주세요.'); urlRef.current?.focus(); return; } }
    try {
      if (attachment) await onUpload(attachment.file, attachment.id, text, link ? url : '');
      else await onAction({ type: 'message', text, url: link ? url : null }, '메시지를 보냈어요.');
      setText(''); setUrl(''); setLink(false); setAttachment(null); textRef.current?.focus();
    } catch (e) { setError((e as Error).name === 'TimeoutError' ? '업로드 확인이 늦어지고 있어요. 다시 보내도 같은 파일이 중복 등록되지 않아요.' : (e as Error).message); }
  }
  return <form className="chat-composer" onSubmit={send}>
    {host && <input className="sr-only" ref={fileRef} type="file" tabIndex={-1} aria-label="수업 자료 파일 선택" disabled={!active || busy} onChange={chooseFile} />}
    {attachment && <div className="chat-file-draft"><FileText size={18} aria-hidden="true" /><span><b>{attachment.file.name}</b><small>{fileSize(attachment.file.size)} · 자정에 삭제 · 하루 총 50MB</small></span><button className="icon-button" type="button" disabled={busy} onClick={() => setAttachment(null)} aria-label="첨부 파일 취소"><X size={17} /></button></div>}
    {link && <div className="chat-url"><Link2 size={16} /><label className="sr-only" htmlFor="message-url">링크 주소</label><input id="message-url" ref={urlRef} type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" maxLength={2048} disabled={!active} /><button className="icon-button" type="button" onClick={() => setLink(false)} aria-label="링크 첨부 닫기"><X size={17} /></button></div>}
    <div className="chat-input-row">{host && <button className="attach-button file-attach-button" type="button" onClick={() => fileRef.current?.click()} aria-label="파일 첨부 (최대 10MB)" title="수업 자료 첨부 · 최대 10MB" disabled={!active || busy}><Paperclip size={20} /></button>}<button className={`attach-button ${link ? 'selected' : ''}`} type="button" onClick={() => setLink(!link)} aria-label="링크 첨부" aria-pressed={link} disabled={!active || busy}><Link2 size={20} /></button><label htmlFor="message-text" className="sr-only">채팅 메시지</label><textarea id="message-text" ref={textRef} value={text} onChange={e => setText(e.target.value)} placeholder={active ? '메시지나 질문을 입력하세요.' : '지금은 채팅을 보낼 수 없어요.'} maxLength={2000} rows={1} disabled={!active || busy} aria-invalid={Boolean(error)} aria-describedby={error ? 'composer-error' : undefined} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} /><button className="chat-send" type="submit" disabled={busy || !active} aria-label={busy ? (attachment ? '파일 올리는 중' : '메시지 보내는 중') : (attachment ? '파일 보내기' : '메시지 보내기')}><Send size={19} /></button></div>
    <div className="composer-hint"><span className="composer-instructions">{active ? 'Enter 전송 · Shift + Enter 줄바꿈' : '강사가 강의를 다시 시작하면 참여할 수 있어요.'}</span><div className="composer-meta"><ContactLink /><span>{text.length}/2000</span></div></div>{error && <p className="error" role="alert" id="composer-error">{error}</p>}
  </form>;
}
function QuestionDialog({ busy, onAction, onClose }: { busy: boolean; onAction: (input: Record<string, unknown>, success: string) => Promise<void>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement; const dialog = ref.current; dialog?.showModal(); dialog?.querySelector<HTMLInputElement>('#poll-question')?.focus(); return () => { dialog?.close(); previous?.focus(); }; }, []);
  return <dialog className="share-dialog question-dialog" ref={ref} aria-labelledby="question-dialog-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><button className="dialog-close icon-button" disabled={busy} onClick={onClose} aria-label="새 투표 만들기 닫기"><X size={20} /></button><h2 id="question-dialog-title">새 투표 만들기</h2><p>수업 중 궁금한 것을 물어보세요.</p><NewPoll busy={busy} onAction={async (input, success) => { await onAction(input, success); onClose(); }} /></dialog>;
}
export function RoomView({ code, host, onBack, onLogout }: { code: string; host: boolean; onBack?: () => void; onLogout?: () => Promise<void> }) {
  const [data, setData] = useState<Snapshot | null>(null); const [date, setDate] = useState(''); const [error, setError] = useState(''); const [connected, setConnected] = useState(true); const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(false); const [questions, setQuestions] = useState(false); const [tab, setTab] = useState<'all' | 'links'>('all'); const [notice, setNotice] = useState(''); const [history, setHistory] = useState(false); const [unread, setUnread] = useState(false);
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [managedPollId, setManagedPollId] = useState<string | null>(null);
  const [materials, setMaterials] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const scroller = useRef<HTMLDivElement>(null); const nearBottom = useRef(true); const forceBottom = useRef(false);
  function notify(message: string) { setNotice(message); if (noticeTimer.current) clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''), 4000); }
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);
  useEffect(() => { let stopped = false; api<Snapshot>(`/api/rooms/${code}`, { type: host ? 'start-day' : 'join' }).then(value => { if (!stopped) { setData(value); setDate(value.date); setError(''); } }).catch(e => { if (!stopped) setError(e.message); }); return () => { stopped = true; }; }, [code, host]);
  useEffect(() => {
    if (!date) return;
    let stopped = false; let socket: WebSocket | null = null; let retry = 0; let lastSignal = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ping: ReturnType<typeof setInterval> | undefined;
    function connect() {
      if (stopped) return;
      const url = new URL(`/api/rooms/${code}/live`, window.location.href);
      url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(url);
      socket.onopen = () => { retry = 0; lastSignal = Date.now(); setConnected(true); setError(''); ping = setInterval(() => { if (Date.now() - lastSignal > 70_000) socket?.close(); else if (socket?.readyState === WebSocket.OPEN) socket.send('ping'); }, 30_000); };
      socket.onmessage = event => {
        lastSignal = Date.now();
        if (event.data === 'pong') return;
        try { const update = JSON.parse(event.data); if (update.type !== 'snapshot') return;
          const value = update.data as Snapshot; setData(value); setDate(value.date);
          if (value.date !== date) { setHistory(false); notify('새 날짜로 시작했어요. 채팅과 투표가 초기화됐습니다.'); }
        } catch { /* A later snapshot can recover a malformed update. */ }
      };
      socket.onclose = () => {
        if (ping) clearInterval(ping);
        if (stopped) return;
        setConnected(false); setError('연결이 끊어져 다시 연결하고 있어요.');
        timer = setTimeout(() => {
          api<Snapshot>(`/api/rooms/${code}`, { type: host ? 'start-day' : 'join' }).then(connect).catch(() => { if (!stopped) connect(); });
        }, Math.min(10_000, 500 * 2 ** retry++) + Math.random() * 250);
      };
      socket.onerror = () => socket?.close();
    }
    function refresh() { if (!document.hidden && socket?.readyState === WebSocket.OPEN) socket.send('refresh'); }
    connect(); document.addEventListener('visibilitychange', refresh);
    return () => { stopped = true; clearTimeout(timer); clearInterval(ping); document.removeEventListener('visibilitychange', refresh); socket?.close(); };
  }, [code, date, host]);
  const action = useCallback(async (input: Record<string, unknown>, success: string) => { setBusy(true); try { const value = await api<Snapshot>(`/api/rooms/${code}`, { ...input, date }); if (input.type === 'message') forceBottom.current = true; setData(value); setConnected(true); setError(''); notify(success); } catch (e) { setError((e as Error).message); throw e; } finally { setBusy(false); } }, [code, date]);
  const safeAction = useCallback(async (input: Record<string, unknown>, success: string) => { try { await action(input, success); } catch { /* visible room error */ } }, [action]);
  const attachFile = useCallback(async (file: File, id: string, caption: string, url: string) => {
    setBusy(true);
    try {
      const value = await uploadFile<Snapshot>(code, date, file, id, caption, url);
      forceBottom.current = true; setTab('all'); setData(value); setConnected(true); setError(''); notify('파일을 공유했어요. 오늘 자정까지 내려받을 수 있어요.');
    } catch (e) { setError((e as Error).message); throw e; } finally { setBusy(false); }
  }, [code, date]);
  const messages = data?.messages.filter(m => tab === 'all' || m.url || /https?:\/\//.test(m.text)) ?? []; const lastId = messages.at(-1)?.id;
  function scrollLatest() { const element = scroller.current; if (element) element.scrollTop = element.scrollHeight; nearBottom.current = true; setUnread(false); }
  useEffect(() => { nearBottom.current = true; setUnread(false); }, [date, tab]);
  useEffect(() => { if (nearBottom.current || forceBottom.current) { scrollLatest(); forceBottom.current = false; } else setUnread(true); }, [lastId, date, tab]);
  const pinned = data?.messages.find(m => m.pinned); const editable = Boolean(data && data.date === data.today); const active = Boolean(data?.active && editable && connected);
  const roomControls = data ? <div className="live-room-actions"><span className="live-online"><Users size={16} /><b>{data.online}</b><span>접속 중</span></span><details className="room-settings"><summary aria-label="강의실 설정"><Settings2 size={20} /></summary><div className="settings-panel"><p className="daily-retention">오늘 {dateLabel(data.date)}<br />채팅·투표·첨부 자료는 한국 시간 자정에 초기화됩니다.</p>{data.polls.some(p => p.archived) && <button aria-pressed={history} onClick={() => setHistory(!history)}>{history ? '현재 투표 보기' : '이전 투표 결과 보기'}</button>}<p>채팅과 투표 결과가 실시간으로 반영돼요.</p>{data.mode === 'local' && <p>현재 로컬 미리보기입니다. 예시 메시지 외의 채팅·응답 수는 실제 참여로 집계됩니다.</p>}{host && editable && <div className="room-reset-actions"><p>강사 초기화</p>{(['chat', 'mood', 'break'] as const).map(target => <button key={target} disabled={busy || !connected} onClick={() => setResetTarget(target)}><RotateCcw size={14} />{RESET_LABELS[target]} 초기화</button>)}</div>}{host && editable && <button disabled={busy} onClick={() => safeAction({ type: 'active', active: !data.active }, data.active ? '오늘 강의를 종료했어요.' : '강의를 다시 시작했어요.')}>{data.active ? '오늘 강의 종료' : '강의 다시 시작'}</button>}{host && onBack ? <button onClick={onBack}><ArrowLeft size={15} />내 강의실 목록</button> : <a href="/join"><ArrowLeft size={15} />다른 강의실 참여</a>}</div></details></div> : null;
  return <div className={`live-room${host ? ' is-host' : ''}`}><a className="skip-link" href="#main">본문으로 건너뛰기</a><header className="live-header"><Brand roomCode={code} hostAccess={!host} /><div className="live-header-actions"><AboutLink />{data && !data.demo && <a className="survey-link" href={SURVEY_URL} target="_blank" rel="noopener noreferrer" aria-label="수업 설문 참여 (새 탭)"><ClipboardList size={15} /><span>수업 설문</span></a>}{host && <span className="live-role">강사</span>}{host && onLogout && <button className="icon-button" aria-label="로그아웃" onClick={() => onLogout().catch(e => setError(e.message))}><LogOut size={18} /></button>}<button className="live-share" aria-label="참여 링크" onClick={() => setShare(true)}><QrCode size={18} /><span>참여 링크</span></button>{roomControls}</div></header>
    {!data ? <main id="main" className="live-loading"><img src={BRAND_MARK} width="64" height="64" alt="" /><h1>{error ? '강의실에 연결하지 못했어요.' : '강의실을 열고 있어요.'}</h1>{error ? <><p role="alert">{error}</p><button className="primary" onClick={() => window.location.reload()}>다시 연결</button><a href="/join">다른 강의실 참여</a></> : <p role="status">채팅과 투표를 준비하고 있어요.</p>}</main> : <>

      {error && <div className="live-error" role="alert"><WifiOff size={17} /><span>{error}</span><button aria-label="오류 메시지 닫기" onClick={() => setError('')}><X size={16} /></button></div>}
      <main id="main" className="live-workspace"><h1 className="room-accessible-title">{data.title}</h1><aside className="live-polls" aria-labelledby="polls-title"><h2 id="polls-title" className="sr-only">실시간 투표</h2>{host && <div className="live-polls-heading"><div className="live-poll-actions">{!data.demo && <a className="icon-button survey-responses" href={SURVEY_RESPONSES_URL} target="_blank" rel="noopener noreferrer" aria-label="설문 응답 시트 보기 (새 탭)" title="설문 응답 시트 보기"><FileSpreadsheet size={17} /></a>}{active && <button className="new-poll-button" onClick={() => setQuestions(true)} aria-label="새 투표 만들기" aria-haspopup="dialog"><Plus size={17} /><span>새 투표</span></button>}</div></div>}<div className="live-poll-scroll">{data.polls.filter(p => history ? p.archived : !p.archived).map(poll => <PollCard key={poll.id} poll={poll} host={host && !history} active={active && !history} busy={busy} onAction={safeAction} onManage={() => setManagedPollId(poll.id)} />)}{history && !data.polls.some(p => p.archived) && <p className="poll-empty">이전 투표 결과가 아직 없어요.</p>}</div>{data.polls.some(p => p.archived) && <div className="live-poll-note"><button aria-pressed={history} onClick={() => setHistory(!history)}>{history ? '현재 투표' : '이전 결과'}</button></div>}</aside>
        <section className="live-chat" aria-labelledby="chat-title"><div className="live-chat-heading"><h2 id="chat-title"><MessageCircle size={20} />실시간 채팅</h2><div className="chat-header-tools"><button className="materials-button" onClick={() => setMaterials(true)} aria-label="기본 실습자료 다운로드" aria-haspopup="dialog"><Download size={14} aria-hidden="true" /><span>자료</span></button><div className="chat-filters" role="group" aria-label="채팅 필터"><button className={tab === 'all' ? 'selected' : ''} aria-pressed={tab === 'all'} onClick={() => setTab('all')}>전체</button><button className={tab === 'links' ? 'selected' : ''} aria-pressed={tab === 'links'} onClick={() => setTab('links')}><Link2 size={14} />링크</button></div></div></div>
          {pinned && <div className="chat-pinned"><Pin size={14} /><span>고정</span>{pinned.url ? <a href={pinned.url} target="_blank" rel="noopener noreferrer">{pinned.text}</a> : <p>{pinned.text}</p>}{pinned.url && <ExternalLink size={13} />}</div>}
          <div className="chat-scroll" ref={scroller} tabIndex={0} aria-label="채팅 메시지 목록" onScroll={() => { const el = scroller.current; if (el) { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 65; if (nearBottom.current) setUnread(false); } }}><p className="chat-date">{dateLabel(data.date)}{data.demo ? ' · 예시 강의실' : ''}</p><div role="log" aria-live="polite" aria-relevant="additions" aria-label="실시간 채팅 메시지">{messages.map(message => <ChatMessage key={message.id} code={code} message={message} host={host} editable={editable} busy={busy} onAction={safeAction} onNotice={notify} />)}</div>{messages.length === 0 && <div className="chat-empty"><img src={BRAND_MARK} alt="" width="64" height="64" /><h3>{tab === 'links' ? '공유된 링크가 아직 없어요.' : '아직 메시지가 없습니다.'}</h3><p>{tab === 'links' ? '링크가 담긴 메시지가 여기에 모여요.' : '메시지나 실습 링크를 공유해보세요.'}</p></div>}</div>
          {unread && <button className="new-messages" onClick={scrollLatest}><ArrowDown size={15} />새 메시지 보기</button>}<Composer host={host} busy={busy} active={active} onAction={action} onUpload={attachFile} />
        </section></main></>}
    <div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice && <><Check size={17} /><span>{notice}</span></>}</div>{materials && <MaterialsDialog onClose={() => setMaterials(false)} />}{share && <ShareDialog code={code} onClose={() => setShare(false)} />}{questions && <QuestionDialog busy={busy} onAction={action} onClose={() => setQuestions(false)} />}{data && managedPollId && host && active && !history && data.polls.filter(poll => poll.id === managedPollId && !poll.archived).map(poll => <PollManagementDialog key={poll.id} poll={poll} busy={busy} onAction={action} onClose={() => setManagedPollId(null)} />)}{resetTarget && host && <ResetDialog target={resetTarget} busy={busy} onAction={action} onClose={() => setResetTarget(null)} />}
  </div>;
}
