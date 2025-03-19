import { PeerId, Repo } from "@automerge/automerge-repo";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import os from "os";
import { Server } from "socket.io";
import { SocketIOServerAdapter } from "./network/SocketIOServerAdapter";
import PostgreSQLAdapter from "./storage/PostgreSQLAdapter";
import { keycloak, memoryStore } from "./security/keycloak";
import session from "express-session";
import jwt from "jsonwebtoken";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Express
const app = express();
app.use(keycloak.middleware());
app.use(
  session({
    secret: "mySecret",
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
  })
);

app.get("/", (req, res) => {
  res.send("Hello World");
});

// HTTP Server

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Socket.IOs

const io = new Server(server, {
  transports: ["websocket"],
  cors: { origin: "http://localhost:5173" },
  connectTimeout: 1000,
  connectionStateRecovery: {},
});

// Keycloak middleware

// io.use((socket, next) => {
//   const token = socket.handshake.auth.token;

//   if (!token) {
//     console.error("No token provided");
//     return next(new Error("Authentication error"));
//   }

//   const key =
//     "-----BEGIN PUBLIC KEY-----\n" +
//     process.env.KEYCLOAK_PUBLIC_KEY +
//     "\n-----END PUBLIC KEY-----";

//   jwt.verify(token, key, (err, decoded) => {
//     if (err) {
//       console.error(err);
//       return next(new Error("Authentication error"));
//     }

//     console.log("Decoded user: " + JSON.stringify(decoded));

//     next();
//   });
// });

// AUTOMERGE REPO

new Repo({
  peerId: `storage-server-${os.hostname()}` as PeerId,
  network: [new SocketIOServerAdapter(io)],
  storage: new PostgreSQLAdapter(),
  sharePolicy: async () => false,
});
