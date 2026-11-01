import { AppError, today } from '../lib/domain';
import { MAX_DAY_FILE_BYTES } from '../lib/files';
import type { Attachment, Room } from '../lib/types';

const CHUNK_BYTES = 512 * 1024;
type StoredFile = { id: string; room: string; date: string; name: string; size: number; digest: string };

/** Small, daily classroom handouts share the existing SQLite-backed object. */
export class FileStore {
  constructor(private storage: DurableObjectStorage) {
    storage.sql.exec(`CREATE TABLE IF NOT EXISTS classroom_files (
      id TEXT PRIMARY KEY, room TEXT NOT NULL, date TEXT NOT NULL,
      name TEXT NOT NULL, size INTEGER NOT NULL, digest TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS classroom_files_day ON classroom_files(date, room);
      CREATE TABLE IF NOT EXISTS classroom_file_chunks (
      file_id TEXT NOT NULL, part INTEGER NOT NULL, data BLOB NOT NULL,
      PRIMARY KEY(file_id, part));`);
  }
  expire(date = today()) {
    this.storage.transactionSync(() => {
      this.storage.sql.exec('DELETE FROM classroom_file_chunks WHERE file_id IN (SELECT id FROM classroom_files WHERE date <> ?)', date);
      this.storage.sql.exec('DELETE FROM classroom_files WHERE date <> ?', date);
    });
  }
  existing(id: string): StoredFile | undefined {
    return this.storage.sql.exec<StoredFile>('SELECT * FROM classroom_files WHERE id = ?', id).toArray()[0];
  }
  checkCapacity(code: string, size: number) {
    const usage = this.storage.sql.exec<{ size: number; count: number }>('SELECT COALESCE(SUM(size), 0) AS size, COUNT(*) AS count FROM classroom_files WHERE room = ?', code).one();
    if (usage.size + size > MAX_DAY_FILE_BYTES) throw new AppError('오늘 자료는 총 50MB까지 보관할 수 있어요. 기존 파일을 삭제한 뒤 올려주세요.', 409);
    if (usage.count >= 20) throw new AppError('오늘 자료는 최대 20개까지 올릴 수 있어요.', 409);
    const total = this.storage.sql.exec<{ size: number }>('SELECT COALESCE(SUM(size), 0) AS size FROM classroom_files').one();
    if (total.size + size > 100 * 1024 * 1024) throw new AppError('사이트의 오늘 자료 저장 한도에 도달했어요. 기존 파일을 정리해주세요.', 409);
  }
  save(room: Room, date: string, file: Attachment, bytes: Uint8Array, digest: string) {
    this.storage.transactionSync(() => {
      this.storage.sql.exec('INSERT INTO classroom_files (id, room, date, name, size, digest) VALUES (?, ?, ?, ?, ?, ?)', file.id, room.code, date, file.name, file.size, digest);
      for (let offset = 0, part = 0; offset < bytes.length; offset += CHUNK_BYTES, part++) {
        this.storage.sql.exec('INSERT INTO classroom_file_chunks (file_id, part, data) VALUES (?, ?, ?)', file.id, part, bytes.slice(offset, offset + CHUNK_BYTES));
      }
      this.storage.kv.put(`room:${room.code}`, room);
    });
  }
  /** Persist moderation and remove corresponding file bytes atomically. */
  saveRoom(room: Room) {
    const retained = new Set(Object.values(room.days).flatMap(day => day.messages.flatMap(m => m.attachment ? [m.attachment.id] : [])));
    const files = this.storage.sql.exec<{ id: string }>('SELECT id FROM classroom_files WHERE room = ?', room.code).toArray();
    this.storage.transactionSync(() => {
      this.storage.kv.put(`room:${room.code}`, room);
      for (const file of files) if (!retained.has(file.id)) {
        this.storage.sql.exec('DELETE FROM classroom_file_chunks WHERE file_id = ?', file.id);
        this.storage.sql.exec('DELETE FROM classroom_files WHERE id = ?', file.id);
      }
    });
  }
  download(room: Room, id: string): Response {
    const file = this.existing(id);
    const date = today();
    if (!file || file.room !== room.code || file.date !== date || !room.days[date]?.messages.some(m => m.attachment?.id === id)) throw new AppError('파일이 삭제되었거나 당일 제공 시간이 지났어요.', 404);
    let part = 0;
    // Fetch a bounded chunk per pull; 50 downloads do not buffer 50 whole files.
    const stream = new ReadableStream<Uint8Array>({ pull: controller => {
      if (today() !== file.date) { controller.error(new Error('자료 제공 시간이 지났어요.')); return; }
      const chunk = this.storage.sql.exec<{ data: ArrayBuffer }>('SELECT data FROM classroom_file_chunks WHERE file_id = ? AND part = ?', id, part).toArray()[0];
      if (!chunk) { controller.error(new Error('파일이 삭제되었어요.')); return; }
      controller.enqueue(new Uint8Array(chunk.data)); part++;
      if (part * CHUNK_BYTES >= file.size) controller.close();
    } });
    const name = encodeURIComponent(file.name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    return new Response(stream, { headers: {
      'content-type': 'application/octet-stream', 'content-length': String(file.size),
      'content-disposition': `attachment; filename="classroom-file"; filename*=UTF-8''${name}`,
      'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox", 'cross-origin-resource-policy': 'same-origin'
    } });
  }
}
