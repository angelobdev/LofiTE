import {
  cbor,
  NetworkAdapter,
  PeerId,
  PeerMetadata,
} from "@automerge/automerge-repo/slim";
import Keycloak from "keycloak-js";
import io, { Socket } from "socket.io-client";
import {
  FromClientMessage,
  FromServerMessage,
  isErrorMessage,
  isPeerMessage,
  JoinMessage,
  LeaveMessage,
} from "./SocketIOMessages";

export class SocketIOClientAdapter extends NetworkAdapter {
  private socket: typeof Socket;

  private remotePeerId?: PeerId; // this adapter only connects to one remote client at a time

  constructor(url: string, keycloak: Keycloak) {
    super();

    this.peerId = keycloak.subject as PeerId;

    // Init socket with token
    this.socket = io(url, {
      transports: ["websocket"],
      auth: {
        token: keycloak.token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    this.socket.binaryType = "arraybuffer";

    // Callbacks
    this.socket.on("connect", () => {
      console.log("Connected to server");
      this.join();
    });

    this.socket.on("message", (bytes: Uint8Array) => {
      this.receive(bytes);
    });

    this.socket.on("disconnect", (reason: string) => {
      console.log(`Disconnected from server: ${reason}`);
      this.peerDisconnected();
    });
  }

  connect(peerId: PeerId, peerMetadata?: PeerMetadata): void {
    if (!this.peerId) {
      this.peerId = peerId;
      this.peerMetadata = peerMetadata ?? {};
    }

    this.emit("ready", { network: this });
  }

  send(message: FromClientMessage): void {
    console.log("Sending message: " + JSON.stringify(message));

    if (this.socket.connected) {
      // console.log("Sending message: " + JSON.stringify(message));
      const bytes = cbor.encode(message);
      this.socket.send(bytes);
    } else {
      console.log("Socket not connected, message not sent");
    }
  }

  receive(bytes: Uint8Array): void {
    const message: FromServerMessage = cbor.decode(new Uint8Array(bytes));

    console.log("Received message: " + JSON.stringify(message));

    if (bytes.byteLength === 0)
      throw new Error("received a zero-length message");

    if (isPeerMessage(message)) {
      const { peerMetadata } = message;
      this.peerCandidate(message.senderId, peerMetadata);
    } else if (isErrorMessage(message)) {
      console.error(`Message from server: ${message.message}`);
    } else {
      this.emit("message", message);
    }
  }

  disconnect(): void {
    this.leave();
    this.socket.close();
    this.peerDisconnected();
  }

  // Messages

  join() {
    const message = {
      type: "join",
      senderId: this.peerId!,
      peerMetadata: this.peerMetadata || {},
    } as JoinMessage;
    this.send(message);
  }

  leave() {
    const message: LeaveMessage = {
      type: "leave",
      senderId: this.peerId!,
    };
    this.send(message);
  }

  // Events

  peerCandidate(remotePeerId: PeerId, peerMetadata: PeerMetadata) {
    this.remotePeerId = remotePeerId;
    this.emit("peer-candidate", {
      peerId: remotePeerId,
      peerMetadata,
    });
  }

  peerDisconnected() {
    if (this.remotePeerId)
      this.emit("peer-disconnected", { peerId: this.remotePeerId });
  }
}
