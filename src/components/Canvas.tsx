import React, { useState, useRef, useEffect } from "react";
import { Room, RoomType, FloorPlan, RoomElement, RoomLayer } from "../types";
import { cn } from "../utils";
import { analyzeRoomVastu } from "../services/vastu";

interface CanvasProps {
  plan: FloorPlan;
  currentFloor: number;
  zoom: number;
  showVastuGrid?: boolean;
  snapToGrid?: boolean;
  measuring?: boolean;
  setMeasuring?: (value: boolean) => void;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
  onUpdateRoomEnd?: () => void;
  onSelectRoom: (roomId: string | null, isShiftKey?: boolean) => void;
  selectedRoomIds: string[];
  layers?: RoomLayer[];
}

const ELEMENT_COLORS: Record<string, string> = {
  Bed: "bg-indigo-100 border-indigo-300 text-indigo-700",
  Cupboard: "bg-amber-100 border-amber-300 text-amber-700",
  "Side Table": "bg-orange-100 border-orange-300 text-orange-700",
  Stove: "bg-red-100 border-red-300 text-red-700",
  Sink: "bg-cyan-100 border-cyan-300 text-cyan-700",
  Fridge: "bg-slate-200 border-slate-400 text-slate-700",
  Sofa: "bg-rose-100 border-rose-300 text-rose-700",
  "TV Unit": "bg-zinc-200 border-zinc-400 text-zinc-700",
  "Coffee Table": "bg-stone-200 border-stone-400 text-stone-700",
  Toilet: "bg-sky-100 border-sky-300 text-sky-700",
  "Wash Basin": "bg-blue-100 border-blue-300 text-blue-700",
  Shower: "bg-teal-100 border-teal-300 text-teal-700",
  Mandir: "bg-yellow-100 border-yellow-400 text-yellow-800",
  "Dining Table": "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700",
  Chair: "bg-pink-100 border-pink-300 text-pink-700",
  Plants: "bg-emerald-100 border-emerald-300 text-emerald-700",
  Desk: "bg-violet-100 border-violet-300 text-violet-700",
  Bookshelf: "bg-purple-100 border-purple-300 text-purple-700",
  Shelf: "bg-neutral-200 border-neutral-400 text-neutral-700",
  Car: "bg-slate-300 border-slate-500 text-slate-800",
  Bike: "bg-gray-300 border-gray-500 text-gray-800",
  Door: "bg-amber-700 border-amber-900 text-white z-20 shadow-md",
  Window:
    "bg-sky-200/80 border-sky-400 border-[1.5px] text-sky-800 z-20 shadow-sm backdrop-blur-sm",
};

