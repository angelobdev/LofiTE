import {
  DocumentId,
  isValidDocumentId,
  NetworkAdapterInterface,
  Repo,
  StorageAdapterInterface,
} from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

export default class RepoHelper {
  private static repo: Repo;

  private static network: NetworkAdapterInterface;
  private static storage: StorageAdapterInterface;

  static initialize() {
    this.storage = new IndexedDBStorageAdapter();

    // Local
    this.network = new BrowserWebSocketClientAdapter(
      "ws://localhost:3000"
    ) as unknown as NetworkAdapterInterface;

    this.repo = new Repo({
      network: [this.network],
      storage: this.storage,
    });
  }

  static async findLocalKeys() {
    const chunks = await this.storage.loadRange([]);

    const keys: DocumentId[] = [];

    chunks.forEach((doc) => {
      doc.key.forEach((k) => {
        if (isValidDocumentId(k)) {
          keys.push(k as DocumentId);
        }
      });
    });

    return Array.from(new Set(keys));
  }

  static removeById(id: DocumentId) {
    this.repo.storageSubsystem?.removeDoc(id);
  }

  // Getters

  public static getRepo() {
    return this.repo;
  }
}
