import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { FloorPlan, CollaborationUser, ChatMessage, PlanUpdateEvent } from '../types';
import { getErrorMessage } from '../utils';

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

  // Refs that always point at the latest plan / userId, so socket callbacks
  // and `applyRemoteUpdate` never read from a stale closure. Kept in sync
  // by the two effects below — these are the ONLY effects that depend on
  // `plan` and `userId`. (Fixes B-1 and B-2.)
  const planRef = useRef(plan);
  const userIdRef = useRef<string | null>(userId);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Apply a remote update using a FUNCTIONAL onPlanChange so we never
  // read `plan` from closure. This eliminates B-2 by construction.
  const applyRemoteUpdate = useCallback(
    (update: PlanUpdateEvent) => {
      const next = (prev: FloorPlan): FloorPlan => {
        switch (update.type) {
          case 'room':
            if (update.action === 'add') {
              return { ...prev, rooms: [...prev.rooms, update.data] };
            }
            if (update.action === 'update') {
              return {
                ...prev,
                rooms: prev.rooms.map((r) =>
                  r.id === update.data.id ? { ...r, ...update.data } : r
                ),
              };
            }
            if (update.action === 'delete') {
              return {
                ...prev,
                rooms: prev.rooms.filter((r) => r.id !== update.data.id),
              };
            }
            return prev;
          case 'plan':
            if (update.action === 'update') {
              return { ...prev, ...update.data };
            }
            return prev;
          default:
            return prev;
        }
      };
      onPlanChange(next as unknown as FloorPlan);
    },
    [onPlanChange]
  );

  // Initialize socket connection ONCE. Subscribes once, cleans up on unmount.
  // Deps are stable: applyRemoteUpdate is stable because onPlanChange is
  // stable (useFloorPlan's setPlan has [] deps). So this effect runs once.
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
      // S-12: socket.io's `err` is typed as `unknown`-ish; use the shared
      // helper so a string throw or null doesn't render `undefined`.
      const message = getErrorMessage(err) || 'Unknown error';
      console.error('Connection error:', message);
      setError(`Connection failed: ${message}`);
      setIsConnected(false);
    });

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

        if (data.plan && Object.keys(data.plan).length > 0) {
          onPlanChange(data.plan);
        } else {
          socket.emit('plan-sync', planRef.current);
        }
      }
    );

    socket.on('user-joined', (user: CollaborationUser) => {
      setUsers((prev) => {
        if (prev.find((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    socket.on('user-left', (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.id !== data.userId));
      setCursorPositions((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    });

    socket.on('users-updated', (users: CollaborationUser[]) => {
      setUsers(users);
    });

    socket.on('plan-updated', (update: PlanUpdateEvent & { userName: string }) => {
      if (isLocalUpdateRef.current) return;
      pendingUpdatesRef.current.push(update);
      requestAnimationFrame(() => {
        const updates = [...pendingUpdatesRef.current];
        pendingUpdatesRef.current = [];
        updates.forEach((u) => applyRemoteUpdate(u));
      });
    });

    socket.on(
      'plan-synced',
      (data: { plan: FloorPlan; timestamp: number; modifiedBy?: string }) => {
        if (data.modifiedBy === userIdRef.current) return;
        onPlanChange(data.plan);
      }
    );

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

    socket.on('chat-message', (message: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-99), message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [applyRemoteUpdate, onPlanChange]);

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

  const broadcastUpdate = useCallback(
    (update: Omit<PlanUpdateEvent, 'timestamp' | 'userId'>) => {
      if (!socketRef.current || !roomId) return;
      isLocalUpdateRef.current = true;
      socketRef.current.emit('plan-update', {
        ...update,
        timestamp: Date.now(),
        userId: userIdRef.current,
      });
      setTimeout(() => {
        isLocalUpdateRef.current = false;
      }, 100);
    },
    [roomId]
  );

  const syncPlan = useCallback(
    (newPlan: FloorPlan) => {
      if (!socketRef.current || !roomId) return;
      socketRef.current.emit('plan-sync', newPlan);
    },
    [roomId]
  );

  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      if (!socketRef.current || !roomId) return;
      socketRef.current.emit('cursor-move', { x, y });
    },
    [roomId]
  );

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
