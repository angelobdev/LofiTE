import { PeerId, Repo } from "@automerge/automerge-repo";
import dotenv from "dotenv";
import express from "express";
import os from "os";
import { Server } from "socket.io";
import { SocketIOServerAdapter } from "./network/SocketIOServerAdapter";
import PostgreSQLAdapter from "./storage/PostgreSQLAdapter";
import { createServer } from "http";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:5173" } });

app.get("/", (req, res) => {
  res.send("Hello World");
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});

// AUTOMERGE REPO

new Repo({
  peerId: `storage-server-${os.hostname()}` as PeerId,
  network: [new SocketIOServerAdapter(io)],
  storage: new PostgreSQLAdapter(),
  sharePolicy: async () => false,
});
