# Typing Race

A small real-time typing game built with Next.js and Socket.IO.  
Players can compete in two modes: **Sentences** and **Words**. Scores are tracked live and the best results are saved in a local SQLite leaderboard.

## Features

- Real-time multiplayer using Socket.IO
- Two game modes:
  - **Sentences** – type a continuous chain of sentences
  - **Words** – type words one by one and commit with space/enter
- Live scoreboard with WPM and accuracy
- Automatic round rotation (default 30 seconds)
- Round-end summary showing the top players
- Global leaderboard stored in SQLite
- Table sorting and pagination on the client

## Tech stack

- Next.js (App Router)
- TypeScript
- Socket.IO
- SQLite (`better-sqlite3`)
- shadcn/ui components

## Installation

Install dependencies:

```bash
npm install
Running the project

The app consists of two parts: the Next.js frontend and a small Socket.IO server.

1. Start the websocket server
npm run dev:ws

This starts the Socket.IO server on:

http://localhost:3002

It also creates a local SQLite database file leaderboard.sqlite for storing best scores.

2. Start the Next.js development server

In another terminal:

npm run dev

Then open:

Sentences mode

http://localhost:3000

Words mode

http://localhost:3000/words

To test multiplayer, open the site in multiple tabs or browsers.

Notes

Player identity is stored locally in sessionStorage.

Leaderboard entries are keyed by player name.

The Socket.IO server manages game rounds and broadcasts the game state to all connected clients.

Both game modes run independently and show only players currently in that mode.
