import {
  Chunk,
  StorageAdapterInterface,
  StorageKey,
} from "@automerge/automerge-repo";
import { PrismaClient } from "@prisma/client";

export default class PostgreSQLAdapter implements StorageAdapterInterface {
  private prismaClient: PrismaClient;

  // TODO: Aggiungere sistema di cache

  constructor() {
    this.prismaClient = new PrismaClient();
  }

  async load(key: StorageKey): Promise<Uint8Array | undefined> {
    // console.log("Loading document with key", key);

    const documentKey: string = key.join("/");

    const document = await this.prismaClient.document.findUnique({
      where: {
        key: documentKey,
      },
    });

    // console.log(`Docuement with key ${key} loaded!`);

    return document === null ? undefined : document.value;
  }

  async save(key: StorageKey, data: Uint8Array): Promise<void> {
    // console.log("Saving document with key", key);

    const documentKey: string = key.join("/");

    await this.prismaClient.document.upsert({
      where: {
        key: documentKey,
      },
      update: {
        value: data,
      },
      create: {
        key: documentKey,
        value: data,
      },
    });
  }

  async remove(key: StorageKey): Promise<void> {
    // console.log("Removing document with key", key);

    const documentKey: string = key.join("/");

    await this.prismaClient.document.delete({
      where: { key: documentKey },
    });
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    // console.log("Loading documents with key prefix", keyPrefix);

    const documents = await this.prismaClient.document.findMany({
      where: {
        key: {
          startsWith: keyPrefix.join("/"),
        },
      },
    });

    const chunks: Chunk[] = documents.map((document) => ({
      key: document.key.split("/") as StorageKey,
      data: document === null ? undefined : document.value,
    }));

    return chunks;
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    // console.log("Removing documents with key prefix", keyPrefix);

    await this.prismaClient.document.deleteMany({
      where: {
        key: {
          startsWith: keyPrefix.join("/"),
        },
      },
    });
  }
}
