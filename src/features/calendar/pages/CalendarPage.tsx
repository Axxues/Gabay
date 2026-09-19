import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Clock,
  Plus,
  Filter,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Video
} from 'lucide-react';
import type { CalendarEvent } from '@/services/lms/types/lms.types';
import { CreateEventPage } from '@/features/assessments/pages/CreateEventPage';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const PLATFORM_LABELS: Record<string, string> = {
  zoom: 'Zoom',
  google_meet: 'Google Meet',
  teams: 'Microsoft Teams',
  other: 'Video Call'
};

function platformLabel(platform?: string): string {
  return platform ? PLATFORM_LABELS[platform] || 'Video Call' : 'Video Call';
}

export const CalendarPage: React.FC = () => {
  const {
    db,
    activeRole,
    activeCourseId,
    isLoading,
    isSyncing,
    markTabVisited
  } = useLMS();

  React.useEffect(() => {
    markTabVisited('calendar', activeCourseId ?? undefined);
  }, [activeCourseId]);

  const isReadOnlyCalendar = activeRole === 'staff' || activeRole === 'student';
  const isAdminCalendar = activeRole === 'admin';

  // Cell We Go Month Cursor
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  // Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Full-page event scheduler states
  const [isEventPageOpen, setIsEventPageOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [anchorDate, setAnchorDate] = useState<Date | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  // Compute month layout grid
  const { label, weeks } = useMemo(() => {
    const first = startOfMonth(cursor);
    const year = first.getFullYear();
    const month = first.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const startPad = first.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    while (days.length % 7 !== 0) days.push(null);

    const weekRows: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weekRows.push(days.slice(i, i + 7));
    }

    const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    return {
      label: monthLabel,
      weeks: weekRows
    };
  }, [cursor]);

  // Filter events by course
  const filteredEvents = useMemo(() => {
    return db.calendarEvents.filter(evt => {
      if (selectedCourseFilter === 'all') return true;
      return evt.courseId === selectedCourseFilter;
    });
  }, [db.calendarEvents, selectedCourseFilter]);

  // Map events to date keys (supporting both date strings and startAt/endAt)
  const dayEventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const ev of filteredEvents) {
      if (ev.startAt && ev.endAt) {
        const es = new Date(ev.startAt);
        const ee = new Date(ev.endAt);
        const s = new Date(es.getFullYear(), es.getMonth(), es.getDate());
        const e = new Date(ee.getFullYear(), ee.getMonth(), ee.getDate());
        const cur = new Date(s);
        while (cur <= e) {
          const k = dayKey(cur);
          const list = map.get(k) || [];
          list.push(ev);
          map.set(k, list);
          cur.setDate(cur.getDate() + 1);
        }
      } else if (ev.date) {
        const k = ev.date;
        const list = map.get(k) || [];
        list.push(ev);
        map.set(k, list);
      }
    }

    return map;
  }, [filteredEvents]);

  // Selected day events & advising slots
  const selectedDayKey = dayKey(selectedDay);
  const selectedDayEvents = dayEventsMap.get(selectedDayKey) || [];

  // Event actions
  const openAddEvent = (d: Date) => {
    if (isReadOnlyCalendar) return;
    setEditingEvent(null);
    setAnchorDate(d);
    setIsEventPageOpen(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    if (isReadOnlyCalendar) return;
    setEditingEvent(ev);
    setAnchorDate(new Date(ev.startAt || ev.date));
    setIsEventPageOpen(true);
  };

  if (isEventPageOpen) {
    return (
      <CreateEventPage
        onBack={() => {
          setIsEventPageOpen(false);
          setEditingEvent(null);
        }}
        onEventSaved={() => {
          setIsEventPageOpen(false);
          setEditingEvent(null);
        }}
        onEventDeleted={() => {
          setIsEventPageOpen(false);
          setEditingEvent(null);
        }}
        anchorDate={anchorDate}
        initialEvent={editingEvent}
        courses={db.courses}
        adminOnlyMilestones={isAdminCalendar}
      />
    );
  }

  return (
    <div className="flex min-h-full w-full flex-1 flex-col space-y-6 p-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Cell We Go Style Header & Toolbar Controls */}
      <div className="pb-3 border-b border-border/70 space-y-4">
        <PageHeader
          title="Academic calendar & scheduler"
          description="Course milestones, activity deadlines, lectures, and faculty advising office hours."
          actions={
            !isReadOnlyCalendar && (
              <button
                type="button"
                onClick={() => openAddEvent(selectedDay)}
                className="px-3.5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule event</span>
              </button>
            )
          }
        />

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Course Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3.5 py-2 bg-card/90 hover:bg-card border rounded-xl text-xs font-sans font-semibold text-foreground flex items-center space-x-2 transition-all cursor-pointer group ${
                isFilterOpen
                  ? 'border-primary ring-2 ring-primary/20 shadow-primary-sm text-primary'
                  : 'border-border/80 hover:border-primary/40'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[180px]">
                {selectedCourseFilter === 'all'
                  ? 'All Courses & Milestones'
                  : db.courses.find(c => c.id === selectedCourseFilter)?.code || selectedCourseFilter}
              </span>
              <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0 ml-0.5 ${
                isFilterOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground group-hover:text-foreground'
              }`}>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${
                    isFilterOpen ? 'rotate-180 text-primary' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            {isFilterOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-64 dropdown-panel p-2 z-50 animate-dropdown">
                <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-border/60 mb-1.5">
                  <span className="text-[12px] font-sans font-semibold text-muted-foreground">
                    Filter events
                  </span>
                  <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold tabular-nums">
                    {db.courses.length + 1} options
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourseFilter('all');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans transition-all text-left cursor-pointer group ${
                      selectedCourseFilter === 'all'
                        ? 'bg-primary/15 text-primary font-bold border border-primary/30 shadow-xs'
                        : 'text-foreground hover:bg-muted/80 hover:translate-x-0.5 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 ring-2 ring-background shadow-xs" />
                      <span className="font-sans font-semibold">All Courses & Milestones</span>
                    </div>
                    {selectedCourseFilter === 'all' && (
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 ml-1.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>

                  {db.courses.map(c => {
                    const isSelected = selectedCourseFilter === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCourseFilter(c.id);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans transition-all text-left cursor-pointer group ${
                          isSelected
                            ? 'bg-primary/15 text-primary font-bold border border-primary/30 shadow-xs'
                            : 'text-foreground hover:bg-muted/80 hover:translate-x-0.5 font-medium'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform ${isSelected ? 'ring-2 ring-primary/40 scale-110' : 'group-hover:scale-125'}`}
                            style={{ backgroundColor: c.color || '#64748b' }}
                          />
                          <div className="truncate">
                            <span className="font-sans font-bold block truncate">{c.code}</span>
                            <span className="text-[10px] text-muted-foreground block truncate font-normal">{c.section} • {c.title}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 ml-1.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Cell We Go Month Navigator Pill */}
          <div className="flex items-center bg-card rounded-xl border border-border p-1">
            <button
              type="button"
              onClick={() => setCursor(c => addMonths(c, -1))}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-[7rem] sm:min-w-[9rem] text-center text-xs sm:text-sm font-black text-foreground tabular-nums px-2">
              {label}
            </span>
            <button
              type="button"
              onClick={() => setCursor(c => addMonths(c, 1))}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCursor(startOfMonth(now));
                setSelectedDay(now);
              }}
              className="ml-1 px-2.5 py-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/20 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Workspace (Calendar Grid + Cell We Go Side Panel) */}
      <div className="lg:grid lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] lg:gap-6 lg:items-start space-y-6 lg:space-y-0">
        {/* Calendar Monthly Grid */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-border/70 bg-muted/60">
            {WEEKDAYS.map(day => (
              <div
                key={day}
                className="px-2 py-2.5 text-center text-[12px] font-sans font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Weeks Rows */}
          <div className="divide-y divide-border">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 divide-x divide-border">
                {week.map((cell, di) => {
                  if (!cell) {
                    return (
                      <div
                        key={`pad-${wi}-${di}`}
                        className="min-h-[5.5rem] sm:min-h-[7rem] bg-muted/20"
                      />
                    );
                  }

                  const isToday = isSameDay(cell, today);
                  const isWeekend = cell.getDay() === 0 || cell.getDay() === 6;
                  const isSelected = selectedDay && isSameDay(cell, selectedDay);
                  const cellKey = dayKey(cell);
                  const dayEvents = dayEventsMap.get(cellKey) || [];

                  return (
                    <div
                      key={cellKey}
                      onClick={() => setSelectedDay(new Date(cell.getFullYear(), cell.getMonth(), cell.getDate()))}
                      className={`min-h-[5.5rem] sm:min-h-[7rem] p-1.5 sm:p-2 flex flex-col text-left cursor-pointer transition-all duration-150 relative group ${
                        isWeekend ? 'bg-muted/30' : 'bg-card'
                      } ${isToday ? 'ring-inset ring-2 ring-primary/40 bg-primary/5' : ''} ${
                        isSelected ? 'bg-primary/10 ring-inset ring-1 ring-primary/50' : 'hover:bg-muted/50'
                      }`}
                    >
                      {/* Day Header with Inline Quick + Button */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            isToday
                              ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground'
                              : isWeekend
                              ? 'text-muted-foreground/80'
                              : 'text-foreground'
                          }`}
                        >
                          {cell.getDate()}
                        </span>

                        {!isReadOnlyCalendar && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              openAddEvent(cell);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-primary/15 text-primary transition-opacity cursor-pointer"
                            title="Schedule event on this date"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Event Chips (Cell We Go Styling) */}
                      <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden">
                        {dayEvents.slice(0, 3).map(ev => {
                          const eventColor = ev.colorHex || '#be185d';
                          return (
                            <div
                              key={ev.id}
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedDay(cell);
                                openEditEvent(ev);
                              }}
                              className="w-full text-left rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity truncate flex items-center space-x-1"
                              style={{ backgroundColor: eventColor }}
                              title={`${ev.title} (${ev.time || 'All Day'})${ev.type === 'virtual_meeting' ? ` - ${platformLabel(ev.meetingPlatform)}` : ''}`}
                            >
                              {ev.type === 'virtual_meeting' && (
                                <Video className="w-2.5 h-2.5 shrink-0" />
                              )}
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}

                        {/* +N More Indicator */}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] font-bold text-primary font-sans pl-0.5">
                            +{dayEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Cell We Go Desktop Side Inspector Panel */}
        <aside className="space-y-4 sticky top-4">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            {/* Header with Selected Date */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div>
                <span className="text-[12px] font-sans font-semibold text-muted-foreground block">
                  Inspector
                </span>
                <h2 className="text-[14px] font-bold text-foreground">
                  {selectedDay.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => openAddEvent(selectedDay)}
                className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer"
                title="Schedule event on this day"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Event List for Selected Day */}
            <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
              <span className="text-[12px] font-semibold text-muted-foreground block">
                Scheduled events ({selectedDayEvents.length})
              </span>

              {((isLoading || isSyncing) && (db.calendarEvents || []).length === 0) ? (
                <div data-testid="calendar-loading" className="space-y-2.5" aria-hidden="true">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={`calendar-skeleton-${i}`} className="p-3 bg-card rounded-xl border border-border space-y-1.5 animate-pulse">
                      <div className="h-3.5 w-2/3 rounded bg-muted" />
                      <div className="h-3 w-1/3 rounded bg-muted/70" />
                    </div>
                  ))}
                </div>
              ) : selectedDayEvents.length === 0 ? (
                <EmptyState
                  title="No events scheduled for this day."
                  actionLabel={!isReadOnlyCalendar ? '+ Click here to add an event' : undefined}
                  onAction={!isReadOnlyCalendar ? () => openAddEvent(selectedDay) : undefined}
                />
              ) : (
                selectedDayEvents.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => openEditEvent(ev)}
                    className="p-3 bg-card rounded-xl border border-border hover:ring-1 hover:ring-primary/15 transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-soft"
                          style={{ backgroundColor: ev.colorHex || '#be185d' }}
                        />
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {ev.title}
                        </h4>
                      </div>
                      <span className="text-[11px] font-sans px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                        {ev.type === 'virtual_meeting' ? 'Virtual meeting' : ev.type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-[10px] font-sans text-muted-foreground pl-4.5">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{ev.time || 'All Day'}</span>
                      </div>
                      {ev.location && (
                        <div className="flex items-center space-x-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                      {ev.type === 'virtual_meeting' && (
                        <div className="flex items-center space-x-1 shrink-0">
                          <Video className="w-3 h-3" />
                          <span>{platformLabel(ev.meetingPlatform)}</span>
                        </div>
                      )}
                    </div>

                    {ev.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 pl-4.5 font-sans">
                        {ev.description}
                      </p>
                    )}

                    {ev.type === 'virtual_meeting' && (ev.meetingJoinUrl || ev.meetingId) && (
                      <div className="flex items-center gap-1.5 pl-4.5 pt-1 flex-wrap">
                        {ev.meetingJoinUrl && (
                          <a
                            href={ev.meetingJoinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center space-x-1 px-2 py-1 text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors cursor-pointer"
                          >
                            <Video className="w-3 h-3" />
                            <span>Join Meeting</span>
                          </a>
                        )}
                        {(ev.meetingId || ev.meetingPasscode) && (
                          <span className="text-[9px] font-sans text-muted-foreground">
                            {ev.meetingId && `ID: ${ev.meetingId}`}
                            {ev.meetingId && ev.meetingPasscode && ' • '}
                            {ev.meetingPasscode && `Passcode: ${ev.meetingPasscode}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CalendarPage;
