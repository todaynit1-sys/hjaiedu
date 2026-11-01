import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import { MAIN_ROOM_CODE } from '../lib/types';
export function ShareDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null); const [qr, setQr] = useState(''); const [url, setUrl] = useState(''); const [copied, setCopied] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    const url = code === MAIN_ROOM_CODE ? `${window.location.origin}/` : `${window.location.origin}/room/${code}`;
    setUrl(url); const dialog = dialogRef.current; const previous = document.activeElement as HTMLElement;
    dialog?.showModal(); let stopped = false;
    import('qrcode').then(module => module.toDataURL(url, { width: 280, margin: 2, color: { dark: '#1e293b', light: '#ffffff' }, errorCorrectionLevel: 'M' })).then(data => { if (!stopped) setQr(data); }).catch(() => { if (!stopped) setError('QR코드를 불러오지 못했어요. 아래 링크를 공유해주세요.'); });
    return () => { stopped = true; dialog?.close(); previous?.focus(); };
  }, [code]);
  async function copy() { try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setError('링크를 길게 누르거나 선택해서 복사해주세요.'); } }
  return <dialog className="share-dialog" ref={dialogRef} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby="share-title"><button className="dialog-close icon-button" onClick={onClose} aria-label="공유 창 닫기"><X size={20} /></button><span className="eyebrow">LET'S CONNECT</span><h2 id="share-title">우리 강의실로 오세요.</h2><p>QR코드를 스캔하거나 아래 참여 링크를 열어주세요.</p><div className="qr-box">{qr ? <img src={qr} alt={`강의실 ${code} 참여 QR코드`} width={280} height={280} /> : <span role="status">QR코드 준비 중…</span>}</div><span className="share-code-label">강의실 참여 코드</span><strong className="share-code">{code}</strong><label className="sr-only" htmlFor="share-url">참여 링크</label><input id="share-url" value={url} readOnly onFocus={e => e.target.select()} /><button className="primary" onClick={copy}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? '참여 링크를 복사했어요' : '참여 링크 복사'}</button>{qr && <a className="qr-download" download={`mamo-edu-${code}-qr.png`} href={qr}><Download size={15} />QR코드 저장</a>}{error && <p role="alert" className="error">{error}</p>}<span className="sr-only" role="status">{copied ? '참여 링크를 복사했습니다.' : ''}</span></dialog>;
}
