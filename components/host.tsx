import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, LockKeyhole, Plus } from 'lucide-react';
import { Brand } from './brand';
import { AboutLink } from './about-link';
import { api } from '../lib/client';
import { RoomView } from './room-view';
type RoomItem = { code: string; title: string; demo: boolean };
export function Host() {
  const [authed, setAuthed] = useState<boolean | null>(null); const [error, setError] = useState('');
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const [rooms, setRooms] = useState<RoomItem[]>([]); const [selected, setSelected] = useState(''); const [title, setTitle] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null); const titleRef = useRef<HTMLInputElement>(null);
  const loadRooms = useCallback(async () => { setRooms(await api<RoomItem[]>('/api/rooms')); }, []);
  useEffect(() => {
    api<{ host: boolean }>('/api/auth').then(async data => {
      setAuthed(data.host);
      if (data.host) { await loadRooms(); const code = new URLSearchParams(window.location.search).get('room'); if (code && /^[A-Z0-9]{6}$/.test(code)) setSelected(code); }
    }).catch(e => { setError(e.message); setAuthed(false); });
  }, [loadRooms]);
  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/api/auth', { password }); setPassword(''); await loadRooms(); setAuthed(true); const code = new URLSearchParams(window.location.search).get('room'); if (code && /^[A-Z0-9]{6}$/.test(code)) setSelected(code); }
    catch (e) { setError((e as Error).message); passwordRef.current?.focus(); }
    finally { setBusy(false); }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const room = await api<{ code: string }>('/api/rooms', { title }); await loadRooms(); setTitle(''); openRoom(room.code); }
    catch (e) { setError((e as Error).message); titleRef.current?.focus(); }
    finally { setBusy(false); }
  }
  function openRoom(code: string) { setSelected(code); window.history.replaceState(null, '', `/host?room=${code}`); }
  async function signOut() { await api('/api/auth', { type: 'logout' }); setAuthed(false); setSelected(''); }
  if (authed && selected) return <RoomView key={selected} code={selected} host onBack={() => { setSelected(''); window.history.replaceState(null, '', '/host'); loadRooms().catch(e => setError(e.message)); }} onLogout={signOut} />;
  return <div className="host-page"><a className="skip-link" href="#main">본문으로 건너뛰기</a><header className="entry-header"><Brand hostAccess={false} /><div className="entry-header-actions"><AboutLink /><a className="host-entry" href="/">수강생으로 참여 <ArrowUpRight size={17} /></a></div></header><main id="main" className={authed ? 'host-main' : 'login-main'}>
    {authed === null ? <div className="loading-state" role="status">강사 공간을 불러오는 중입니다…</div> : authed ? <><div className="host-heading"><div><span className="eyebrow">TEACHER'S SPACE</span><h1>나의 강의실</h1><p>강의실을 만들고, 참여 링크를 공유해보세요.</p></div><button className="text-button" onClick={() => signOut().catch(e => setError(e.message))}>로그아웃</button></div><form className="create-room" onSubmit={create}><label htmlFor="lecture-title">새 강의 이름</label><div className="entry-field"><input id="lecture-title" ref={titleRef} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 금요일 AI 활용 수업" maxLength={80} required aria-describedby={error ? 'host-error' : undefined} /><button className="primary" disabled={busy}><Plus size={18} />강의실 만들기</button></div></form><div className="room-list">{rooms.map(room => <button className="room-item" key={room.code} onClick={() => openRoom(room.code)}><span className="room-item-icon"><BookOpen size={24} /></span><div>{room.demo && <span className="sample-tag">미리보기</span>}<h2>{room.title}</h2>{room.code === 'MAMOAI' && <span className="main-room-label">기본 강의실 · 홈페이지에서 바로 참여</span>}<span>참여 코드 <b>{room.code}</b></span></div><ArrowRight size={20} /></button>)}{rooms.length === 0 && <p className="empty-text">아직 강의실이 없어요. 첫 강의실을 만들어보세요.</p>}</div></> : <section className="login-panel"><span className="login-icon"><LockKeyhole size={27} /></span><span className="eyebrow">TEACHER'S SPACE</span><h1>강사 공간에<br />들어오세요.</h1><p>수강생과 채팅을 나누고,<br />오늘의 반응을 한눈에 확인하세요.</p><form onSubmit={signIn}><label htmlFor="host-password">강사 접속 코드</label><input id="host-password" ref={passwordRef} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required aria-invalid={Boolean(error)} aria-describedby={error ? 'host-error' : undefined} /><button className="primary" disabled={busy}>{busy ? '확인 중…' : '강사로 들어가기'}<ArrowRight size={18} /></button></form></section>}
    {error && <p id="host-error" role="alert" className="error">{error}</p>}
  </main></div>;
}
