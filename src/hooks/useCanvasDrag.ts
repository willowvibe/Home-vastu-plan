import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, FloorPlan, AppMode } from '../types';
import {
  TOLERANCE_FT,
  INCHES_PER_FOOT,
  DEFAULT_WALL_THICKNESS_IN,
  SNAP_GRID_FT,
  SNAP_GRID_SUB_FT,
} from '../constants/geometry';

interface UseCanvasDragOptions {
  plan: FloorPlan;
  currentFloor: number;
  pixelsPerFoot: number;
  snapToGrid: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
  onUpdateRoomEnd?: () => void;
  appMode: AppMode;
}

// S-9: when a room shares a wall with a neighbor, the wall thickness on
// the shared side is halved (the wall is "absorbed" by the room-to-room
// interface, not double-drawn). TOLERANCE_FT matches the overlap math in
// Room.tsx:isShared so the two stay in sync.

function isSideShared(room: Room, other: Room, side: 'top' | 'right' | 'bottom' | 'left'): boolean {
  const overlapsX =
    room.x < other.x + other.w - TOLERANCE_FT && room.x + room.w > other.x + TOLERANCE_FT;
  const overlapsY =
    room.y < other.y + other.h - TOLERANCE_FT && room.y + room.h > other.y + TOLERANCE_FT;
  if (side === 'top') return Math.abs(room.y - (other.y + other.h)) < TOLERANCE_FT && overlapsX;
  if (side === 'bottom') return Math.abs(room.y + room.h - other.y) < TOLERANCE_FT && overlapsX;
  if (side === 'left') return Math.abs(room.x - (other.x + other.w)) < TOLERANCE_FT && overlapsY;
  return Math.abs(room.x + room.w - other.x) < TOLERANCE_FT && overlapsY;
}

// S-9: per-side effective wall thickness. Shared sides get wallFt/2 so
// the inner area of the room matches what's actually visible on the
// canvas (and matches the math in Room.tsx:isShared). Exported for
// unit testing.
export function getEffectiveWalls(
  room: Room,
  otherRooms: Room[]
): { top: number; right: number; bottom: number; left: number } {
  const wallFt = (room.wallThickness || DEFAULT_WALL_THICKNESS_IN) / INCHES_PER_FOOT;
  const shared = (side: 'top' | 'right' | 'bottom' | 'left') =>
    otherRooms.some((other) => other.id !== room.id && isSideShared(room, other, side));
  return {
    top: shared('top') ? wallFt / 2 : wallFt,
    right: shared('right') ? wallFt / 2 : wallFt,
    bottom: shared('bottom') ? wallFt / 2 : wallFt,
    left: shared('left') ? wallFt / 2 : wallFt,
  };
}

