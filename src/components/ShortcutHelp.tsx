import React from "react";
import { X, Keyboard, Undo2, Redo2, Trash2, Copy, RotateCw, Grid, ZoomIn, ZoomOut, Download } from "lucide-react";

interface ShortcutHelpProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["Ctrl", "Z"], action: "Undo", icon: Undo2 },
  { keys: ["Ctrl", "Y"], action: "Redo", icon: Redo2 },
  { keys: ["Delete"], action: "Delete selected room", icon: Trash2 },
  { keys: ["Ctrl", "D"], action: "Duplicate selected room", icon: Copy },
  { keys: ["R"], action: "Rotate selected room", icon: RotateCw },
  { keys: ["G"], action: "Toggle Vastu Grid", icon: Grid },
  { keys: ["Ctrl", "+"], action: "Zoom in", icon: ZoomIn },
  { keys: ["Ctrl", "-"], action: "Zoom out", icon: ZoomOut },
  { keys: ["Ctrl", "S"], action: "Export as PNG", icon: Download },
  { keys: ["?"], action: "Show this help", icon: Keyboard },
];

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
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

        <div className="p-6">
          <p className="text-sm text-slate-500 mb-4">
            Press any of these keys when not typing in an input field.
          </p>
          <div className="space-y-2">
            {SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.action}
                className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
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
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Shortcuts are disabled while typing in input fields.
          </p>
        </div>
      </div>
    </div>
  );
};
