export type ClassroomMemory = {
  id: string;
  title: string;
  date: string;
  reflection: string;
  image: Blob;
  savedAt: number;
};

const DATABASE_NAME = 'mamo-classroom-portfolio';
const STORE_NAME = 'memories';

function openPortfolio(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('이 브라우저에서는 수업 보관함을 사용할 수 없어요.'));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DATABASE_NAME, 1);
    } catch (cause) {
      reject(new Error('수업 보관함을 열 수 없어요.', { cause }));
      return;
    }
    let blocked = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onblocked = () => {
      blocked = true;
      reject(new Error('다른 탭의 수업 보관함을 닫은 뒤 다시 시도해주세요.'));
    };
    request.onerror = () => reject(new Error('수업 보관함을 열 수 없어요.', { cause: request.error }));
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) {
        database.close();
        return;
      }
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

function waitForCommit(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('보관함 작업이 중단됐어요.'));
  });
}

export async function saveClassroomMemory(memory: ClassroomMemory): Promise<void> {
  const database = await openPortfolio();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(memory);
    await waitForCommit(transaction);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'QuotaExceededError') {
      throw new Error('기기의 저장 공간이 부족해 사진과 소감을 저장하지 못했어요.', { cause });
    }
    throw new Error('사진과 소감을 보관함에 저장하지 못했어요.', { cause });
  } finally {
    database.close();
  }
}

export async function listClassroomMemories(): Promise<ClassroomMemory[]> {
  const database = await openPortfolio();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    await waitForCommit(transaction);
    const memories: ClassroomMemory[] = request.result;
    return memories.sort((a, b) => b.savedAt - a.savedAt);
  } catch (cause) {
    throw new Error('수업 보관함을 불러오지 못했어요.', { cause });
  } finally {
    database.close();
  }
}
