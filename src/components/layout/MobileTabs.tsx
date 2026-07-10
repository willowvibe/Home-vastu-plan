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
    <div className="md:hidden flex border-b border-border  bg-surface shrink-0">
      {tabs.map((tab) => {
        const active = mobileTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium ${
              active
                ? 'text-accent border-b-2 border-accent'
                : 'text-muted hover:text-fg-2 dark:text-meta '
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
