import React, { useState, useMemo } from 'react';
import {
  X,
  Keyboard,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  RotateCw,
  Grid,
  ZoomIn,
  ZoomOut,
  Download,
  Move,
  Plus,
  Search,
} from 'lucide-react';

interface ShortcutHelpProps {
  onClose: () => void;
}

interface ShortcutCategory {
  id: string;
  name: string;
  icon: React.FC<{ className?: string }>;
  shortcuts: Shortcut[];
}

interface Shortcut {
  keys: string[];
  action: string;
  icon: React.FC<{ className?: string }>;
}

const NAVIGATION_SHORTCUTS: Shortcut[] = [
  { keys: ['?'], action: 'Show this help', icon: Keyboard },
  { keys: ['H'], action: 'Hide sidebar', icon: Keyboard },
  { keys: ['Tab'], action: 'Switch to next panel', icon: Keyboard },
];

const ROOM_SHORTCUTS: Shortcut[] = [
  { keys: ['Ctrl', 'Z'], action: 'Undo', icon: Undo2 },
  { keys: ['Ctrl', 'Y'], action: 'Redo', icon: Redo2 },
  { keys: ['Delete'], action: 'Delete selected room', icon: Trash2 },
  { keys: ['Ctrl', 'D'], action: 'Duplicate selected room', icon: Copy },
  { keys: ['R'], action: 'Rotate selected room', icon: RotateCw },
  { keys: ['Arrows'], action: 'Move selected room', icon: Move },
];

const VIEW_SHORTCUTS: Shortcut[] = [
  { keys: ['G'], action: 'Toggle Vastu Grid', icon: Grid },
  { keys: ['Ctrl', '+'], action: 'Zoom in', icon: ZoomIn },
  { keys: ['Ctrl', '-'], action: 'Zoom out', icon: ZoomOut },
  { keys: ['Space'], action: 'Pan canvas (drag)', icon: Move },
];

const EXPORT_SHORTCUTS: Shortcut[] = [
  { keys: ['Ctrl', 'S'], action: 'Export as PNG', icon: Download },
  { keys: ['Ctrl', 'Shift', 'S'], action: 'Export as SVG', icon: Download },
  { keys: ['Ctrl', 'P'], action: 'Print plan', icon: Download },
];

const ALL_CATEGORIES: ShortcutCategory[] = [
  { id: 'navigation', name: 'Navigation', icon: Keyboard, shortcuts: NAVIGATION_SHORTCUTS },
  { id: 'room', name: 'Room Management', icon: Plus, shortcuts: ROOM_SHORTCUTS },
  { id: 'view', name: 'View Controls', icon: Search, shortcuts: VIEW_SHORTCUTS },
  { id: 'export', name: 'Export', icon: Download, shortcuts: EXPORT_SHORTCUTS },
];

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<string>(ALL_CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  const currentCategory = useMemo(
    () => ALL_CATEGORIES.find((c) => c.id === activeTab) || ALL_CATEGORIES[0],
    [activeTab]
  );

  const filteredShortcuts = useMemo(() => {
    if (!searchQuery) return currentCategory.shortcuts;
    return currentCategory.shortcuts.filter((s) =>
      s.action.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentCategory, searchQuery]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-600" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center px-6 py-2 border-b border-slate-100 bg-slate-50 shrink-0 overflow-x-auto gap-1">
          {ALL_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveTab(category.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === category.id
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.name}
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto min-h-0 flex-1">
          <p className="text-sm text-slate-500 mb-4">
            Press any of these keys when not typing in an input field.
          </p>
          {filteredShortcuts.length > 0 ? (
            <div className="space-y-2">
              {filteredShortcuts.map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <shortcut.icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{shortcut.action}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <React.Fragment key={key}>
                        <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-medium text-slate-700 shadow-sm">
                          {key}
                        </kbd>
                        {i < shortcut.keys.length - 1 && (
                          <span className="text-xs text-slate-400 mx-0.5">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No shortcuts found matching "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center shrink-0">
          <p className="text-xs text-slate-500">
            Shortcuts are disabled while typing in input fields.
          </p>
        </div>
      </div>
    </div>
  );
};
