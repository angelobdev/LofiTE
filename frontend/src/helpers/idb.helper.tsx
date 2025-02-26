import { AnyDocumentId } from "@automerge/automerge-repo";

const DB_NAME = "lofite";
const STORE_NAME = "entries";

export interface FileEntry {
  fileName: string;
  docId: AnyDocumentId;
}

export default class IndexedDBHelper {
  // PRIVATE

  private static async openDatabase(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "fileName" });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  // PUBLIC

  static async store(entry: FileEntry): Promise<void> {
    const db = await IndexedDBHelper.openDatabase();

    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(entry);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (event: Event) => {
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  static async loadAll(): Promise<FileEntry[]> {
    const db = await IndexedDBHelper.openDatabase();

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
          resolve((event.target as IDBRequest).result);
        };

        request.onerror = (event) => {
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  static async remove(fileName: string): Promise<AnyDocumentId> {
    const db = await IndexedDBHelper.openDatabase();

    return new Promise<AnyDocumentId>((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(fileName);

        request.onsuccess = (event) => {
          resolve((event.target as IDBRequest).result);
        };
        request.onerror = (event) => {
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
}
