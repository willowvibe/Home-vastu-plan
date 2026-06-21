import React from 'react';

export interface MobileTabsProps {
  mobileTab: 'settings' | 'canvas' | 'properties';
  setMobileTab: (tab: 'settings' | 'canvas' | 'properties') => void;
}

export const MobileTabs: React.FC<MobileTabsProps> = ({ mobileTab, setMobileTab }) => {
  const tabs: { key: 'settings' | 'canvas' | 'properties'; label: string }[] = [
    { key: 'settings', label: 'Settings' },
    { key: 'canvas', label: 'Canvas' },
    { key: 'properties', label: 'Properties' },
  ];

  return (
    <div className="md:hidden flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
      {tabs.map((tab) => {
        const active = mobileTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium ${
              active
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
