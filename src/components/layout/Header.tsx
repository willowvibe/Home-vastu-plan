import React from 'react';
import { Layers, FolderOpen, Sun, Moon } from 'lucide-react';
import { FloorPlan } from '../../types';

interface HeaderProps {
  plan: FloorPlan;
  appMode: 'edit' | 'view' | 'comment';
  setAppMode: (mode: 'edit' | 'view' | 'comment') => void;
  activeTab: 'design' | 'image';
  setActiveTab: (tab: 'design' | 'image') => void;
  setShowProjectManager: (show: boolean) => void;
  vastuScore: number;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  plan,
  appMode,
  setAppMode,
  activeTab,
  setActiveTab,
  setShowProjectManager,
  vastuScore,
  darkMode,
  setDarkMode,
}) => {
  return (
    <header
      className={`border-b px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-20 gap-3 md:gap-0 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
    >
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${darkMode ? 'bg-indigo-600' : 'bg-indigo-600'}`}
          >
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1
              className={`text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}
            >
              VastuPlan 2D
            </h1>
            <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Indian Home Design & Vastu
            </p>
          </div>
        </div>

        {/* Mobile Vastu Score */}
        {plan.rooms.length > 0 && (
          <div
            className={`md:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
          >
            <div
              className={`text-sm font-bold ${vastuScore >= 80 ? 'text-emerald-600' : vastuScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}
            >
              {vastuScore}/100
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end">
        {appMode !== 'edit' && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'}`}
          >
            <div
              className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}
            >
              {appMode} Mode
            </div>
            {appMode === 'view' && (
              <button
                onClick={() => setAppMode('edit')}
                className="ml-2 text-xs text-indigo-600 hover:underline"
              >
                Edit Copy
              </button>
            )}
          </div>
        )}

        {plan.rooms.length > 0 && (
          <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <div className="text-xs font-medium text-slate-500">Vastu Score</div>
            <div
              className={`text-sm font-bold ${vastuScore >= 80 ? 'text-emerald-600' : vastuScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}
            >
              {vastuScore}/100
            </div>
          </div>
        )}

        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-lg border transition-colors ${darkMode ? 'bg-slate-800 border-slate-600 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setShowProjectManager(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-2"
            title="Projects & Versions"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden md:inline">Projects</span>
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
          <button
            onClick={() => setActiveTab('design')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'design' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Floor Plan
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'image' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            AI Image Editor
          </button>
        </div>
      </div>
    </header>
  );
};
