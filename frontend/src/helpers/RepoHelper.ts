import {
  DocumentId,
  isValidDocumentId,
  NetworkAdapterInterface,
  Repo,
  StorageAdapterInterface,
} from "@automerge/automerge-repo";

import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { SocketIOClientAdapter } from "../network/SocketIOClientAdapter";
import Keycloak from "keycloak-js";

export default class RepoHelper {
  private static repo: Repo;

  private static network: NetworkAdapterInterface;
  private static storage: StorageAdapterInterface;

  static initialize(keycloak: Keycloak) {
    this.storage = new IndexedDBStorageAdapter();
    this.network = new SocketIOClientAdapter("http://localhost:3000", keycloak);
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
