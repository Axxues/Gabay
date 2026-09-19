import React from 'react';
import type { NavItem } from '@/constants/navigation';

interface CourseTabBarProps {
  tabs: NavItem[];
  subTab: string;
  badgeCounts: Record<string, number>;
  onSelect: (tabId: string) => void;
}

export const CourseTabBar: React.FC<CourseTabBarProps> = ({ tabs, subTab, badgeCounts, onSelect }) => {
  return (
    <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
      {tabs.map(tab => {
        const badgeCount = badgeCounts[tab.id] ?? 0;
        let badge = null;

        if (badgeCount > 0) {
          badge = (
            <span
              key={tab.id + '-badge'}
              className="absolute right-0 top-0 h-4 w-4 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center -translate-half"
            >
              {badgeCount}
            </span>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold cursor-pointer relative ${subTab === tab.id ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border'}`}
          >
            {tab.label}
            {badge}
          </button>
        );
      })}
    </div>
  );
};
