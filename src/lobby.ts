import { Server } from "socket.io";
import type { Room, Player } from "./types.js";
import { nanoid } from "nanoid";

export function createRoom(host: Player, maxPlayers: number, mode: Room["mode"]): Room {
  return {
    code: nanoid(6).toUpperCase(),
    hostId: host.id,
    maxPlayers,
    players: [host],
    status: "waiting",
    mode,
  };
}

export function startGame(io: Server, room: Room) {
  room.status = "starting";
  io.to(room.code).emit("game:starting", { countdown: 3 });

  setTimeout(() => {
    room.status = "in_progress";
    io.to(room.code).emit("game:start", { room });
  }, 3000);
}