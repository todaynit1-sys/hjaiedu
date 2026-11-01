import { Mail } from 'lucide-react';
import { CONTACT_EMAIL } from '../lib/brand';

export function AboutLink() {
  return <a className="about-link" href={`mailto:${CONTACT_EMAIL}`} aria-label="신현준 연구사에게 이메일 문의" title={CONTACT_EMAIL}><Mail size={18} aria-hidden="true" /></a>;
}
