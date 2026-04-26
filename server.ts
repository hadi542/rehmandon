import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Real-time Game State
  const rooms = new Map<string, { players: Map<string, any>, status: 'waiting' | 'playing' }>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-room", () => {
      const roomId = nanoid(6).toUpperCase();
      rooms.set(roomId, { players: new Map(), status: 'waiting' });
      socket.join(roomId);
      socket.emit("room-created", roomId);
    });

    socket.on("join-room", (roomId: string, playerInfo: any) => {
      const room = rooms.get(roomId);
      if (room) {
        room.players.set(socket.id, { ...playerInfo, id: socket.id });
        socket.join(roomId);
        socket.emit("room-joined", { roomId, status: room.status });
        io.to(roomId).emit("players-update", Array.from(room.players.values()));
      } else {
        socket.emit("error", "Room not found");
      }
    });

    socket.on("start-game", (roomId: string) => {
      const room = rooms.get(roomId);
      if (room) {
        room.status = 'playing';
        io.to(roomId).emit("game-started");
      }
    });

    socket.on("player-state", (roomId: string, state: any) => {
      socket.to(roomId).emit("remote-player-state", { id: socket.id, ...state });
    });

    socket.on("shoot", (roomId: string, bulletData: any) => {
      socket.to(roomId).emit("remote-shoot", { playerId: socket.id, ...bulletData });
    });

    socket.on("player-hit", (roomId: string, targetId: string) => {
      io.to(roomId).emit("remote-hit", { targetId });
    });

    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        const room = rooms.get(roomId);
        if (room) {
          room.players.delete(socket.id);
          if (room.players.size === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit("players-update", Array.from(room.players.values()));
          }
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
