import React from "react";
import { RoomElement as RoomElementType } from "../types";
import { cn } from "../utils";

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

interface RoomElementProps {
  element: RoomElementType;
  pixelsPerFoot: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

export const RoomElement: React.FC<RoomElementProps> = React.memo(
  ({ element, pixelsPerFoot, onPointerDown, onDoubleClick }) => {
    const colorClass =
      ELEMENT_COLORS[element.type] ||
      "bg-white/80 border-slate-400 text-slate-600";

    return (
      <div
        className={cn(
          "absolute border flex items-center justify-center cursor-move shadow-sm text-[8px] font-medium overflow-hidden",
          colorClass,
        )}
        style={{
          left: element.x * pixelsPerFoot,
          top: element.y * pixelsPerFoot,
          width: element.w * pixelsPerFoot,
          height: element.h * pixelsPerFoot,
          transform: `rotate(${element.rotation}deg)`,
        }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        {element.type}
      </div>
    );
  },
);
RoomElement.displayName = "RoomElement";
