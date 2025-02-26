import express from "express";
import { Server as HTTPServer } from "http";
import os from "os";
import { WebSocketServer } from "ws";

export class RepoServer {
  server: HTTPServer;
  readyResolvers: Array<(value: any) => void> = [];
  isReady = false;

  constructor(port: string, app: express.Express, websocket: WebSocketServer) {
    this.server = app.listen(port, () => {
      console.log(`Listening on port ${port}`);
      this.isReady = true;
      this.readyResolvers.forEach((resolve) => resolve(true));
    });

    this.server.on("upgrade", (request, socket, head) => {
      websocket.handleUpgrade(request, socket, head, (socket) => {
        websocket.emit("connection", socket, request);
      });
    });
  }
}
