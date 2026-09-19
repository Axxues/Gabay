import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLMS } from '@/contexts/LMSContext';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  Menu,
  Search,
  Command,
  Sun,
  Moon,
  History,
  HelpCircle,
  ChevronDown,
  User,
  LogOut,
   Users,
} from 'lucide-react';

interface TopbarProps {
  currentTab: string;
  onNavigateTab?: (tab: string) => void;
  onNavigateCourse?: (courseId: string, subTab?: string) => void;
  onOpenSearch: () => void;
  onOpenSidebar?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onNavigateTab,
  onNavigateCourse,
  onOpenSearch,
  onOpenSidebar
}) => {
  const navigate = useNavigate();
  const {

    activeUser,
    activeRole,
    theme,
    toggleTheme,
    logout,
    showConfirm
  } = useLMS();

  const displayName = activeUser?.name || 'User';
  const displayAvatar = activeUser?.avatar;
  const displayEmail = activeUser?.email || '';
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="fixed w-full z-30 top-0 transition-all glass border-b border-border/70 dark:bg-background/80">
      <div className="px-4 sm:px-6 h-16 flex justify-between items-center max-w-[100vw]">
        {/* Left Section: Mobile Menu + Brand Logo & Badge + Theme Toggle */}
        <div className="flex items-center min-w-0 shrink-0 gap-3">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2 text-muted-foreground hover:bg-accent rounded-xl transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div
            onClick={() => onNavigateTab && onNavigateTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img
              src="/gabay-logo.png"
              alt="GABAY logo"
              className="w-11 h-11 rounded-xl object-contain bg-transparent group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-foreground font-sans">
                GABAY
              </span>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer ml-1"
            aria-label="Toggle theme mode"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-amber-500" />
            )}
          </button>
        </div>

        {/* Center Section: Cellwego Universal Search Trigger */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full h-10 flex items-center justify-between px-4 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-all text-left cursor-pointer"
          >
            <div className="flex items-center min-w-0">
              <Search className="h-4 w-4 text-muted-foreground mr-3 flex-shrink-0" />
              <span className="text-[13px] font-normal text-muted-foreground truncate font-sans">
                Search courses, modules, activities, calendar...
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-1 text-[11px] font-sans font-medium text-muted-foreground bg-background border border-border rounded-full px-2 py-0.5">
              <Command className="h-3 w-3" /> K
            </div>
          </button>
        </div>

        {/* Right Section: Mobile Search, Course Shell Switcher, History, Help, User Profile, Notification Bell */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onOpenSearch}
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* History Page Trigger */}
          <button
            onClick={() => onNavigateTab && onNavigateTab('history')}
            title="Session Trail History"
            className={`hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${currentTab === 'history'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent border-border bg-background'
              }`}
          >
            <History className="h-4 w-4" />
          </button>

          {/* Help Page Trigger */}
          <button
            onClick={() => onNavigateTab && onNavigateTab('help')}
            title="User Manual & Help"
            className={`hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${currentTab === 'help'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent border-border bg-background'
              }`}
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Notification Bell with Unread Count */}
          <NotificationBell onNavigateTab={onNavigateTab} onNavigateCourse={onNavigateCourse} />

          {/* User Profile Pill & Dropdown (Cellwego Layout) */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`flex items-center px-2.5 py-1.5 rounded-2xl border transition-all cursor-pointer group ${profileOpen
                  ? 'bg-accent/80 border-border ring-1 ring-primary/15'
                  : 'hover:bg-accent/60 border-border/80'
                }`}
            >
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-card overflow-hidden ring-2 ring-primary/25 ring-offset-1 ring-offset-background group-hover:scale-105 transition-transform">
                <UserAvatar name={displayName} src={displayAvatar} className="h-full w-full" />
              </div>

              <span className="text-sm font-bold text-foreground ml-2.5 hidden sm:block truncate max-w-[120px]">
                {displayName.split(' ')[0]}
              </span>

              <ChevronDown className={`h-3.5 w-3.5 ml-2 text-muted-foreground transition-transform duration-200 ease-out ${profileOpen ? 'rotate-180 text-primary' : 'group-hover:text-foreground'}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-72 dropdown-panel p-2.5 z-50 animate-dropdown">
                <div className="px-3.5 py-3 bg-muted/40 border border-border/60 rounded-xl mb-2">
                  <p className="text-[12px] font-sans font-semibold text-muted-foreground">
                    Signed in as
                  </p>
                  <p className="text-[14px] font-bold text-foreground truncate mt-0.5">{displayName}</p>
                  <div className="flex items-center space-x-1.5 mt-1.5">
                    <span className="px-2 py-0.5 text-[11px] font-sans font-medium rounded-full bg-muted text-muted-foreground border border-border">
                      {activeRole}
                    </span>
                    <span className="text-[12px] font-sans text-muted-foreground truncate font-normal">
                      {displayEmail}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      if (onNavigateTab) onNavigateTab('profile');
                    }}
                    className="flex items-center w-full px-3 py-2 text-xs font-bold text-foreground hover:bg-accent/80 hover:translate-x-0.5 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground mr-2.5 transition-colors">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    Account Profile
                  </button>

                  {activeRole === 'admin' && (
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        if (onNavigateTab) onNavigateTab('accounts');
                      }}
                      className="flex items-center w-full px-3 py-2 text-xs font-bold text-foreground hover:bg-accent/80 hover:translate-x-0.5 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground mr-2.5 transition-colors">
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      Manage College Accounts
                    </button>
                  )}

                  {/* Dark Mode toggle for mobile */}
                  <div className="md:hidden flex items-center justify-between w-full px-3 py-2 rounded-xl bg-muted/30">
                    <span className="text-xs font-bold text-foreground">Theme Mode</span>
                    <button
                      onClick={toggleTheme}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent cursor-pointer"
                    >
                      {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-amber-500" />}
                    </button>
                  </div>

                  <div className="border-t border-border/60 my-1" />

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      showConfirm("Are you sure you want to sign out of GABAY LMS?", () => { logout(); navigate("/login", { replace: true }); }, "Sign Out");
                    }}
                    className="flex items-center w-full px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 hover:translate-x-0.5 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive mr-2.5 transition-colors">
                      <LogOut className="h-3.5 w-3.5" />
                    </div>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
