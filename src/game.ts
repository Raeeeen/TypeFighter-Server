import { Server, Socket } from "socket.io";
import { type Room } from "./types.js";

export function registerGameHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
) {
  socket.on(
    "game:ready",
    ({ code, floor }: { code: string; floor: number }) => {
      const room = rooms.get(code);
      const player = room?.players.find((p) => p.id === socket.id);

      if (!room || !player) {
        socket.emit("game:notInRoom");
        return;
      }

      player.floor = floor;
      player.status = "playing";
      socket.to(code).emit("game:playerReady", {
        userId: socket.data.userId,
        username: socket.data.username,
        floor,
      });

      const allReady = room.players.every((p) => p.floor !== undefined);
      if (allReady && !room.countdownStarted) {
        room.countdownStarted = true;
        const startAt = Date.now() + 10_000;
        io.to(code).emit("game:countdown", { startAt });
      }
    },
  );

  socket.on(
    "game:typing",
    ({
      code,
      sentence,
      text,
    }: {
      code: string;
      sentence: string;
      text: string;
    }) => {
      socket.to(code).emit("game:opponentTyping", {
        userId: socket.data.userId,
        sentence,
        text,
      });
    },
  );

  socket.on("game:leave", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== socket.id);
    socket.leave(code);

    if (room.players.length === 0) {
      rooms.delete(code);
    } else {
      io.to(code).emit("lobby:updated", room);
      io.to(code).emit("game:playerLeft", { userId: socket.data.userId });
    }
  });

  socket.on(
    "game:action",
    ({ code, type }: { code: string; type: "correct" | "mistake" }) => {
      socket.to(code).emit("game:opponentAction", {
        userId: socket.data.userId,
        type,
      });
    },
  );

  socket.on(
    "game:finish",
    ({
      code,
      wpm,
      accuracy,
      time,
      outcome,
    }: {
      code: string;
      wpm: number;
      accuracy: number;
      time: number;
      outcome: "victory" | "defeat";
    }) => {
      const room = rooms.get(code);
      const player = room?.players.find((p) => p.id === socket.id);
      if (!room || !player || player.status === "finished") return;

      player.status = "finished";
      player.finishTime = time;
      player.wpm = wpm;
      player.accuracy = accuracy;
      player.outcome = outcome;

      socket.to(code).emit("game:playerFinished", {
        userId: socket.data.userId,
        username: socket.data.username,
        wpm,
        accuracy,
        time,
        outcome,
      });

      const allFinished = room.players.every((p) => p.status === "finished");
      if (allFinished) {
        const ranking = [...room.players]
          .sort((a, b) => {
            const aWon = a.outcome === "victory" ? 0 : 1;
            const bWon = b.outcome === "victory" ? 0 : 1;
            if (aWon !== bWon) return aWon - bWon;

            if (a.outcome === "victory") {
              return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
            }
            if ((b.finishTime ?? 0) !== (a.finishTime ?? 0)) {
              return (b.finishTime ?? 0) - (a.finishTime ?? 0);
            }
            if ((b.wpm ?? 0) !== (a.wpm ?? 0))
              return (b.wpm ?? 0) - (a.wpm ?? 0);
            return (b.accuracy ?? 0) - (a.accuracy ?? 0);
          })
          .map((p, index) => ({
            rank: index + 1,
            userId: p.userId,
            username: p.username,
            wpm: p.wpm,
            accuracy: p.accuracy,
            time: p.finishTime,
            outcome: p.outcome,
          }));

        room.status = "finished";
        io.to(code).emit("game:results", { ranking });
      }
    },
  );
}
