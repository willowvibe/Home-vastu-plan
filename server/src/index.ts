import express from 'express';
import { createServer } from 'http';
import { Server, type Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './api/index.js';
import { query } from './db/connection.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRouter);

// Types
interface User {
  id: string;
  name: string;
  color: string;
  socketId: string;
  cursor?: { x: number; y: number } | null;
}

interface Room {
  id: string;
  users: Map<string, User>;
  plan: any;
  lastModified: number;
  modifiedBy: string;
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: number;
}

interface PlanUpdate {
  type: 'room' | 'plan' | 'element';
  action: 'add' | 'update' | 'delete' | 'move';
  data: any;
  timestamp: number;
  userId: string;
}

// In-memory storage for collaboration
const rooms = new Map<string, Room>();

// Color palette for users
const USER_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
  '#6366F1', // indigo
];

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getOrCreateRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      users: new Map(),
      plan: null,
      lastModified: Date.now(),
      modifiedBy: '',
      messages: [],
    });
  }
  return rooms.get(roomId)!;
}

function cleanupEmptyRooms() {
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.size === 0) {
      rooms.delete(roomId);
      console.log(`Cleaned up empty room: ${roomId}`);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupEmptyRooms, 5 * 60 * 1000);

io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  let currentRoomId: string | null = null;
  let currentUser: User | null = null;

  // Join a collaboration room
  socket.on('join-room', (data: { roomId: string; userName: string }) => {
    const { roomId, userName } = data;

    // Leave previous room if any
    if (currentRoomId) {
      socket.leave(currentRoomId);
      const prevRoom = rooms.get(currentRoomId);
      if (prevRoom && currentUser) {
        prevRoom.users.delete(currentUser.id);
        socket.to(currentRoomId).emit('user-left', { userId: currentUser.id });
        io.to(currentRoomId).emit('users-updated', Array.from(prevRoom.users.values()));
      }
    }

    // Join new room
    currentRoomId = roomId;
    socket.join(roomId);

    const room = getOrCreateRoom(roomId);

    // Create user
    currentUser = {
      id: generateId(),
      name: userName || `User ${room.users.size + 1}`,
      color: getRandomColor(),
      socketId: socket.id,
      cursor: null,
    };

    room.users.set(currentUser.id, currentUser);

    // Send current room state to new user
    socket.emit('room-joined', {
      roomId,
      userId: currentUser.id,
      users: Array.from(room.users.values()),
      plan: room.plan,
      messages: room.messages,
    });

    // Notify other users
    socket.to(roomId).emit('user-joined', currentUser);
    io.to(roomId).emit('users-updated', Array.from(room.users.values()));

    console.log(`User ${currentUser.name} (${currentUser.id}) joined room ${roomId}`);
  });

  // Update plan (room added, updated, deleted, etc.)
  socket.on('plan-update', (update: PlanUpdate) => {
    if (!currentRoomId || !currentUser) return;

    const room = rooms.get(currentRoomId);
    if (!room) return;

    // Update room state
    room.lastModified = update.timestamp;
    room.modifiedBy = currentUser.id;

    // Broadcast to other users in the room
    socket.to(currentRoomId).emit('plan-updated', {
      ...update,
      userId: currentUser.id,
      userName: currentUser.name,
    });

    // Store plan snapshot periodically
    if (update.type === 'plan' && update.action === 'update') {
      room.plan = update.data;
    }
  });

  // Sync full plan state
  socket.on('plan-sync', (plan: any) => {
    if (!currentRoomId) return;

    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.plan = plan;
    room.lastModified = Date.now();
    if (currentUser) {
      room.modifiedBy = currentUser.id;
    }

    // Broadcast to others
    socket.to(currentRoomId).emit('plan-synced', {
      plan,
      timestamp: Date.now(),
      modifiedBy: currentUser?.id,
    });
  });

  // Update cursor position
  socket.on('cursor-move', (position: { x: number; y: number }) => {
    if (!currentRoomId || !currentUser) return;

    currentUser.cursor = position;

    // Broadcast to other users (not to self)
    socket.to(currentRoomId).emit('cursor-moved', {
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      position,
    });
  });

  // Send chat message
  socket.on('chat-message', (text: string) => {
    if (!currentRoomId || !currentUser) return;

    const room = rooms.get(currentRoomId);
    if (!room) return;

    const message: ChatMessage = {
      id: generateId(),
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      text: text.trim(),
      timestamp: Date.now(),
    };

    room.messages.push(message);

    // Keep only last 100 messages
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }

    io.to(currentRoomId).emit('chat-message', message);
  });

  // Request undo
  socket.on('undo-request', () => {
    if (!currentRoomId || !currentUser) return;

    socket.to(currentRoomId).emit('undo-requested', {
      userId: currentUser.id,
      userName: currentUser.name,
    });
  });

  // Request redo
  socket.on('redo-request', () => {
    if (!currentRoomId || !currentUser) return;

    socket.to(currentRoomId).emit('redo-requested', {
      userId: currentUser.id,
      userName: currentUser.name,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    if (currentRoomId && currentUser) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.users.delete(currentUser.id);
        socket.to(currentRoomId).emit('user-left', { userId: currentUser.id });
        io.to(currentRoomId).emit('users-updated', Array.from(room.users.values()));
      }
    }
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    totalUsers: Array.from(rooms.values()).reduce((acc, r) => acc + r.users.size, 0),
    uptime: process.uptime(),
  });
});

// Get room info
app.get('/room/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({
    id: room.id,
    users: Array.from(room.users.values()),
    lastModified: room.lastModified,
    modifiedBy: room.modifiedBy,
    messageCount: room.messages.length,
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`VastuPlan Collaboration Server running on port ${PORT}`);
  console.log(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(
    `Database URL: ${process.env.DATABASE_URL ? 'configured' : 'not configured (using in-memory)'}`
  );
});

// Export for testing
export { io, rooms };
