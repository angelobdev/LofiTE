import {
  cbor,
  NetworkAdapter,
  PeerId,
  PeerMetadata,
} from "@automerge/automerge-repo/slim";
import io, { Socket } from "socket.io-client";
import {
  JoinMessage,
  FromClientMessage,
  LeaveMessage,
  FromServerMessage,
  isPeerMessage,
  isErrorMessage,
} from "./SocketIOMessages";

export class SocketIOClientAdapter extends NetworkAdapter {
  private socket: typeof Socket;
  private isReady: boolean;

  private remotePeerId?: PeerId; // this adapter only connects to one remote client at a time

  constructor(url: string) {
    super();
    this.socket = io(url);
    this.isReady = false;
  }

  connect(peerId: PeerId, peerMetadata?: PeerMetadata): void {
    if (!this.peerId) {
      // First time connecting
      this.peerId = peerId;
      this.peerMetadata = peerMetadata ?? {};
    } else {
      // Reconnecting
      this.socket.removeEventListener("open", this.onOpen);
      this.socket.removeEventListener("close", this.onClose);
      this.socket.removeEventListener("message", this.onMessage);
    }

    this.socket.binaryType = "arraybuffer";

    this.socket.addEventListener("open", this.onOpen);
    this.socket.addEventListener("close", this.onClose);
    this.socket.addEventListener("message", this.onMessage);

    // Joining
    setTimeout(() => this.ready(), 1000);
    this.join();
  }

  send(message: FromClientMessage): void {
    // console.log("Sending message: " + JSON.stringify(message));
    const bytes = cbor.encode(message);
    this.socket.send(bytes);
  }

  receive(bytes: Uint8Array): void {
    const message: FromServerMessage = cbor.decode(new Uint8Array(bytes));

    // console.log("Received message: " + JSON.stringify(message));

    if (bytes.byteLength === 0)
      throw new Error("received a zero-length message");

    if (isPeerMessage(message)) {
      const { peerMetadata } = message;
      this.peerCandidate(message.senderId, peerMetadata);
    } else if (isErrorMessage(message)) {
      // console.log(`error: ${message.message}`);
    } else {
      this.emit("message", message);
    }
  }

  disconnect(): void {
    const message: LeaveMessage = { type: "leave", senderId: this.peerId! };
    this.send(message);
  }

  // Callbacks

  onOpen = () => {
    this.join();
  };

  onClose = () => {
    // When a socket closes, or disconnects, remove it from the array.
    if (this.remotePeerId)
      this.emit("peer-disconnected", { peerId: this.remotePeerId });
  };

  onMessage = (bytes: Uint8Array) => {
    this.receive(bytes);
  };

  // UTILS

  ready() {
    if (this.isReady) return;
    this.isReady = true;
    this.emit("ready", { network: this });
  }

  join() {
    const message = {
      type: "join",
      senderId: this.peerId!,
      peerMetadata: this.peerMetadata || {},
    } as JoinMessage;
    this.send(message);
  }

  peerCandidate(remotePeerId: PeerId, peerMetadata: PeerMetadata) {
    this.remotePeerId = remotePeerId;
    this.emit("peer-candidate", {
      peerId: remotePeerId,
      peerMetadata,
    });
  }
}
