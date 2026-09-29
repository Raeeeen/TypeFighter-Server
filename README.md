# TypeFighter Server

TypeFighter Server is the **real-time multiplayer game server** for [TypeFighter](https://github.com/Raeeeen/TypeFighter).

It handles the real-time communication between players during multiplayer matches, including matchmaking, custom rooms, ready states, typing progress, game actions, and match results.

This is a **basic version of the game server** and is still being developed. I am still learning how real-time multiplayer game servers work, so the server architecture and features may change as I continue improving the project.

## Technologies Used

* Node.js
* TypeScript
* Express
* Socket.IO
* JSON Web Tokens (JWT)

## How It Works

Express is mainly used for the server and a basic `/health` endpoint.

Most of the multiplayer functionality is handled through **Socket.IO**, allowing the server and connected players to communicate in real time.

The server uses **JWT authentication** as Socket.IO middleware. Clients need a valid token to connect to the multiplayer server.

Game state is currently stored **in memory**. Rooms are stored in a `Map`, while the matchmaking queue uses an array. There is currently no database used by the game server.

## Server Architecture

| File             | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `index.ts`       | Server setup, lobby events, and disconnect handling                     |
| `auth.ts`        | Verifies JWT tokens and stores the user's ID and username on the socket |
| `matchmaking.ts` | Handles quick matchmaking and pairs players                             |
| `lobby.ts`       | Creates rooms and handles the game start sequence                       |
| `game.ts`        | Handles in-game events, typing, actions, finishing, and results         |
| `types.ts`       | Contains the `Player` and `Room` types                                  |

## Multiplayer Flow

### 1. Matchmaking or Custom Lobby

Players can either:

* Use matchmaking to automatically find another player.
* Create or join a custom room.

Custom rooms support **2 to 10 players**. The host can control the lobby, players can ready up, and the host can kick players when needed.

### 2. Starting the Game

When the game starts, the server sends a `game:starting` event.

After a short **3-second preparation period**, the server sends `game:start` and the match begins.

### 3. Player Ready

Each client sends a `game:ready` event with the player's selected floor.

When all players are ready, the server starts a **10-second countdown** before the actual match begins.

### 4. Real-Time Gameplay

During the match, players send their actions to the server through Socket.IO.

The server handles events such as:

* `game:typing` — Sends the player's current typing progress.
* `game:action` — Sends actions such as correct inputs and mistakes.
* `game:finish` — Records when a player finishes the boss.

The server relays the required information to the other players so everyone can see the match happening in real time.

### 5. Results and Ranking

When players finish, the server records their results.

Once all players have finished, the server calculates the final rankings and sends the `game:results` event.

The current ranking logic considers:

1. Players who finished first based on their completion time.
2. Players who did not finish, based on how long they lasted.
3. WPM.
4. Accuracy.

The results are then sent back to the players in the room.

## Authentication

The server uses **JWT authentication** for Socket.IO connections.

When a client connects, the server verifies the JWT and stores the authenticated user's information in the socket:

* `userId`
* `username`

This allows the multiplayer server to identify each connected player.

## Project Purpose

TypeFighter Server was created to provide the real-time multiplayer backend for TypeFighter.

The main purpose of this project is to handle communication between players during multiplayer typing matches, including matchmaking, rooms, game states, typing progress, and results.

This project is also a learning experience for me. I am still learning how **real-time multiplayer game servers, WebSockets, synchronization, and server-side game state** work.

Because of this, the current server is intentionally basic and still needs more work before it can be considered a more complete multiplayer game server.

## Project Status

**Currently In Development**

This is a **basic version** of the TypeFighter multiplayer server.

I am currently still learning and improving how the server handles real-time multiplayer gameplay, player synchronization, game state, and different multiplayer situations.

More improvements and features will be added as development continues.
