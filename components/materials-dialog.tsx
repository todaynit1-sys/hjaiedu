import { Download, FileText, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { fileSize } from '../lib/files';
import { MATERIALS } from '../lib/materials';

export function MaterialsDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current; dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="share-dialog materials-dialog" aria-labelledby="materials-title" aria-describedby="materials-description" onCancel={event => { event.preventDefault(); onClose(); }}>
    <button className="dialog-close icon-button" onClick={onClose} aria-label="기본 실습자료 닫기"><X size={20} /></button>
    <h2 id="materials-title">기본 실습자료</h2>
    <p id="materials-description">강의와 실습에 사용할 PDF를 내려받으세요.</p>
    <ul className="materials-list">{MATERIALS.map(material => <li key={material.url}>
      <a href={material.url} download={material.filename} aria-label={`${material.title} PDF 다운로드`}>
        <FileText size={21} aria-hidden="true" />
        <span><b>{material.title}</b><span className="material-description">{material.description}</span><small>PDF · {material.pages}쪽 · {fileSize(material.size)}</small></span>
        <Download size={18} aria-hidden="true" />
      </a>
    </li>)}</ul>
    <p className="materials-note">상시 제공 자료입니다. 자정이 지나도 받을 수 있어요.</p>
  </dialog>;
}
