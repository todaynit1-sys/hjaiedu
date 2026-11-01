export async function api<T>(path: string, input?: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: input ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
    ...(input ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) } : {}),
    signal: AbortSignal.timeout(15_000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? '요청을 완료하지 못했습니다.');
  return data;
}
export async function uploadFile<T>(code: string, date: string, file: File, id: string, caption: string, url: string): Promise<T> {
  const response = await fetch(`/api/rooms/${code}/files`, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'application/octet-stream', 'x-file-name': encodeURIComponent(file.name),
      'x-class-date': date, 'x-upload-id': id, 'x-file-caption': encodeURIComponent(caption), 'x-file-url': encodeURIComponent(url) },
    body: file, signal: AbortSignal.timeout(60_000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? '파일을 올리지 못했어요. 다시 시도해주세요.');
  return data;
}
export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(`${date}T12:00:00+09:00`));
}
export function timeLabel(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }).format(new Date(value));
}
