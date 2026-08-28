export interface Player {
  id: string;
  userId: string;
  username: string;
  ready: boolean;
  floor?: number;
  status?: "playing" | "finished";
  finishTime?: number;
  wpm?: number;
  accuracy?: number;
  outcome?: "victory" | "defeat";
}

export interface Room {
  code: string;
  hostId: string;
  maxPlayers: number;
  players: Player[];
  countdownStarted?: boolean;
  status: "waiting" | "starting" | "in_progress" | "finished";
  mode: "matchmaking" | "lobby";
}