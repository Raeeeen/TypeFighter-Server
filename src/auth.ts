import { Socket } from "socket.io";
import jwt from "jsonwebtoken";

const AUTH_SECRET = process.env.AUTH_SECRET!; 

export function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token provided"));

  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as { sub: string; name: string };
    socket.data.userId = decoded.sub;
    socket.data.username = decoded.name;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
}