import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Trash2, Layers } from 'lucide-react';
import { RoomLayer, Room } from '../types';

interface LayerManagerProps {
  layers: RoomLayer[];
  onUpdateLayers: (layers: RoomLayer[]) => void;
  rooms: Room[];
  currentFloor: number;
}

const DEFAULT_LAYER_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ef4444', // red
  '#14b8a6', // teal
];

export const LayerManager: React.FC<LayerManagerProps> = ({
  layers,
  onUpdateLayers,
  rooms,
  currentFloor,
}) => {
  const [newLayerName, setNewLayerName] = useState('');

  const toggleVisibility = (layerId: string) => {
    onUpdateLayers(layers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)));
  };

  const addLayer = () => {
    const name = newLayerName.trim();
    if (!name) return;
    if (layers.some((l) => l.name === name)) return;

    const color = DEFAULT_LAYER_COLORS[layers.length % DEFAULT_LAYER_COLORS.length];
    onUpdateLayers([...layers, { id: crypto.randomUUID(), name, color, visible: true, rooms: [] }]);
    setNewLayerName('');
  };

  const removeLayer = (layerId: string) => {
    onUpdateLayers(layers.filter((l) => l.id !== layerId));
  };

  return (
    <div className="p-5 border-b border-border-soft ">
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 text-fg ">
        <Layers className="w-4 h-4" /> Layers
      </h3>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newLayerName}
          onChange={(e) => setNewLayerName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addLayer();
          }}
          placeholder="New layer name..."
          className="flex-1 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-accent outline-none bg-bg border-border text-fg"
        />
        <button
          onClick={addLayer}
          disabled={!newLayerName.trim()}
          className="p-1.5 bg-accent text-accent-on rounded-md hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Add Layer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md border transition-colors border-border-soft  ${layer.visible ? '' : 'opacity-50'}`}
          >
            <button
              onClick={() => toggleVisibility(layer.id)}
              className="p-0.5 text-meta hover:text-accent transition-colors"
              title={layer.visible ? 'Hide Layer' : 'Show Layer'}
            >
              {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: layer.color }}
            />
            <span className="flex-1 text-xs font-medium truncate text-fg-2 dark:text-meta">
              {layer.name}
            </span>
            <span className="text-[10px] text-meta dark:text-muted">
              {rooms.filter((r) => r.floor === currentFloor && r.category === layer.name).length}
            </span>
            <button
              onClick={() => removeLayer(layer.id)}
              className="p-0.5 text-meta hover:text-danger transition-colors"
              title="Remove Layer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {layers.length === 0 && (
        <p className="text-[10px] text-center py-2 text-meta dark:text-muted">
          No layers yet. Create one to organize rooms.
        </p>
      )}
    </div>
  );
};
