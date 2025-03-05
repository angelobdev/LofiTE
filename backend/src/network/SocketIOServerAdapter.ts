import {
  cbor,
  Message,
  NetworkAdapter,
  PeerId,
  PeerMetadata,
} from "@automerge/automerge-repo";
import { Server, Socket } from "socket.io";
import { isJoinMessage, isLeaveMessage } from "./SocketIOMessages";
import { FromServerMessage } from "@automerge/automerge-repo-network-websocket";

// SERVER

export class SocketIOServerAdapter extends NetworkAdapter {
  private clients: Map<PeerId, Socket> = new Map();

  constructor(private readonly io: Server) {
    super();
  }

  connect(peerId: PeerId, peerMetadata?: PeerMetadata): void {
    this.peerId = peerId;
    this.peerMetadata = peerMetadata;

    this.io.on("close", () => {
      // console.log("Server closed");
      this.disconnect();
    });

    this.io.on("connection", (socket) => {
      // console.log("\n\nSocket connected: " + socket.id);

      socket.on("message", (msg: Uint8Array) => {
        this.receive(msg, socket);
      });

      // Just to be sure...
      socket.on("close", () => {
        // console.log("Socket disconnected: " + socket.id);
        this.removeSocket(socket);
      });

      this.emit("ready", { network: this });
    });
  }

  send(message: FromServerMessage): void {
    // console.log("Sending message: " + message);

    const socket: Socket = this.clients[message.targetId];
    const bytes = cbor.encode(message);
    socket.send(bytes);
  }

  receive(msg: Uint8Array, socket: Socket): void {
    const message: Message = cbor.decode(msg);

    const { senderId } = message;

    // console.log("Received message: " + JSON.stringify(message));

    if (isJoinMessage(message)) {
      // console.log("Some peer is joining");

      // If client already exists, disconnect it
      if (this.clients.has(senderId)) {
        // console.log("Client already exists, disconnecting...");
        const existingSocket: Socket = this.clients[senderId];
        if (existingSocket) {
          existingSocket.disconnect(true);
          this.clients.delete(senderId);
        }
        this.emit("peer-disconnected", { peerId: senderId });
      }

      // console.log("Connecting...");

      // Let the repo know that we have a new connection.
      this.emit("peer-candidate", {
        peerId: message.senderId,
        peerMetadata: message.peerMetadata,
      });

      this.clients[senderId] = socket;

      this.send({
        type: "peer",
        senderId: this.peerId!,
        peerMetadata: this.peerMetadata!,
        targetId: senderId,
      });
    } else if (isLeaveMessage(message)) {
      // console.log("Some peer is leaving");

      // Client is disconnecting
      const socket: Socket = this.clients[senderId];
      socket.disconnect(true);
      this.removeSocket(socket);
    } else {
      this.emit("message", message);
    }
  }

  disconnect(): void {
    this.clients.forEach((socket, pid) => {
      socket.disconnect(true);
      this.clients.delete(pid);
    });
  }

  // Utilities

  private removeSocket(socket: Socket) {
    this.clients.forEach((sock, pid) => {
      if (sock.id === socket.id) {
        this.clients.delete(pid);
        return;
      }
    });
  }
}
