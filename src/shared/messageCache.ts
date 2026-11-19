import type { Message } from "./api";

const DB_NAME = "weixun-chat-cache";
const STORE = "conversations";
const VERSION = 1;
type CachedConversation = {
  key: string;
  messages: Message[];
  updatedAt: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function cacheKey(username: string, conversation: string) {
  return `${username}:${conversation}`;
}

export async function readCachedMessages(
  username: string,
  conversation: string,
): Promise<Message[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE, "readonly")
        .objectStore(STORE)
        .get(cacheKey(username, conversation));
      request.onsuccess = () =>
        resolve(
          (request.result as CachedConversation | undefined)?.messages ?? [],
        );
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function writeCachedMessages(
  username: string,
  conversation: string,
  messages: Message[],
): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put({
        key: cacheKey(username, conversation),
        messages,
        updatedAt: Date.now(),
      } satisfies CachedConversation);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function clearCachedMessages(username: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (String(cursor.key).startsWith(`${username}:`)) cursor.delete();
        cursor.continue();
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteCachedConversation(
  username: string,
  conversation: string,
): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(cacheKey(username, conversation));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
