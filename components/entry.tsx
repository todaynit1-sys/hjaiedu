import { useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, ClipboardList } from 'lucide-react';
import { Brand } from './brand';
import { AboutLink } from './about-link';
import { ContactLink } from './contact-link';
import { api } from '../lib/client';
import { SURVEY_URL } from '../lib/survey';
import { APP_NAME, APP_SUBTITLE, CLASSROOM_NAME } from '../lib/brand';
export function Entry({ preview }: { preview: boolean }) {
  const [code, setCode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  async function enter(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (!/^[A-Z0-9]{6}$/.test(code)) { setError('강사에게 받은 6자리 참여 코드를 입력해주세요.'); inputRef.current?.focus(); return; }
    setBusy(true);
    try { await api(`/api/rooms/${code}`, { type: 'join' }); window.location.assign(`/room/${code}`); }
    catch (e) { setError((e as Error).message); inputRef.current?.focus(); setBusy(false); }
  }
  return <div className="entry-page">
    <a className="skip-link" href="#main">본문으로 건너뛰기</a>
    <header className="entry-header"><Brand /><div className="entry-header-actions"><AboutLink /><a className="survey-link" href={SURVEY_URL} target="_blank" rel="noopener noreferrer" aria-label="수업 설문 참여 (새 탭)"><ClipboardList size={15} /><span>수업 설문</span></a></div></header>
    <main id="main" className="entry-main">
      <section className="entry-copy"><span className="eyebrow"><span className="little-line" /> {APP_NAME} · 실시간 강의실</span><h1>질문과 자료 공유,<br />수업의 한 화면에.</h1><p className="entry-description">신현준 연구사와 채팅으로 소통하고,<br />실시간 투표로 수업에 함께 참여하세요.</p>
        <form onSubmit={enter} className="entry-form"><label htmlFor="room-code">강의실 참여 코드</label><div className="entry-field"><input id="room-code" ref={inputRef} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} maxLength={6} placeholder="6자리 코드 입력" autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? 'entry-error' : 'entry-hint'} /><button className="primary" disabled={busy} type="submit">{busy ? '참여 중' : '참여하기'}<ArrowRight size={18} /></button></div><p id="entry-hint" className="hint">로그인 없이 참여할 수 있어요.</p>{error && <p id="entry-error" role="alert" className="error">{error}</p>}</form>
        {preview && <a className="demo-link" href="/room/DEMO26">강의실 미리 둘러보기 <ArrowUpRight size={16} /></a>}
      </section>
      <section className="entry-art" aria-label={APP_SUBTITLE}><img src="/branding/hj-environment-wordmark.svg" width={680} height={320} alt={`${CLASSROOM_NAME} · 실시간 강의실`} /></section>
    </main><footer className="entry-footer"><span>{CLASSROOM_NAME}</span><span>채팅 · 자료 공유 · 실시간 투표</span><ContactLink /></footer>
  </div>;
}
