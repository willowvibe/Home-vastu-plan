import React, { useEffect, useRef, useState } from 'react';
import { Layers, FolderOpen, Sun, Moon, HelpCircle, User, LogOut } from 'lucide-react';
import { FloorPlan, AppMode } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  plan: FloorPlan;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  activeTab: 'design' | 'image';
  setActiveTab: (tab: 'design' | 'image') => void;
  setShowProjectManager: (show: boolean) => void;
  vastuScore: number;
  setShowShortcutHelp?: () => void;
  onOpenAuth?: () => void;
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
  onOpenAuth,
}) => {
  const { darkMode, toggle: toggleDarkMode } = useTheme();
  const { isEnabled, isAuthenticated, user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  const getVastuColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warn';
    return 'text-danger';
  };

  const getVastuBadgeColor = (score: number, isDark: boolean) => {
    if (score >= 80)
      return isDark ? 'bg-success/10 border-success/30' : 'bg-success/10 border-success/30';
    if (score >= 50) return isDark ? 'bg-warn/10 border-warn/30' : 'bg-warn/10 border-warn/30';
    return isDark ? 'bg-danger/10 border-danger/30' : 'bg-danger/10 border-danger/30';
  };

  return (
    <header className="border-b border-border bg-surface-warm/95 /95 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-20 gap-3 md:gap-0 transition-colors duration-200">
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 hover:scale-105 bg-accent shadow-elev-ring">
            <Layers className="w-6 h-6 text-accent-on" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight transition-colors text-fg">
              VastuPlan 2D
            </h1>
            <p className="text-xs font-medium text-muted dark:text-meta">
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
            <span className="text-[10px] uppercase text-muted dark:text-meta">Score</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto justify-between md:justify-end">
        {appMode !== 'edit' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-warn/10 border-warn/30">
            <div className="text-xs font-bold uppercase tracking-wider text-warn">
              {appMode} Mode
            </div>
            {appMode === 'view' && (
              <button
                onClick={() => setAppMode('edit')}
                className="ml-2 text-xs text-accent hover:underline transition-colors"
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
            <div className="text-xs font-medium text-muted dark:text-meta">Vastu Score</div>
            <div className={`text-sm font-bold ${getVastuColor(vastuScore)}`}>{vastuScore}/100</div>
          </div>
        )}

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg border transition-all duration-300 hover:scale-105 hover:shadow-sm bg-surface border-border text-muted dark:text-warn hover:bg-surface-warm hover:border-border-strong dark:hover:border-warn"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setShowShortcutHelp?.()}
          className="p-2 rounded-lg border transition-colors bg-surface border-border text-muted dark:text-meta hover:bg-surface-warm"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="flex bg-surface-warm/80 /80 p-1 rounded-lg w-full md:w-auto backdrop-blur-sm shadow-sm">
          <button
            onClick={() => setShowProjectManager(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-muted dark:text-meta hover:text-accent hover:bg-surface-warm transition-all flex items-center gap-2"
            title="Projects & Versions"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden md:inline">Projects</span>
          </button>
          <div className="w-px h-6 bg-border mx-1 self-center"></div>
          <button
            onClick={() => setActiveTab('design')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'design' ? 'bg-surface-100 text-fg shadow-sm ring-1 ring-border' : 'text-muted hover:text-fg'}`}
          >
            Floor Plan
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'image' ? 'bg-surface-100 text-fg shadow-sm ring-1 ring-border' : 'text-muted hover:text-fg'}`}
          >
            AI Image Editor
          </button>
        </div>

        {isEnabled && (
          <div className="relative" ref={userMenuRef}>
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border bg-surface border-border text-fg-2 dark:text-fg hover:bg-surface-warm transition-colors"
                  aria-label="User menu"
                  aria-haspopup="true"
                  aria-expanded={showUserMenu}
                >
                  <div className="w-6 h-6 rounded-full bg-surface-warm flex items-center justify-center text-xs font-bold text-accent">
                    {(user?.email?.[0] ?? 'U').toUpperCase()}
                  </div>
                  <span className="hidden md:inline text-sm font-medium max-w-[8rem] truncate">
                    {user?.email}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-lg shadow-elev-raised border border-border py-1 z-50">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-fg-2 dark:text-fg hover:bg-surface-warm transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-surface border-border text-fg-2 dark:text-fg hover:bg-surface-warm transition-colors"
                aria-label="Sign in"
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline text-sm font-medium">Sign in</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
