import { Check, Copy, Mail } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { CONTACT_EMAIL } from '../lib/brand';

export function ContactLink() {
  const [copied, setCopied] = useState(false); const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    setError('');
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL); setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch { setCopied(false); setError('주소를 선택해 직접 복사해주세요.'); }
  }
  return <div className="contact-block"><div className="contact-link"><Mail size={13} aria-hidden="true" /><span className="contact-label">문의</span><span className="contact-email">{CONTACT_EMAIL}</span><button className="contact-copy" type="button" onClick={copy} aria-label="문의 이메일 주소 복사">{copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}<span>{copied ? '완료' : '복사'}</span></button><span className="sr-only" role="status">{copied ? '이메일 주소를 복사했어요.' : ''}</span></div>{error && <span className="contact-copy-error" role="alert">{error}</span>}</div>;
}