export function useCanvasDrag({
  plan,
  currentFloor,
  pixelsPerFoot,
  snapToGrid,
  canvasRef,
  onUpdateRoom,
  onUpdateRoomEnd,
  appMode,
}: UseCanvasDragOptions) {
  const [draggingRoom, setDraggingRoom] = useState<string | null>(null);
  const [resizingRoom, setResizingRoom] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggingElement, setDraggingElement] = useState<{
    roomId: string;
    elementId: string;
  } | null>(null);
  const [elementDragOffset, setElementDragOffset] = useState({ x: 0, y: 0 });

  // Use refs to avoid stale closures in event listeners
  // Update refs via useEffect to avoid refs accessed during render
  const planRef = useRef(plan);
  const callbacksRef = useRef({ onUpdateRoom, onUpdateRoomEnd });
  // B-5: mirror appMode in a ref so global pointermove/pointerup listeners
  // can also gate themselves on a mid-drag mode toggle.
  const appModeRef = useRef(appMode);
  const stateRef = useRef({
    draggingRoom,
    resizingRoom,
    resizeHandle,
    dragOffset,
    draggingElement,
    elementDragOffset,
  });

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    callbacksRef.current = { onUpdateRoom, onUpdateRoomEnd };
  }, [onUpdateRoom, onUpdateRoomEnd]);

  useEffect(() => {
    appModeRef.current = appMode;
  }, [appMode]);

  useEffect(() => {
    stateRef.current = {
      draggingRoom,
      resizingRoom,
      resizeHandle,
      dragOffset,
      draggingElement,
      elementDragOffset,
    };
  }, [draggingRoom, resizingRoom, resizeHandle, dragOffset, draggingElement, elementDragOffset]);

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent,
      room: Room,
      type: 'drag' | 'resize',
      handle?: 'se' | 'sw' | 'ne' | 'nw'
    ) => {
      // B-5: lock pointer drag in non-edit modes.
      if (appModeRef.current !== 'edit') return;
      e.stopPropagation();
      if (type === 'drag') {
        setDraggingRoom(room.id);
        setDragOffset({
          x: e.clientX - room.x * pixelsPerFoot,
          y: e.clientY - room.y * pixelsPerFoot,
        });
      } else {
        setResizingRoom(room.id);
        setResizeHandle(handle || null);
      }
    },
    [pixelsPerFoot]
  );

  const handleElementPointerDown = useCallback(
    (e: React.PointerEvent, room: Room, element: Room['elements'][0]) => {
      // B-5: lock element drag in non-edit modes.
      if (appModeRef.current !== 'edit') return;
      e.stopPropagation();
      setDraggingElement({ roomId: room.id, elementId: element.id });

      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      // S-9: use planRef (not the closure-bound `plan`) so the
      // shared-wall lookup always sees the latest same-floor rooms.
      const otherFloorRooms = planRef.current.rooms.filter(
        (r) => r.id !== room.id && r.floor === currentFloor
      );
      const walls = getEffectiveWalls(room, otherFloorRooms);

      const elementAbsX = rect.left + (room.x + walls.left + element.x) * pixelsPerFoot;
      const elementAbsY = rect.top + (room.y + walls.top + element.y) * pixelsPerFoot;

      setElementDragOffset({
        x: e.clientX - elementAbsX,
        y: e.clientY - elementAbsY,
      });
    },
    [pixelsPerFoot, canvasRef]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const currentState = stateRef.current;
      const currentPlan = planRef.current;
      const { onUpdateRoom: updateRoom } = callbacksRef.current;

      if (currentState.draggingRoom) {
        const room = currentPlan.rooms.find((r) => r.id === currentState.draggingRoom);
        if (!room) return;

        const snapValue = snapToGrid ? SNAP_GRID_FT : SNAP_GRID_SUB_FT;
        let newX =
          Math.round((e.clientX - currentState.dragOffset.x) / pixelsPerFoot / snapValue) *
          snapValue;
        let newY =
          Math.round((e.clientY - currentState.dragOffset.y) / pixelsPerFoot / snapValue) *
          snapValue;

        const roomW = room.w;
        const roomH = room.h;
        const minX = currentPlan.setbacks.left;
        const minY = currentPlan.setbacks.top;
        const maxX = currentPlan.plotWidth - currentPlan.setbacks.right;
        const maxY = currentPlan.plotHeight - currentPlan.setbacks.bottom;

        newX = Math.max(minX, Math.min(newX, maxX - roomW));
        newY = Math.max(minY, Math.min(newY, maxY - roomH));

        const otherRooms = currentPlan.rooms.filter(
          (r) => r.id !== currentState.draggingRoom && r.floor === currentFloor
        );

        // X-axis clamping
        if (newX > room.x) {
          for (const other of otherRooms) {
            if (room.y < other.y + other.h && room.y + roomH > other.y) {
              if (other.x >= room.x + roomW) {
                newX = Math.min(newX, other.x - roomW);
              }
            }
          }
        } else if (newX < room.x) {
          for (const other of otherRooms) {
            if (room.y < other.y + other.h && room.y + roomH > other.y) {
              if (other.x + other.w <= room.x) {
                newX = Math.max(newX, other.x + other.w);
              }
            }
          }
        }

        // Y-axis clamping
        if (newY > room.y) {
          for (const other of otherRooms) {
            if (newX < other.x + other.w && newX + roomW > other.x) {
              if (other.y >= room.y + roomH) {
                newY = Math.min(newY, other.y - roomH);
              }
            }
          }
        } else if (newY < room.y) {
          for (const other of otherRooms) {
            if (newX < other.x + other.w && newX + roomW > other.x) {
              if (other.y + other.h <= room.y) {
                newY = Math.max(newY, other.y + other.h);
              }
            }
          }
        }

        updateRoom(currentState.draggingRoom, { x: newX, y: newY });
      } else if (currentState.resizingRoom && currentState.resizeHandle) {
        const room = currentPlan.rooms.find((r) => r.id === currentState.resizingRoom);
        if (!room) return;

        const mouseX = Math.round((e.clientX - rect.left) / pixelsPerFoot);
        const mouseY = Math.round((e.clientY - rect.top) / pixelsPerFoot);

        let newW = room.w;
        let newH = room.h;
        let newX = room.x;
        let newY = room.y;

        const maxX = currentPlan.plotWidth - currentPlan.setbacks.right;
        const maxY = currentPlan.plotHeight - currentPlan.setbacks.bottom;

        const otherRooms = currentPlan.rooms.filter(
          (r) => r.id !== currentState.resizingRoom && r.floor === currentFloor
        );

        if (currentState.resizeHandle.includes('e')) {
          newW = Math.max(2, mouseX - room.x);
          newW = Math.min(newW, maxX - room.x);
          for (const other of otherRooms) {
            if (room.y < other.y + other.h && room.y + room.h > other.y) {
              if (other.x >= room.x + room.w) {
                newW = Math.min(newW, other.x - room.x);
              }
            }
          }
        }
        if (currentState.resizeHandle.includes('s')) {
          newH = Math.max(2, mouseY - room.y);
          newH = Math.min(newH, maxY - room.y);
          for (const other of otherRooms) {
            if (room.x < other.x + other.w && room.x + newW > other.x) {
              if (other.y >= room.y + room.h) {
                newH = Math.min(newH, other.y - room.y);
              }
            }
          }
        }
        if (currentState.resizeHandle.includes('w')) {
          newW = Math.max(2, room.x + room.w - mouseX);
          newW = Math.min(newW, room.x + room.w - currentPlan.setbacks.left);
          newX = room.x + room.w - newW;
          for (const other of otherRooms) {
            if (room.y < other.y + other.h && room.y + room.h > other.y) {
              if (other.x + other.w <= room.x) {
                newX = Math.max(newX, other.x + other.w);
                newW = room.x + room.w - newX;
              }
            }
          }
        }
        if (currentState.resizeHandle.includes('n')) {
          newH = Math.max(2, room.y + room.h - mouseY);
          newH = Math.min(newH, room.y + room.h - currentPlan.setbacks.top);
          newY = room.y + room.h - newH;
          for (const other of otherRooms) {
            if (room.x < other.x + other.w && room.x + newW > other.x) {
              if (other.y + other.h <= room.y) {
                newY = Math.max(newY, other.y + other.h);
                newH = room.y + room.h - newY;
              }
            }
          }
        }

        updateRoom(currentState.resizingRoom, { w: newW, h: newH, x: newX, y: newY });
      } else if (currentState.draggingElement) {
        const room = currentPlan.rooms.find((r) => r.id === currentState.draggingElement!.roomId);
        if (!room) return;
        const element = room.elements?.find(
          (el) => el.id === currentState.draggingElement!.elementId
        );
        if (!element) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const elementAbsX = mouseX - currentState.elementDragOffset.x;
        const elementAbsY = mouseY - currentState.elementDragOffset.y;

        // S-9: account for shared walls. The dragged room's wall
        // thickness on a shared side is half the full wallFt, and the
        // inner area matches what's visible on the canvas (Room.tsx
        // applies the same isShared check when rendering).
        const otherFloorRooms = currentPlan.rooms.filter(
          (r) => r.id !== room.id && r.floor === currentFloor
        );
        const walls = getEffectiveWalls(room, otherFloorRooms);

        let newRelX = elementAbsX / pixelsPerFoot - room.x - walls.left;
        let newRelY = elementAbsY / pixelsPerFoot - room.y - walls.top;

        newRelX = Math.round(newRelX * 2) / 2;
        newRelY = Math.round(newRelY * 2) / 2;

        const innerW = room.w - walls.left - walls.right;
        const innerH = room.h - walls.top - walls.bottom;

        const isOpening = element.type === 'Door' || element.type === 'Window';
        // Allowance is the smaller of the two sides (shared side may be
        // half-thickness) so openings can sit at the room's outer edge.
        const allowanceX = isOpening ? Math.min(walls.left, walls.right) : 0;
        const allowanceY = isOpening ? Math.min(walls.top, walls.bottom) : 0;

        let minX = -allowanceX;
        let minY = -allowanceY;
        let maxX = innerW - element.w + allowanceX;
        let maxY = innerH - element.h + allowanceY;

        if (element.rotation % 180 !== 0) {
          minX = -allowanceX + (element.h - element.w) / 2;
          maxX = innerW - (element.w + element.h) / 2 + allowanceX;
          minY = -allowanceY + (element.w - element.h) / 2;
          maxY = innerH - (element.h + element.w) / 2 + allowanceY;
        }

        newRelX = Math.max(minX, Math.min(newRelX, maxX));
        newRelY = Math.max(minY, Math.min(newRelY, maxY));

        const updatedElements = room.elements?.map((el) =>
          el.id === element.id ? { ...el, x: newRelX, y: newRelY } : el
        );

        updateRoom(room.id, { elements: updatedElements });
      }
    };

    const handlePointerUp = () => {
      const currentState = stateRef.current;
      const { onUpdateRoomEnd } = callbacksRef.current;
      if (currentState.draggingRoom || currentState.resizingRoom || currentState.draggingElement) {
        onUpdateRoomEnd?.();
      }
      setDraggingRoom(null);
      setResizingRoom(null);
      setResizeHandle(null);
      setDraggingElement(null);
    };

    if (draggingRoom || resizingRoom || draggingElement) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    draggingRoom,
    resizingRoom,
    draggingElement,
    pixelsPerFoot,
    snapToGrid,
    currentFloor,
    canvasRef,
  ]);

  return {
    draggingRoom,
    resizingRoom,
    resizeHandle,
    draggingElement,
    handlePointerDown,
    handleElementPointerDown,
  };
}