export function Canvas({
  plan,
  currentFloor,
  zoom,
  showVastuGrid,
  snapToGrid = true,
  measuring = false,
  setMeasuring,
  onUpdateRoom,
  onUpdateRoomEnd,
  onSelectRoom,
  selectedRoomIds,
  layers,
}: CanvasProps) {
  const PIXELS_PER_FOOT = 20 * zoom;

  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingRoom, setDraggingRoom] = useState<string | null>(null);
  const [resizingRoom, setResizingRoom] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<
    "se" | "sw" | "ne" | "nw" | null
  >(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [draggingElement, setDraggingElement] = useState<{
    roomId: string;
    elementId: string;
  } | null>(null);
  const [elementDragOffset, setElementDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [isDraggingRoom, setIsDraggingRoom] = useState(false);

  const [measureStart, setMeasureStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(
    null,
  );

  const getVastuZone = (index: number, northAngle: number) => {
    if (index === 4) return "Brahmasthan";

    const col = index % 3;
    const row = Math.floor(index / 3);
    const dx = col - 1;
    const dy = row - 1;

    let cellAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    let compassAngle = (cellAngle + 90 - northAngle) % 360;
    if (compassAngle < 0) compassAngle += 360;

    const snapped = (Math.round(compassAngle / 45) * 45) % 360;

    const zones: Record<number, string> = {
      0: "North",
      45: "North-East",
      90: "East",
      135: "South-East",
      180: "South",
      225: "South-West",
      270: "West",
      315: "North-West",
    };

    return zones[snapped] || "";
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    room: Room,
    type: "drag" | "resize",
    handle?: "se" | "sw" | "ne" | "nw",
  ) => {
    e.stopPropagation();
    onSelectRoom(room.id, e.shiftKey);

    if (type === "drag") {
      setDraggingRoom(room.id);
      setDragOffset({
        x: e.clientX - room.x * PIXELS_PER_FOOT,
        y: e.clientY - room.y * PIXELS_PER_FOOT,
      });
    } else {
      setResizingRoom(room.id);
      setResizeHandle(handle || null);
    }
  };

  const handleElementPointerDown = (
    e: React.PointerEvent,
    room: Room,
    element: RoomElement,
  ) => {
    e.stopPropagation();
    onSelectRoom(room.id, e.shiftKey);
    setDraggingElement({ roomId: room.id, elementId: element.id });

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    const wallFt = (room.wallThickness || 9) / 12;

    // Offset relative to the element's top-left corner
    const elementAbsX =
      rect.left + (room.x + wallFt + element.x) * PIXELS_PER_FOOT;
    const elementAbsY =
      rect.top + (room.y + wallFt + element.y) * PIXELS_PER_FOOT;

    setElementDragOffset({
      x: e.clientX - elementAbsX,
      y: e.clientY - elementAbsY,
    });
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();

      if (draggingRoom) {
        const room = plan.rooms.find((r) => r.id === draggingRoom);
        if (!room) return;

        // Snap to grid if enabled
        const snapValue = snapToGrid ? 1 : 0.1;
        let newX =
          Math.round((e.clientX - dragOffset.x) / PIXELS_PER_FOOT / snapValue) *
          snapValue;
        let newY =
          Math.round((e.clientY - dragOffset.y) / PIXELS_PER_FOOT / snapValue) *
          snapValue;

        // Constrain to buildable area
        const roomW = room.w;
        const roomH = room.h;

        const minX = plan.setbacks.left;
        const minY = plan.setbacks.top;
        const maxX = plan.plotWidth - plan.setbacks.right;
        const maxY = plan.plotHeight - plan.setbacks.bottom;

        newX = Math.max(minX, Math.min(newX, maxX - roomW));
        newY = Math.max(minY, Math.min(newY, maxY - roomH));

        // Prevent overlapping with other rooms by clamping
        const otherRooms = plan.rooms.filter(
          (r) => r.id !== draggingRoom && r.floor === currentFloor,
        );

        // X-axis clamping
        if (newX > room.x) {
          // Moving right
          for (const other of otherRooms) {
            if (room.y < other.y + other.h && room.y + roomH > other.y) {
              // Y overlaps
              if (other.x >= room.x + roomW) {
                // Other is to the right
                newX = Math.min(newX, other.x - roomW);
              }
            }
          }
        } else if (newX < room.x) {
          // Moving left
          for (const other of otherRooms) {
            if (room.y < other.y + other.h && room.y + roomH > other.y) {
              // Y overlaps
              if (other.x + other.w <= room.x) {
                // Other is to the left
                newX = Math.max(newX, other.x + other.w);
              }
            }
          }
        }

        // Y-axis clamping
        if (newY > room.y) {
          // Moving down
          for (const other of otherRooms) {
            if (newX < other.x + other.w && newX + roomW > other.x) {
              // X overlaps (using newX)
              if (other.y >= room.y + roomH) {
                // Other is below
                newY = Math.min(newY, other.y - roomH);
              }
            }
          }
        } else if (newY < room.y) {
          // Moving up
          for (const other of otherRooms) {
            if (newX < other.x + other.w && newX + roomW > other.x) {
              // X overlaps (using newX)
              if (other.y + other.h <= room.y) {
                // Other is above
                newY = Math.max(newY, other.y + other.h);
              }
            }
          }
        }

        onUpdateRoom(draggingRoom, { x: newX, y: newY });
      } else if (resizingRoom && resizeHandle) {
        const room = plan.rooms.find((r) => r.id === resizingRoom);
        if (!room) return;

        const mouseX = Math.round((e.clientX - rect.left) / PIXELS_PER_FOOT);
        const mouseY = Math.round((e.clientY - rect.top) / PIXELS_PER_FOOT);

        let newW = room.w;
        let newH = room.h;
        let newX = room.x;
        let newY = room.y;

        const maxX = plan.plotWidth - plan.setbacks.right;
        const maxY = plan.plotHeight - plan.setbacks.bottom;

        const otherRooms = plan.rooms.filter(
          (r) => r.id !== resizingRoom && r.floor === currentFloor,
        );

        if (resizeHandle.includes("e")) {
          newW = Math.max(2, mouseX - room.x);
          newW = Math.min(newW, maxX - room.x);
          // Prevent overlapping with rooms to the right
          for (const other of otherRooms) {
            if (room.y < other.y + other.h && room.y + room.h > other.y) {
              if (other.x >= room.x + room.w) {
                newW = Math.min(newW, other.x - room.x);
              }
            }
          }
        }
        if (resizeHandle.includes("s")) {
          newH = Math.max(2, mouseY - room.y);
          newH = Math.min(newH, maxY - room.y);
          // Prevent overlapping with rooms below
          for (const other of otherRooms) {
            if (room.x < other.x + other.w && room.x + newW > other.x) {
              if (other.y >= room.y + room.h) {
                newH = Math.min(newH, other.y - room.y);
              }
            }
          }
        }

        onUpdateRoom(resizingRoom, { w: newW, h: newH, x: newX, y: newY });
      } else if (draggingElement) {
        const room = plan.rooms.find((r) => r.id === draggingElement.roomId);
        if (!room) return;
        const element = room.elements?.find(
          (el) => el.id === draggingElement.elementId,
        );
        if (!element) return;

        // Calculate absolute position of the mouse relative to the canvas
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate the new absolute position of the element's top-left corner
        const elementAbsX = mouseX - elementDragOffset.x;
        const elementAbsY = mouseY - elementDragOffset.y;

        const wallFt = (room.wallThickness || 9) / 12;

        // Convert to relative position within the room's inner area (in feet)
        let newRelX = elementAbsX / PIXELS_PER_FOOT - room.x - wallFt;
        let newRelY = elementAbsY / PIXELS_PER_FOOT - room.y - wallFt;

        // Optional: Snap to 0.5 ft grid for elements
        newRelX = Math.round(newRelX * 2) / 2;
        newRelY = Math.round(newRelY * 2) / 2;

        // Constrain to room's inner bounds
        const innerW = room.w - 2 * wallFt;
        const innerH = room.h - 2 * wallFt;

        const isOpening = element.type === "Door" || element.type === "Window";
        const allowanceX = isOpening ? wallFt : 0;
        const allowanceY = isOpening ? wallFt : 0;

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
          el.id === element.id ? { ...el, x: newRelX, y: newRelY } : el,
        );

        onUpdateRoom(room.id, { elements: updatedElements });
      }
    };

    const handlePointerUp = () => {
      if (draggingRoom || resizingRoom || draggingElement) {
        onUpdateRoomEnd?.();
      }
      setDraggingRoom(null);
      setResizingRoom(null);
      setResizeHandle(null);
      setDraggingElement(null);
    };

    if (draggingRoom || resizingRoom || draggingElement) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    draggingRoom,
    resizingRoom,
    resizeHandle,
    dragOffset,
    draggingElement,
    elementDragOffset,
    plan,
    onUpdateRoom,
    onUpdateRoomEnd,
    PIXELS_PER_FOOT,
  ]);

  const floorRooms = plan.rooms.filter((r) => {
    if (r.floor !== currentFloor) return false;
    if (!layers || layers.length === 0) return true;
    const layer = layers.find((l) => l.name === r.category);
    if (!layer) return true;
    return layer.visible;
  });
  const buildableW = Math.max(
    0,
    plan.plotWidth - plan.setbacks.left - plan.setbacks.right,
  );
  const buildableH = Math.max(
    0,
    plan.plotHeight - plan.setbacks.top - plan.setbacks.bottom,
  );

  return (
    <div
      className="relative bg-white border-2 border-slate-300 shadow-inner overflow-visible mx-auto mt-8 ml-8"
      style={{
        width: plan.plotWidth * PIXELS_PER_FOOT,
        height: plan.plotHeight * PIXELS_PER_FOOT,
        backgroundImage:
          "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
        backgroundSize: `${PIXELS_PER_FOOT}px ${PIXELS_PER_FOOT}px`,
      }}
      ref={canvasRef}
      onPointerDown={(e) => {
        if (!e.shiftKey) onSelectRoom(null);
        if (measuring && setMeasuring) {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            const x = (e.clientX - rect.left) / PIXELS_PER_FOOT;
            const y = (e.clientY - rect.top) / PIXELS_PER_FOOT;
            if (!measureStart) {
              setMeasureStart({ x, y });
            } else {
              setMeasureEnd({ x, y });
              setMeasuring(false);
              setMeasureStart(null);
              setMeasureEnd(null);
            }
          }
        }
      }}
    >
      {/* Ruler Measurement Tool */}
      {measuring && (
        <div className="absolute top-4 right-4 bg-slate-900/80 text-white text-[10px] px-3 py-2 rounded-lg z-20 pointer-events-none">
          Click two points to measure distance
        </div>
      )}
      {measureStart && measureEnd && (
        <div className="absolute top-12 right-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-2 shadow-sm max-w-[150px] z-30">
          <div className="text-[9px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
            Measurement
          </div>
          <div className="text-[10px] text-slate-800">
            Distance:{" "}
            {Math.round(
              Math.sqrt(
                (measureEnd.x - measureStart.x) ** 2 +
                  (measureEnd.y - measureStart.y) ** 2,
              ),
            )}
            ' ft
          </div>
        </div>
      )}
      {/* Plot Dimensions */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 bg-slate-800 text-white text-xs px-2 py-1 rounded font-mono z-20 shadow-sm">
        {plan.plotWidth}'
      </div>
      <div className="absolute top-1/2 left-0 -translate-x-6 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded font-mono z-20 -rotate-90 shadow-sm">
        {plan.plotHeight}'
      </div>

      {/* Setback Area Indicator */}
      <div
        className="absolute border-2 border-dashed border-emerald-500/30 bg-emerald-50/10 pointer-events-none"
        style={{
          left: plan.setbacks.left * PIXELS_PER_FOOT,
          top: plan.setbacks.top * PIXELS_PER_FOOT,
          width: buildableW * PIXELS_PER_FOOT,
          height: buildableH * PIXELS_PER_FOOT,
        }}
      >
        {/* Buildable Area Dimensions */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-t font-mono">
          {buildableW}'
        </div>
        <div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-l font-mono -rotate-90 origin-right">
          {buildableH}'
        </div>

        {/* Vastu Grid */}
        {showVastuGrid && (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-30">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="border border-indigo-500/20 flex flex-col items-center justify-center bg-indigo-50/10 backdrop-blur-[1px]"
              >
                <span className="text-[10px] font-bold text-indigo-800/60 uppercase tracking-wider text-center px-1">
                  {getVastuZone(i, plan.northAngle)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {floorRooms.map((room) => {
        const vastu = analyzeRoomVastu(room, plan);
        const vastuColor =
          vastu.status === "good"
            ? "bg-emerald-100/80 border-emerald-400"
            : vastu.status === "average"
              ? "bg-amber-100/80 border-amber-400"
              : "bg-red-100/80 border-red-400";

        const wallFt = (room.wallThickness || 9) / 12;
        const TOLERANCE = 0.1;

        const isShared = (side: "top" | "right" | "bottom" | "left") => {
          return floorRooms.some((other) => {
            if (other.id === room.id) return false;
            const overlapsX =
              room.x < other.x + other.w - TOLERANCE &&
              room.x + room.w > other.x + TOLERANCE;
            const overlapsY =
              room.y < other.y + other.h - TOLERANCE &&
              room.y + room.h > other.y + TOLERANCE;

            if (side === "top")
              return (
                Math.abs(room.y - (other.y + other.h)) < TOLERANCE && overlapsX
              );
            if (side === "bottom")
              return (
                Math.abs(room.y + room.h - other.y) < TOLERANCE && overlapsX
              );
            if (side === "left")
              return (
                Math.abs(room.x - (other.x + other.w)) < TOLERANCE && overlapsY
              );
            if (side === "right")
              return (
                Math.abs(room.x + room.w - other.x) < TOLERANCE && overlapsY
              );
            return false;
          });
        };

        const leftWall = isShared("left") ? wallFt / 2 : wallFt;
        const rightWall = isShared("right") ? wallFt / 2 : wallFt;
        const topWall = isShared("top") ? wallFt / 2 : wallFt;
        const bottomWall = isShared("bottom") ? wallFt / 2 : wallFt;

        const innerW = Math.max(0, room.w - leftWall - rightWall);
        const innerH = Math.max(0, room.h - topWall - bottomWall);

        return (
          <div
            key={room.id}
            className={cn(
              "absolute flex items-center justify-center cursor-move select-none transition-colors",
              selectedRoomIds.includes(room.id) ? "ring-2 ring-blue-500 z-10" : "z-0",
              vastuColor,
            )}
            style={{
              left: room.x * PIXELS_PER_FOOT,
              top: room.y * PIXELS_PER_FOOT,
              width: room.w * PIXELS_PER_FOOT,
              height: room.h * PIXELS_PER_FOOT,
              borderWidth: `${((room.wallThickness || 9) / 12) * PIXELS_PER_FOOT}px`,
              borderStyle: "solid",
            }}
            onPointerDown={(e) => handlePointerDown(e, room, "drag")}
          >
            <span className="text-xs font-medium text-slate-800 pointer-events-none px-1 text-center leading-tight">
              {room.type}
              <br />
              <span className="text-[10px] text-slate-600 block leading-tight mt-0.5">
                {plan.unit === "ft"
                  ? `${room.w}' x ${room.h}'`
                  : `${(room.w * 0.3048).toFixed(1)}m x ${(room.h * 0.3048).toFixed(1)}m`}
              </span>
              <span className="text-[9px] text-slate-500 block leading-tight">
                {plan.unit === "ft"
                  ? `In: ${innerW.toFixed(1)}' x ${innerH.toFixed(1)}'`
                  : `In: ${(innerW * 0.3048).toFixed(1)}m x ${(innerH * 0.3048).toFixed(1)}m`}
              </span>
            </span>

            {/* Render Elements */}
            {room.elements?.map((el) => {
              const colorClass =
                ELEMENT_COLORS[el.type] ||
                "bg-white/80 border-slate-400 text-slate-600";
              return (
                <div
                  key={el.id}
                  className={cn(
                    "absolute border flex items-center justify-center cursor-move shadow-sm text-[8px] font-medium overflow-hidden",
                    colorClass,
                  )}
                  style={{
                    left: el.x * PIXELS_PER_FOOT,
                    top: el.y * PIXELS_PER_FOOT,
                    width: el.w * PIXELS_PER_FOOT,
                    height: el.h * PIXELS_PER_FOOT,
                    transform: `rotate(${el.rotation}deg)`,
                  }}
                  onPointerDown={(e) => handleElementPointerDown(e, room, el)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const newRotation = (el.rotation + 90) % 360;
                    const updatedElements = room.elements?.map((eItem) =>
                      eItem.id === el.id
                        ? { ...eItem, rotation: newRotation }
                        : eItem,
                    );
                    onUpdateRoom(room.id, { elements: updatedElements });
                  }}
                >
                  {el.type}
                </div>
              );
            })}

            {selectedRoomIds.includes(room.id) && (
              <>
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize"
                  onPointerDown={(e) =>
                    handlePointerDown(e, room, "resize", "se")
                  }
                />
              </>
            )}
          </div>
        );
      })}

      {/* Compass */}
      <div
        className="absolute top-4 left-4 flex flex-col items-center opacity-70 pointer-events-none transition-transform duration-300"
        style={{ transform: `rotate(${plan.northAngle}deg)` }}
      >
        <span className="text-xs font-bold text-red-600 mb-1">N</span>
        <div className="w-0.5 h-8 bg-slate-400 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 border-l-2 border-t-2 border-red-600 rotate-45"></div>
        </div>
      </div>

      {/* Snap to Grid Toggle Indicator */}
      {snapToGrid && (
        <div className="absolute top-4 right-4 bg-slate-900/70 text-white text-[9px] px-2 py-1 rounded z-20 pointer-events-none">
          GRID SNAP ON
        </div>
      )}

      {/* Vastu Zone Legend */}
      <div
        className="absolute top-24 left-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-2 shadow-sm max-w-[200px] z-20 hidden md:block"
        onMouseLeave={() => setHoveredZone(null)}
      >
        <div className="text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
          Vastu Zones
        </div>
        <div className="grid grid-cols-2 gap-1">
          {[
            "North",
            "North-East",
            "East",
            "South-East",
            "South",
            "South-West",
            "West",
            "North-West",
            "Brahmasthan",
          ].map((zone) => (
            <div
              key={zone}
              className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                hoveredZone === zone
                  ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
              onMouseEnter={() => setHoveredZone(zone)}
            >
              <span className="font-medium">{zone}</span>
            </div>
          ))}
        </div>
        {hoveredZone && (
          <div className="mt-2 pt-1.5 border-t border-slate-100">
            <p className="text-[9px] text-slate-600">
              Hover over zones to see explanations
            </p>
          </div>
        )}
      </div>

      {/* Road Indicator */}
      <div
        className={cn(
          "absolute bg-slate-800 text-white text-xs font-bold flex items-center justify-center pointer-events-none z-20",
          plan.roadDirection === "N"
            ? "top-0 left-0 right-0 h-4"
            : plan.roadDirection === "S"
              ? "bottom-0 left-0 right-0 h-4"
              : plan.roadDirection === "E"
                ? "top-0 bottom-0 right-0 w-4"
                : "top-0 bottom-0 left-0 w-4",
        )}
      >
        <span
          className={cn(
            plan.roadDirection === "E" || plan.roadDirection === "W"
              ? "-rotate-90 whitespace-nowrap"
              : "",
          )}
        >
          ROAD
        </span>
      </div>
    </div>
  );
}