import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { api } from '../lib/client';
import { MAIN_ROOM_CODE } from '../lib/types';
import { APP_NAME, APP_SUBTITLE, BRAND_MARK } from '../lib/brand';

export function Brand({ roomCode = MAIN_ROOM_CODE, hostAccess = true }: { roomCode?: string; hostAccess?: boolean }) {
  const taps = useRef({ count: 0, last: 0 });
  const [signIn, setSignIn] = useState(false);
  const symbol = <img className="brand-mark" src={BRAND_MARK} width="34" height="34" alt="신현준 AI환경연구소 HJ 심볼" />;
  const wordmark = <span className="brand-wordmark"><span className="brand-title">{APP_NAME}</span><small>{APP_SUBTITLE}</small></span>;
  function tapSymbol() {
    const now = Date.now();
    taps.current.count = now - taps.current.last > 5000 ? 1 : taps.current.count + 1;
    taps.current.last = now;
    if (taps.current.count === 5) { taps.current.count = 0; setSignIn(true); }
  }
  if (!hostAccess) return <a href="/" className="brand" aria-label={`${APP_NAME} 홈`}>{symbol}{wordmark}</a>;
  return <><div className="brand"><button className="brand-access" type="button" onClick={tapSymbol} aria-label={`${APP_NAME} 로고`}>{symbol}</button><a className="brand-home" href="/" aria-label={`${APP_NAME} 홈`}>{wordmark}</a></div>{signIn && <HostAccessDialog roomCode={roomCode} onClose={() => setSignIn(false)} />}</>;
}

function HostAccessDialog({ roomCode, onClose }: { roomCode: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    dialog?.showModal(); passwordRef.current?.focus();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  async function signIn(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { await api('/api/auth', { password }); window.location.assign(`/host?room=${roomCode}`); }
    catch (e) { setError((e as Error).message); passwordRef.current?.focus(); setBusy(false); }
  }
  return <dialog className="share-dialog host-access-dialog" ref={dialogRef} aria-labelledby="host-access-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <button className="dialog-close icon-button" type="button" onClick={onClose} disabled={busy} aria-label="강사 로그인 닫기"><X size={20} /></button>
    <h2 id="host-access-title">강사 로그인</h2>
    <form onSubmit={signIn}><label htmlFor="host-access-code">강사 접속 코드</label><input id="host-access-code" ref={passwordRef} type="password" inputMode="numeric" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? 'host-access-error' : undefined} />{error && <p id="host-access-error" className="error" role="alert">{error}</p>}<button className="primary" type="submit" disabled={busy}>{busy ? '확인 중…' : '강사로 들어가기'}<ArrowRight size={18} /></button></form>
  </dialog>;
}
