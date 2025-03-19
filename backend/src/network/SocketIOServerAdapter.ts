import {
  cbor,
  Message,
  NetworkAdapter,
  PeerId,
  PeerMetadata,
} from "@automerge/automerge-repo";
import { Server, Socket } from "socket.io";
import {
  ErrorMessage,
  isJoinMessage,
  isLeaveMessage,
} from "./SocketIOMessages";
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
      console.log("Server closed");
      this.disconnect();
    });

    this.io.on("connection", (socket) => {
      console.log("\n\nSocket connected: " + socket.id);

      if (this.peerIdFromSocket(socket) !== undefined) {
        console.log("Peer already connected, disconnecting...");
        socket.send(
          cbor.encode({ type: "error", message: "Peer already connected" })
        );
        socket.disconnect(true);
        return;
      }

      socket.on("message", (msg: Uint8Array) => {
        this.receive(msg, socket);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected: " + socket.id);
        this.disconnectSocket(socket);
      });

      this.emit("ready", { network: this });
    });
  }

  send(message: FromServerMessage): void {
    if (message.type !== "sync") {
      console.log("Sending message: " + JSON.stringify(message));
    }

    const socket: Socket = this.clients.get(message.targetId)!;
    const bytes = cbor.encode(message);
    socket.send(bytes);
  }

  receive(msg: Uint8Array, socket: Socket): void {
    const message: Message = cbor.decode(msg);

    if (message.type !== "sync") {
      console.log("Received message: " + JSON.stringify(message));
    }

    const { senderId } = message;

    // If senderId is not found, send an error message
    if (!senderId) {
      const errorMessage: ErrorMessage = {
        type: "error",
        message: "Sender ID not found",
        senderId: this.peerId,
        targetId: undefined,
      };
      socket.send(cbor.encode(errorMessage));
      return;
    }

    if (isJoinMessage(message)) {
      // If client already exists, disconnect it
      if (this.clients.has(senderId)) {
        console.log("Client already exists, disconnecting...");
        const existingSocket: Socket = this.clients[senderId];
        if (existingSocket) {
          existingSocket.disconnect(true);
          this.clients.delete(senderId);
        }
        this.emit("peer-disconnected", { peerId: senderId });
      }

      // Let the repo know that we have a new connection.
      this.emit("peer-candidate", {
        peerId: message.senderId,
        peerMetadata: message.peerMetadata,
      });

      // Add the new client
      this.clients.set(senderId, socket);

      this.send({
        type: "peer",
        senderId: this.peerId!,
        peerMetadata: this.peerMetadata!,
        targetId: senderId,
      });
    } else if (isLeaveMessage(message)) {
      console.log("Some peer is leaving");
      socket.disconnect(true);
    } else {
      this.emit("message", message);
    }
  }

  disconnect(): void {
    this.clients.forEach((socket, _) => {
      socket.disconnect(true);
    });
  }

  // Utilities

  private disconnectSocket(socket: Socket) {
    const peerId = this.peerIdFromSocket(socket);

    if (peerId) {
      this.removeSocket(socket);
      this.emit("peer-disconnected", { peerId });

      console.log(`Disconnected socket ${socket.id} (Peer: ${peerId})`);
    }
  }

  private peerIdFromSocket(socket: Socket): PeerId | undefined {
    let peerId: PeerId | undefined = undefined;
    this.clients.forEach((sock, id) => {
      if (sock.id === socket.id) {
        peerId = id;
        return;
      }
    });
    return peerId;
  }

  private removeSocket(socket: Socket) {
    const peerId = this.peerIdFromSocket(socket);
    if (peerId) this.clients.delete(peerId);
  }
}
