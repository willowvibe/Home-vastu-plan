import React from 'react';
import { Layers, FolderOpen, Sun, Moon, HelpCircle } from 'lucide-react';
import { FloorPlan, AppMode } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  plan: FloorPlan;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  activeTab: 'design' | 'image';
  setActiveTab: (tab: 'design' | 'image') => void;
  setShowProjectManager: (show: boolean) => void;
  vastuScore: number;
  setShowShortcutHelp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  plan,
  appMode,
  setAppMode,
  activeTab,
  setActiveTab,
  setShowProjectManager,
  vastuScore,
  setShowShortcutHelp,
}) => {
  const { darkMode, toggle: toggleDarkMode } = useTheme();

  const getVastuColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getVastuBadgeColor = (score: number, isDark: boolean) => {
    if (score >= 80)
      return isDark ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-200';
    if (score >= 50)
      return isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200';
    return isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200';
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-20 gap-3 md:gap-0 transition-colors duration-200">
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 hover:scale-105 bg-indigo-600 shadow-indigo-200 dark:shadow-indigo-900/50">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight transition-colors text-slate-900 dark:text-white">
              VastuPlan 2D
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Indian Home Design & Vastu
            </p>
          </div>
        </div>

        {/* Mobile Vastu Score */}
        {plan.rooms.length > 0 && (
          <div
            className={`md:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${getVastuBadgeColor(vastuScore, darkMode)}`}
          >
            <div className={`text-sm font-bold ${getVastuColor(vastuScore)}`}>{vastuScore}/100</div>
            <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">Score</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto justify-between md:justify-end">
        {appMode !== 'edit' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {appMode} Mode
            </div>
            {appMode === 'view' && (
              <button
                onClick={() => setAppMode('edit')}
                className="ml-2 text-xs text-indigo-600 hover:underline transition-colors"
              >
                Edit Copy
              </button>
            )}
          </div>
        )}

        {plan.rooms.length > 0 && (
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${getVastuBadgeColor(vastuScore, darkMode)}`}
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Vastu Score
            </div>
            <div className={`text-sm font-bold ${getVastuColor(vastuScore)}`}>{vastuScore}/100</div>
          </div>
        )}

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg border transition-all duration-300 hover:scale-105 hover:shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-amber-600"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setShowShortcutHelp?.()}
          className="p-2 rounded-lg border transition-colors bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-lg w-full md:w-auto backdrop-blur-sm shadow-sm">
          <button
            onClick={() => setShowProjectManager(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
            title="Projects & Versions"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden md:inline">Projects</span>
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center"></div>
          <button
            onClick={() => setActiveTab('design')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'design' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            Floor Plan
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'image' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            AI Image Editor
          </button>
        </div>
      </div>
    </header>
  );
};
