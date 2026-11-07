import { useEffect, useId, useRef, useState } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';
import { listClassroomMemories, type ClassroomMemory } from '../lib/classroom-portfolio';
import '../app/classroom-portfolio.css';

export function photoReflectionLines(value: string): string[] {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return [];
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return [text];
  context.font = '20px sans-serif';
  const lines: string[] = [];
  let line = '';
  for (const letter of Array.from(text)) {
    if (line && context.measureText(line + letter).width > 770) {
      lines.push(line.trimEnd());
      line = letter.trimStart();
    } else line += letter;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderGroupPhoto(svg: SVGSVGElement, width: number, height: number): Promise<Blob> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  await document.fonts.ready;
  const source = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], {type: 'image/svg+xml;charset=utf-8'}));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('단체사진을 만들지 못했어요. 다시 시도해주세요.'));
      image.src = source;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서는 사진 저장을 지원하지 않아요.');
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      value => value ? resolve(value) : reject(new Error('사진 저장을 다시 시도해주세요.')), 'image/png'));
  } finally { URL.revokeObjectURL(source); }
}

export function useDownloadPhoto() {
  const downloads = useRef(new Map<string, number>());
  useEffect(() => () => {
    for (const [url, timer] of downloads.current) {
      clearTimeout(timer); URL.revokeObjectURL(url);
    }
    downloads.current.clear();
  }, []);
  return (image: Blob, date: string) => {
    const url = URL.createObjectURL(image);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'AI강의실-단체사진-' + date + '.png';
    document.body.append(anchor); anchor.click(); anchor.remove();
    const timer = window.setTimeout(() => { URL.revokeObjectURL(url); downloads.current.delete(url); }, 30_000);
    downloads.current.set(url, timer);
  };
}
function MemoryPhoto({ memory }: { memory: ClassroomMemory }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!open) { setUrl(''); return; }
    const preview = URL.createObjectURL(memory.image);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [open, memory.image]);
  return <details className="classroom-memory-photo" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><ImageIcon size={16} aria-hidden="true" />사진 보기</summary>
    {open && url && <img src={url} alt={memory.title + ' 단체사진' + (memory.reflection ? ', 소감 포함' : '')} decoding="async" />}
  </details>;
}

export function ClassroomPortfolio() {
  const [memories, setMemories] = useState<ClassroomMemory[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const title = useId();
  const download = useDownloadPhoto();
  useEffect(() => {
    let stopped = false;
    setError('');
    void listClassroomMemories().then(value => { if (!stopped) setMemories(value); })
      .catch(cause => { if (!stopped) setError(cause instanceof Error ? cause.message : '수강 기록을 불러오지 못했어요.'); });
    return () => { stopped = true; };
  }, [attempt]);
  return <section className="classroom-portfolio" aria-labelledby={title}>
    <h3 id={title}>내 수강 기록{memories && ' · ' + memories.length + '개'}</h3>
    <p className="classroom-storage-note">이 기기의 현재 브라우저에 저장돼요. 브라우저 데이터를 지우면 기록도 사라지니, 보관할 사진은 PNG로도 내려받아주세요.</p>
    {error ? <div role="alert"><p className="error">{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></div>
      : memories === null ? <p role="status">저장한 기록을 불러오고 있어요.</p>
      : memories.length === 0 ? <p className="classroom-memory-empty">아직 저장한 수업이 없어요. 단체사진 미리보기에서 ‘내 수강 기록에 저장’을 눌러보세요.</p>
      : <ol className="classroom-memory-list">{memories.map(memory => <li key={memory.id}>
        <article>
          <time dateTime={memory.date}>{memory.date}</time>
          <h4>{memory.title}</h4>
          {memory.reflection && <p className="classroom-memory-reflection">{memory.reflection}</p>}
          <MemoryPhoto memory={memory} />
          <button type="button" className="classroom-memory-download" onClick={() => download(memory.image, memory.date)}>
            <Download size={15} aria-hidden="true" />PNG 내려받기<span className="sr-only"> · {memory.title} · {memory.date}</span>
          </button>
        </article>
      </li>)}</ol>}
  </section>;
}
