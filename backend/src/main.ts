import { WebSocketServer } from "ws";
import { RepoServer } from "./automerge/RepoServer";
import express from "express";
import {
  NetworkAdapterInterface,
  PeerId,
  Repo,
} from "@automerge/automerge-repo";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import PostgreSQLAdapter from "./automerge/PostgreSQLAdapter";
import os from "os";
import dotenv from "dotenv";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

// Load environment variables
dotenv.config();

// SERVER WEBSOCKET
const websocket = new WebSocketServer({ noServer: true }).on(
  "connection",
  (socket) => {
    console.log(`Connection established\n`);

    socket.on("message", (data) => {
      console.log(`Received message: ${data}\n`);
    });

    socket.on("close", () => {
      console.log(`Connection closed\n`);
    });
  }
);

// AUTOMERGE REPO
const network = new NodeWSServerAdapter(
  websocket
) as unknown as NetworkAdapterInterface;

const storage = new PostgreSQLAdapter();
// const storage = new NodeFSStorageAdapter(".amrd");

const peerId = `storage-server-${os.hostname()}`;

storage.save(["storage-adapter-id"], Uint8Array.from(peerId));

const repo = new Repo({
  network: [network],
  storage: storage,
  peerId: peerId as PeerId,
  sharePolicy: async () => false,
});

// SERVER HTTP
const app = express();
app.use(express.static("public"));
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`👍 @automerge/automerge-repo-sync-server is running`);
});

new RepoServer(process.env.PORT || "3000", app, websocket);
