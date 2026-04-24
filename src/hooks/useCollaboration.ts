import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { FloorPlan } from '../types';
import { CollaborationUser, ChatMessage, PlanUpdateEvent } from '../types';

const SERVER_URL = import.meta.env.VITE_COLLAB_SERVER_URL || 'http://localhost:3001';

export function useCollaboration(plan: FloorPlan, onPlanChange: (plan: FloorPlan) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [cursorPositions, setCursorPositions] = useState<
    Record<string, { x: number; y: number; name: string; color: string }>
  >({});

  const socketRef = useRef<Socket | null>(null);
  const pendingUpdatesRef = useRef<PlanUpdateEvent[]>([]);
  const isLocalUpdateRef = useRef(false);

  // Apply a remote update to the plan - declared before useEffect to avoid reference errors
  const applyRemoteUpdate = useCallback(
    (update: PlanUpdateEvent) => {
      switch (update.type) {
        case 'room':
          if (update.action === 'add') {
            onPlanChange({
              ...plan,
              rooms: [...plan.rooms, update.data],
            });
          } else if (update.action === 'update') {
            onPlanChange({
              ...plan,
              rooms: plan.rooms.map((r) =>
                r.id === update.data.id ? { ...r, ...update.data } : r
              ),
            });
          } else if (update.action === 'delete') {
            onPlanChange({
              ...plan,
              rooms: plan.rooms.filter((r) => r.id !== update.data.id),
            });
          }
          break;
        case 'plan':
          if (update.action === 'update') {
            onPlanChange({ ...plan, ...update.data });
          }
          break;
      }
    },
    [plan, onPlanChange]
  );

  // Initialize socket connection
  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to collaboration server');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setIsConnected(false);
      setUsers([]);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      setError(`Connection failed: ${err.message}`);
      setIsConnected(false);
    });

    // Room joined event
    socket.on(
      'room-joined',
      (data: {
        roomId: string;
        userId: string;
        users: CollaborationUser[];
        plan: FloorPlan | null;
        messages: ChatMessage[];
      }) => {
        setIsConnecting(false);
        setRoomId(data.roomId);
        setUserId(data.userId);
        setUsers(data.users);
        setMessages(data.messages);

        // If server has a plan, merge with current (server wins for remote rooms)
        if (data.plan && Object.keys(data.plan).length > 0) {
          onPlanChange(data.plan);
        } else {
          // Sync current plan to server
          socket.emit('plan-sync', plan);
        }
      }
    );

    // User joined
    socket.on('user-joined', (user: CollaborationUser) => {
      setUsers((prev) => {
        if (prev.find((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    // User left
    socket.on('user-left', (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.id !== data.userId));
      setCursorPositions((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    });

    // Users updated
    socket.on('users-updated', (users: CollaborationUser[]) => {
      setUsers(users);
    });

    // Plan updated by another user
    socket.on('plan-updated', (update: PlanUpdateEvent & { userName: string }) => {
      if (isLocalUpdateRef.current) return;

      // Apply the update to the plan
      pendingUpdatesRef.current.push(update);

      // Debounce applying updates
      requestAnimationFrame(() => {
        const updates = [...pendingUpdatesRef.current];
        pendingUpdatesRef.current = [];

        updates.forEach((u) => {
          applyRemoteUpdate(u);
        });
      });
    });

    // Full plan sync
    socket.on(
      'plan-synced',
      (data: { plan: FloorPlan; timestamp: number; modifiedBy?: string }) => {
        if (data.modifiedBy === userId) return;
        onPlanChange(data.plan);
      }
    );

    // Cursor moved
    socket.on(
      'cursor-moved',
      (data: {
        userId: string;
        userName: string;
        userColor: string;
        position: { x: number; y: number };
      }) => {
        setCursorPositions((prev) => ({
          ...prev,
          [data.userId]: {
            x: data.position.x,
            y: data.position.y,
            name: data.userName,
            color: data.userColor,
          },
        }));
      }
    );

    // Chat message
    socket.on('chat-message', (message: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-99), message]);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, onPlanChange, userId]);

  // Join a room
  const joinRoom = useCallback(
    (roomId: string, name: string) => {
      if (!socketRef.current || !isConnected) {
        setError('Not connected to server');
        return;
      }

      setIsConnecting(true);
      setError(null);
      setUserName(name);
      socketRef.current.emit('join-room', { roomId, userName: name });
    },
    [isConnected]
  );

  // Leave room
  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
    setRoomId(null);
    setUserId(null);
    setUsers([]);
    setMessages([]);
    setCursorPositions({});
  }, []);

  // Broadcast plan update
  const broadcastUpdate = useCallback(
    (update: Omit<PlanUpdateEvent, 'timestamp' | 'userId'>) => {
      if (!socketRef.current || !roomId) return;

      isLocalUpdateRef.current = true;

      socketRef.current.emit('plan-update', {
        ...update,
        timestamp: Date.now(),
        userId,
      });

      setTimeout(() => {
        isLocalUpdateRef.current = false;
      }, 100);
    },
    [roomId, userId]
  );

  // Sync full plan
  const syncPlan = useCallback(
    (newPlan: FloorPlan) => {
      if (!socketRef.current || !roomId) return;

      socketRef.current.emit('plan-sync', newPlan);
    },
    [roomId]
  );

  // Broadcast cursor position
  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      if (!socketRef.current || !roomId) return;

      socketRef.current.emit('cursor-move', { x, y });
    },
    [roomId]
  );

  // Send chat message
  const sendMessage = useCallback(
    (text: string) => {
      if (!socketRef.current || !roomId) return;

      socketRef.current.emit('chat-message', text);
    },
    [roomId]
  );

  return {
    isConnected,
    isConnecting,
    roomId,
    userId,
    userName,
    users,
    messages,
    cursorPositions,
    error,
    showPanel,
    setShowPanel,
    joinRoom,
    leaveRoom,
    broadcastUpdate,
    syncPlan,
    broadcastCursor,
    sendMessage,
  };
}
