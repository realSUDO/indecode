import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "node:http";
import { logger } from "@repo/logger";

let io: SocketIOServer;

export function initSocket(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Or match your CORS rules from server.ts
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    logger.debug(`[Socket] Client connected: ${socket.id}`);

    // Join a room for a specific feature
    socket.on("joinFeature", (featureId: string) => {
      socket.join(featureId);
      logger.debug(`[Socket] ${socket.id} joined feature room ${featureId}`);
    });

    socket.on("leaveFeature", (featureId: string) => {
      socket.leave(featureId);
      logger.debug(`[Socket] ${socket.id} left feature room ${featureId}`);
    });

    socket.on("disconnect", () => {
      logger.debug(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}
