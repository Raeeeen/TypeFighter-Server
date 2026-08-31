import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { authenticateSocket } from "./auth.js";
import { joinQueue, leaveQueue } from "./matchmaking.js";
import { createRoom, startGame } from "./lobby.js";
import { registerGameHandlers } from "./game.js";
import type { Room } from "./types.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.get("/health", (_req, res) => res.send("ok"));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

const rooms = new Map<string, Room>();

io.use(authenticateSocket);

io.on("connection", (socket) => {
  // Matchmaking
  socket.on(
    "queue:join",
    (
      profile: {
        avatar?: string | null;
        country?: string | null;
        rank?: number | null;
      } = {},
    ) => joinQueue(io, socket, rooms, profile),
  );
  socket.on("queue:leave", () => leaveQueue(socket));

  // Custom lobby
  socket.on("lobby:create", ({ maxPlayers }: { maxPlayers: number }) => {
    const capped = Math.min(Math.max(maxPlayers, 2), 10);
    const room = createRoom(
      {
        id: socket.id,
        userId: socket.data.userId,
        username: socket.data.username,
        ready: true,
      },
      capped,
      "lobby",
    );
    rooms.set(room.code, room);
    socket.join(room.code);
    socket.emit("lobby:created", room);
  });

  socket.on("lobby:join", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return socket.emit("lobby:error", "Room not found");
    const alreadyIn = room.players.some((p) => p.userId === socket.data.userId);

    if (alreadyIn) {
      const existing = room.players.find(
        (p) => p.userId === socket.data.userId,
      )!;

      if (room.hostId === existing.id) {
        room.hostId = socket.id;
      }

      existing.id = socket.id;
      socket.join(code);
      socket.emit("lobby:created", room);
      io.to(code).emit("lobby:updated", room);
      return;
    }

    if (room.players.length >= room.maxPlayers)
      return socket.emit("lobby:error", "Room full");
    if (room.status !== "waiting")
      return socket.emit("lobby:error", "Game already started");

    room.players.push({
      id: socket.id,
      userId: socket.data.userId,
      username: socket.data.username,
      ready: false,
    });
    socket.join(code);
    io.to(code).emit("lobby:updated", room);
  });

  socket.on("lobby:leave", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== socket.id);
    socket.leave(code);

    if (room.players.length === 0) {
      rooms.delete(code);
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      room.players[0].ready = true;
    }

    io.to(code).emit("lobby:updated", room);
  });

  socket.on(
    "lobby:kick",
    ({ code, targetId }: { code: string; targetId: string }) => {
      const room = rooms.get(code);
      if (!room || room.hostId !== socket.id) return;
      if (targetId === socket.id) return;

      room.players = room.players.filter((p) => p.id !== targetId);

      const kickedSocket = io.sockets.sockets.get(targetId);
      if (kickedSocket) {
        kickedSocket.leave(code);
        kickedSocket.emit("lobby:kicked");
      }

      io.to(code).emit("lobby:updated", room);
    },
  );

  socket.on("lobby:ready", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;
    if (room.status !== "waiting") return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) player.ready = !player.ready;
    io.to(code).emit("lobby:updated", room);
  });

  socket.on("lobby:start", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return socket.emit("lobby:error", "Room not found");

    if (room.hostId !== socket.id) {
      return socket.emit("lobby:error", "Only the host can start the match");
    }

    if (room.status !== "waiting") {
      return socket.emit("lobby:error", "Match already starting");
    }

    if (room.players.length < 2)
      return socket.emit("lobby:error", "Need at least 2 players");

    const allReady = room.players.every((p) => p.ready);
    if (!allReady)
      return socket.emit("lobby:error", "Not everyone is ready yet");

    startGame(io, room);
  });

  registerGameHandlers(io, socket, rooms);

  socket.on("disconnect", () => {
    leaveQueue(socket);
    for (const [code, room] of rooms) {
      room.players = room.players.filter((p) => p.id !== socket.id);
      if (room.players.length === 0) rooms.delete(code);
      else io.to(code).emit("lobby:updated", room);
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Realtime server on :${PORT}`));
