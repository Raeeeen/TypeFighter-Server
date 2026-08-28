import { Server, Socket } from "socket.io";
import type { Room, Player } from "./types.js";
import { createRoom, startGame } from "./lobby.js";

const queue: Player[] = [];
const QUEUE_SIZE = 2; 

export function joinQueue(io: Server, socket: Socket, rooms: Map<string, Room>) {
  const player: Player = {
    id: socket.id,
    userId: socket.data.userId,
    username: socket.data.username,
    ready: true,
  };

  queue.push(player);
  socket.emit("queue:joined");

  if (queue.length >= QUEUE_SIZE) {
    const matched = queue.splice(0, QUEUE_SIZE);
    const room = createRoom(matched[0], QUEUE_SIZE, "matchmaking");
    matched.slice(1).forEach((p) => room.players.push(p));
    rooms.set(room.code, room);

    matched.forEach((p) => {
      const s = io.sockets.sockets.get(p.id);
      s?.join(room.code);
      s?.emit("match:found", room);
    });

    startGame(io, room);
  }
}

export function leaveQueue(socket: Socket) {
  const idx = queue.findIndex((p) => p.id === socket.id);
  if (idx !== -1) queue.splice(idx, 1);
}