import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

interface Room {
  player1: string;
  player2: string | null;
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const rooms = new Map<string, Room>();

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // ── Room management ──────────────────────────────────────────────────────────

  socket.on('create_room', (roomCode: string) => {
    if (rooms.has(roomCode)) {
      socket.emit('room_error', 'Room already exists.');
      return;
    }
    rooms.set(roomCode, { player1: socket.id, player2: null });
    socket.join(roomCode);
    socket.emit('room_created');
    console.log(`Room ${roomCode} created`);
  });

  socket.on('join_room', (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (!room) { socket.emit('room_error', 'Room not found.'); return; }
    if (room.player2) { socket.emit('room_error', 'Room is full.'); return; }

    room.player2 = socket.id;
    socket.join(roomCode);
    socket.emit('room_joined');
    // Ask P1 (the host) to send their current game state so P2 can sync
    io.to(room.player1).emit('request_level_state');
    console.log(`Room ${roomCode} joined`);
  });

  // ── State synchronisation ────────────────────────────────────────────────────

  // P1 sends current state in response to request_level_state, or when generating a new level.
  // Server broadcasts to all players in the room so both sides are guaranteed to be in sync.
  socket.on('submit_level', ({ roomCode, state }: { roomCode: string; state: unknown }) => {
    if (!rooms.has(roomCode)) return;
    io.to(roomCode).emit('level_state', state);
  });

  // ── Move pipeline ────────────────────────────────────────────────────────────

  // Client emits intent; server validates the sender's identity, then broadcasts
  // execute_move to all players so state is derived identically on every client.
  socket.on('move_intent', ({
    roomCode, draggedId, dirX, dirY, playerId,
  }: {
    roomCode: string; draggedId: number; dirX: number; dirY: number; playerId: 1 | 2;
  }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const expected = playerId === 1 ? room.player1 : room.player2;
    if (socket.id !== expected) return; // reject spoofed player IDs
    io.to(roomCode).emit('execute_move', { draggedId, dirX, dirY, playerId });
  });

  // ── Reset ────────────────────────────────────────────────────────────────────

  socket.on('reset_request', (roomCode: string) => {
    if (!rooms.has(roomCode)) return;
    io.to(roomCode).emit('execute_reset');
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    for (const [code, room] of rooms.entries()) {
      if (room.player1 === socket.id || room.player2 === socket.id) {
        io.to(code).emit('partner_disconnected');
        rooms.delete(code);
        console.log(`Room ${code} dissolved`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => console.log(`Coupled Colors server on :${PORT}`));
