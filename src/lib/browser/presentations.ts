export const PRESENTATIONS_CHANGED_EVENT = 'audiblegraphics:presentations-changed';

const DATABASE_NAME = 'audiblegraphics';
const DATABASE_VERSION = 1;
const STORE_NAME = 'presentations';

export interface StoredPresentation {
  id: string;
  title: string;
  speaker_notes: string;
  aspect_ratio: '16:9' | '9:16';
  voice: string;
  created_at: string;
  image: Blob;
  audio: Blob;
  video?: Blob;
}

export type PresentationSummary = Pick<
  StoredPresentation,
  'id' | 'title' | 'aspect_ratio' | 'voice' | 'created_at'
> & { has_video: boolean };

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser'));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('created_at', 'created_at');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open local storage'));
      request.onblocked = () => reject(new Error('Local storage is blocked by another tab'));
    });
  }

  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Local storage request failed'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Local storage transaction failed'));
    transaction.onabort = () => reject(transaction.error || new Error('Local storage transaction was aborted'));
  });
}

function notifyPresentationsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PRESENTATIONS_CHANGED_EVENT));
  }
}

export function createPresentationId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'infographic';
  return `${slug}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function listPresentations(): Promise<PresentationSummary[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const records = await requestResult(
    transaction.objectStore(STORE_NAME).getAll() as IDBRequest<StoredPresentation[]>
  );

  return records
    .map(({ id, title, aspect_ratio, voice, created_at, video }) => ({
      id,
      title,
      aspect_ratio,
      voice,
      created_at,
      has_video: Boolean(video),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getPresentation(id: string): Promise<StoredPresentation | null> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const result = await requestResult(
    transaction.objectStore(STORE_NAME).get(id) as IDBRequest<StoredPresentation | undefined>
  );
  return result || null;
}

export async function savePresentation(presentation: StoredPresentation): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put(presentation);
  await transactionComplete(transaction);
  notifyPresentationsChanged();

  if (navigator.storage?.persist) {
    await navigator.storage.persist().catch(() => false);
  }
}

export async function updatePresentationTitle(id: string, title: string): Promise<void> {
  const presentation = await getPresentation(id);
  if (!presentation) throw new Error('Infographic not found');
  await savePresentation({ ...presentation, title });
}

export async function savePresentationVideo(id: string, video: Blob): Promise<void> {
  const presentation = await getPresentation(id);
  if (!presentation) throw new Error('Infographic not found');
  await savePresentation({ ...presentation, video });
}

export async function deletePresentation(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(id);
  await transactionComplete(transaction);
  notifyPresentationsChanged();
}
