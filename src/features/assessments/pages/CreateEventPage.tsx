import React, { useState, useEffect, useRef } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  Check,
  ChevronDown,
  Layers,
  Sun,
  FileCheck2,
  Flag,
  UserCheck,
  BookOpen,
  HelpCircle,
  Video,
  Hash,
  KeyRound,
  Sparkles,
  CalendarDays
} from 'lucide-react';
import type { CalendarEvent, Course } from '@/services/lms/types/lms.types';

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateOnlyValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const PRESET_COLORS = [
  { label: 'Cellwego Blue', hex: '#2563eb' },
  { label: 'Emerald Green', hex: '#059669' },
  { label: 'Amber Gold', hex: '#d97706' },
  { label: 'Purple Violet', hex: '#7c3aed' },
  { label: 'Rose Pink', hex: '#be185d' },
  { label: 'Slate Zinc', hex: '#475569' }
];

interface EventTypeOption {
  value: CalendarEvent['type'];
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  defaultColor: string;
}

const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  {
    value: 'event',
    label: 'General event',
    description: 'General activities, campus events, or departmental meetings',
    icon: Calendar,
    iconColor: 'text-muted-foreground',
    defaultColor: '#2563eb'
  },
  {
    value: 'holiday',
    label: 'Holiday / observance',
    description: 'National, local, or institutional non-working holiday',
    icon: Sun,
    iconColor: 'text-muted-foreground',
    defaultColor: '#d97706'
  },
  {
    value: 'activity',
    label: 'Activity deadline',
    description: 'Homework submission cutoff or project due date',
    icon: FileCheck2,
    iconColor: 'text-muted-foreground',
    defaultColor: '#059669'
  },
  {
    value: 'milestone',
    label: 'Curriculum milestone',
    description: 'Semester milestone, grading period, or academic directive',
    icon: Flag,
    iconColor: 'text-muted-foreground',
    defaultColor: '#7c3aed'
  },
  {
    value: 'advising',
    label: 'Academic advising',
    description: 'Office hours, student consultation, or advising session',
    icon: UserCheck,
    iconColor: 'text-muted-foreground',
    defaultColor: '#0d9488'
  },
  {
    value: 'lecture',
    label: 'Lecture / class session',
    description: 'Regular synchronous lecture or scheduled laboratory',
    icon: BookOpen,
    iconColor: 'text-muted-foreground',
    defaultColor: '#4f46e5'
  },
  {
    value: 'virtual_meeting',
    label: 'Virtual meeting',
    description: 'Online video conference via Zoom, Meet, or Teams',
    icon: Video,
    iconColor: 'text-muted-foreground',
    defaultColor: '#0d9488'
  },
  {
    value: 'exam',
    label: 'Quiz / major examination',
    description: 'Scheduled quiz, prelim, midterm, or final exam',
    icon: HelpCircle,
    iconColor: 'text-muted-foreground',
    defaultColor: '#e11d48'
  }
];

interface CreateEventPageProps {
  onBack: () => void;
  onEventSaved?: (event: CalendarEvent) => void;
  onEventDeleted?: (eventId: string) => void;
  anchorDate?: Date | null;
  initialEvent?: CalendarEvent | null;
  courses?: Course[];
  adminOnlyMilestones?: boolean;
}

export const CreateEventPage: React.FC<CreateEventPageProps> = ({
  onBack,
  onEventSaved,
  onEventDeleted,
  anchorDate,
  initialEvent,
  courses = [],
  adminOnlyMilestones = false
}) => {
  const {
    db,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    showAlert,
    showConfirm
  } = useLMS();

  const isEditing = !!initialEvent?.id;
  const availableCourses = courses.length > 0 ? courses : db.courses;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [eventType, setEventType] = useState<CalendarEvent['type']>('event');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [location, setLocation] = useState('');
  const [colorHex, setColorHex] = useState('#2563eb');
  const [meetingPlatform, setMeetingPlatform] = useState<CalendarEvent['meetingPlatform']>('zoom');
  const [meetingId, setMeetingId] = useState('');
  const [meetingPasscode, setMeetingPasscode] = useState('');
  const [meetingJoinUrl, setMeetingJoinUrl] = useState('');

  // Dropdown states
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const courseDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target as Node)) {
        setIsCourseDropdownOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setDescription(initialEvent.description || '');
      setCourseId(initialEvent.courseId || '');
      setEventType(initialEvent.type || 'event');
      setIsAllDay(initialEvent.isAllDay ?? false);
      setLocation(initialEvent.location || '');
      setColorHex(initialEvent.colorHex || '#2563eb');
      setMeetingPlatform(initialEvent.meetingPlatform || 'zoom');
      setMeetingId(initialEvent.meetingId || '');
      setMeetingPasscode(initialEvent.meetingPasscode || '');
      setMeetingJoinUrl(initialEvent.meetingJoinUrl || '');

      const start = initialEvent.startAt
        ? new Date(initialEvent.startAt)
        : new Date(initialEvent.date + 'T09:00:00');
      const end = initialEvent.endAt
        ? new Date(initialEvent.endAt)
        : new Date(initialEvent.date + 'T10:00:00');

      if (initialEvent.isAllDay) {
        setStartDateStr(toDateOnlyValue(start));
        setEndDateStr(toDateOnlyValue(end));
      } else {
        setStartDateStr(toDatetimeLocalValue(start));
        setEndDateStr(toDatetimeLocalValue(end));
      }
    } else {
      const base = anchorDate ? new Date(anchorDate) : new Date();
      base.setHours(9, 0, 0, 0);
      const end = new Date(base);
      end.setHours(10, 0, 0, 0);

      setTitle('');
      setDescription('');
      setCourseId('');
      setEventType('event');
      setIsAllDay(false);
      setLocation('');
      setColorHex('#2563eb');
      setMeetingPlatform('zoom');
      setMeetingId('');
      setMeetingPasscode('');
      setMeetingJoinUrl('');
      setStartDateStr(toDatetimeLocalValue(base));
      setEndDateStr(toDatetimeLocalValue(end));
    }
  }, [initialEvent, anchorDate]);

  const selectedCourse = availableCourses.find(c => c.id === courseId);
  const selectedTypeOption = EVENT_TYPE_OPTIONS.find(opt => opt.value === eventType) || EVENT_TYPE_OPTIONS[0];
  const SelectedTypeIcon = selectedTypeOption.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showAlert({
        title: 'Title Required',
        message: 'Please provide a title for the scheduled event.',
        type: 'warning'
      });
      return;
    }

    let startIso = '';
    let endIso = '';
    let dateOnly = '';
    let timeFormatted = '';

    if (isAllDay) {
      const parts = startDateStr.split('-').map(Number);
      const s = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
      const end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);

      startIso = s.toISOString();
      endIso = end.toISOString();
      dateOnly = startDateStr;
      timeFormatted = 'All Day';
    } else {
      const s = new Date(startDateStr);
      const end = new Date(endDateStr);

      startIso = s.toISOString();
      endIso = end.toISOString();
      dateOnly = toDateOnlyValue(s);
      timeFormatted = `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    const matchedCourse = availableCourses.find(c => c.id === courseId);

    const payload: Omit<CalendarEvent, 'id'> = {
      title: title.trim(),
      description: description.trim(),
      date: dateOnly,
      time: timeFormatted,
      courseId: courseId || undefined,
      courseCode: matchedCourse?.code,
      type: eventType,
      isAllDay,
      startAt: startIso,
      endAt: endIso,
      colorHex: matchedCourse?.color || colorHex,
      location: location.trim() || undefined,
      meetingPlatform: eventType === 'virtual_meeting' ? meetingPlatform : undefined,
      meetingId: eventType === 'virtual_meeting' && meetingId.trim() ? meetingId.trim() : undefined,
      meetingPasscode: eventType === 'virtual_meeting' && meetingPasscode.trim() ? meetingPasscode.trim() : undefined,
      meetingJoinUrl: eventType === 'virtual_meeting' && meetingJoinUrl.trim() ? meetingJoinUrl.trim() : undefined
    };

    if (isEditing && initialEvent?.id) {
      try {
        await updateCalendarEvent(initialEvent.id, payload);
        showAlert({
          title: 'Event Updated',
          message: `"${payload.title}" has been updated on the calendar.`,
          type: 'success'
        });
        if (onEventSaved) {
          onEventSaved({ ...payload, id: initialEvent.id });
        }
      } catch {
        // Context already surfaced the alert; stay on the form.
        return;
      }
    } else {
      try {
        const created = await addCalendarEvent(payload);
        showAlert({
          title: 'Event Scheduled',
          message: `"${payload.title}" scheduled for ${payload.date} (${payload.time}).`,
          type: 'success'
        });
        if (onEventSaved) {
          onEventSaved(created);
        }
      } catch {
        // Context already surfaced the alert; stay on the form.
        return;
      }
    }

    onBack();
  };

  const handleDelete = () => {
    if (!initialEvent?.id) return;
    showConfirm(
      `Are you sure you want to remove "${initialEvent.title}" from the calendar?`,
      () => {
        void (async () => {
          try {
            await deleteCalendarEvent(initialEvent.id);
            showAlert({
              title: 'Event Removed',
              message: `"${initialEvent.title}" was deleted.`,
              type: 'info'
            });
            if (onEventDeleted) {
              onEventDeleted(initialEvent.id);
            }
            onBack();
          } catch {
            // Context already surfaced the alert.
          }
        })();
      },
      'Delete Event'
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pt-2 pb-24 px-2 sm:px-4 font-sans select-none">
      {/* Top Header & Breadcrumb */}
      <div className="pb-4 border-b border-border/70">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground font-sans">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-primary transition-colors cursor-pointer flex items-center space-x-1.5 font-medium group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Calendar</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-semibold truncate">
              {isEditing ? 'Edit Event' : 'Schedule Event'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div className="space-y-1">
              <h1 className="text-[22px] font-extrabold tracking-tight text-foreground flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <span>{isEditing ? 'Edit scheduled event' : 'Schedule new event'}</span>
              </h1>
              <p className="text-[13px] text-muted-foreground pl-0.5">
                {isEditing
                  ? 'Update timing, virtual links, course attachments, and calendar badge options.'
                  : 'Add academic milestones, activity deadlines, virtual meetings, or course lectures to the institutional schedule.'}
              </p>
            </div>

            {/* Quick Action Top Bar */}
            <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-auto">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer active:scale-98 flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer active:scale-98"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.98] rounded-xl transition-all shadow-primary-sm cursor-pointer flex items-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Save changes' : 'Schedule event'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Column + Live Preview Column */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Form Fields */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card 1: Event Details & Prompt */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-border/70 pb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">
                1. General information
              </span>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                Event title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. CMSC 131 Lab Submission, Midterm Review, Consultation Hours"
                className="w-full px-4 py-3 bg-background border border-border hover:border-primary/40 focus:border-primary/40 rounded-xl text-foreground text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                Description & agenda (optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Provide instructions, meeting topics, agenda, or syllabus references..."
                className="w-full p-3.5 bg-background border border-border hover:border-primary/40 focus:border-primary/40 rounded-xl text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* Card 2: Scope & Categorization */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-border/70 pb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">
                2. Scope & event classification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Course Attachment Dropdown */}
              <div className="relative" ref={courseDropdownRef}>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Course shell attachment
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCourseDropdownOpen(prev => !prev);
                    setIsTypeDropdownOpen(false);
                  }}
                  className={`w-full p-3 bg-background border rounded-xl text-foreground text-xs font-sans font-medium flex items-center justify-between  cursor-pointer transition-all ${
                    isCourseDropdownOpen
                      ? 'border-primary ring-2 ring-primary/20 text-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate min-w-0 pr-1">
                    {selectedCourse ? (
                      <>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: selectedCourse.color || '#64748b' }}
                        />
                        <span className="truncate font-semibold text-foreground">
                          {selectedCourse.code} • {selectedCourse.title}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="p-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate text-foreground font-semibold">
                          General / Institutional
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                      isCourseDropdownOpen ? 'rotate-180 text-primary' : 'rotate-0'
                    }`}
                  />
                </button>

                {isCourseDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 dropdown-panel p-1.5 z-50 animate-dropdown max-h-60 overflow-y-auto custom-scrollbar shadow-elevated bg-card border border-border rounded-xl">
                    <div className="px-2.5 py-1 text-[12px] font-semibold text-muted-foreground border-b border-border/70 mb-1 flex items-center justify-between">
                      <span>Select Course Scope</span>
                      {adminOnlyMilestones && (
                        <span className="text-primary text-[9px]">Admin Scope</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCourseId('');
                        setIsCourseDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-sans transition-all text-left cursor-pointer ${
                        courseId === ''
                          ? 'bg-primary/15 text-primary font-bold border border-primary/30 shadow-xs'
                          : 'text-foreground hover:bg-muted font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">General / Institutional Event</span>
                      </div>
                      {courseId === '' && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                    </button>

                    {availableCourses.map(c => {
                      const isSelected = courseId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCourseId(c.id);
                            if (c.color) setColorHex(c.color);
                            setIsCourseDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-sans transition-all text-left cursor-pointer ${
                            isSelected
                              ? 'bg-primary/15 text-primary font-bold border border-primary/30 shadow-xs'
                              : 'text-foreground hover:bg-muted font-medium'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: c.color || '#64748b' }}
                            />
                            <div className="truncate">
                              <span className="font-bold block truncate">{c.code}</span>
                              <span className="text-[10px] text-muted-foreground block truncate font-normal">
                                {c.title}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Event Type Dropdown */}
              <div className="relative" ref={typeDropdownRef}>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Event classification
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsTypeDropdownOpen(prev => !prev);
                    setIsCourseDropdownOpen(false);
                  }}
                  className={`w-full p-3 bg-background border rounded-xl text-foreground text-xs font-sans font-medium flex items-center justify-between  cursor-pointer transition-all ${
                    isTypeDropdownOpen
                      ? 'border-primary ring-2 ring-primary/20 text-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate min-w-0 pr-1">
                    <SelectedTypeIcon className={`w-4 h-4 shrink-0 ${selectedTypeOption.iconColor}`} />
                    <span className="truncate font-semibold text-foreground">
                      {selectedTypeOption.label}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                      isTypeDropdownOpen ? 'rotate-180 text-primary' : 'rotate-0'
                    }`}
                  />
                </button>

                {isTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 dropdown-panel p-1.5 z-50 animate-dropdown max-h-64 overflow-y-auto custom-scrollbar shadow-elevated bg-card border border-border rounded-xl">
                    <div className="px-2.5 py-1 text-[12px] font-semibold text-muted-foreground border-b border-border/70 mb-1">
                      Select Event Type
                    </div>
                    {EVENT_TYPE_OPTIONS.map(opt => {
                      const isSelected = eventType === opt.value;
                      const IconComp = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setEventType(opt.value);
                            if (opt.value === 'holiday') {
                              setIsAllDay(true);
                              setColorHex(opt.defaultColor);
                              setStartDateStr(prev => prev.split('T')[0] || toDateOnlyValue(new Date()));
                            }
                            setIsTypeDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-sans transition-all text-left cursor-pointer ${
                            isSelected
                              ? 'bg-primary/15 text-primary font-bold border border-primary/30 shadow-xs'
                              : 'text-foreground hover:bg-muted font-medium'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5 truncate min-w-0">
                            <div className="p-1 rounded-md bg-muted shrink-0 mt-0.5">
                              <IconComp className={`w-3.5 h-3.5 ${opt.iconColor}`} />
                            </div>
                            <div className="truncate">
                              <span className="font-bold block truncate text-foreground">
                                {opt.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground block truncate font-normal">
                                {opt.description}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Date & Timing Schedule */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">
                3. Date & schedule duration
              </span>

              {/* All Day Toggle Switch */}
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={e => {
                    const checked = e.target.checked;
                    setIsAllDay(checked);
                    if (checked) {
                      setStartDateStr(startDateStr.split('T')[0] || toDateOnlyValue(new Date()));
                    } else {
                      const base = anchorDate ? new Date(anchorDate) : new Date();
                      base.setHours(9, 0, 0, 0);
                      const end = new Date(base);
                      end.setHours(10, 0, 0, 0);
                      setStartDateStr(toDatetimeLocalValue(base));
                      setEndDateStr(toDatetimeLocalValue(end));
                    }
                  }}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-foreground">All Day Event</span>
              </label>
            </div>

            {isAllDay ? (
              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Event date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                  <input
                    type="date"
                    required
                    value={startDateStr}
                    onChange={e => setStartDateStr(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border hover:border-primary/40 focus:border-primary rounded-xl text-foreground text-xs font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all "
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                    Start date & time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                    <input
                      type="datetime-local"
                      required
                      value={startDateStr}
                      onChange={e => setStartDateStr(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-border hover:border-primary/40 focus:border-primary rounded-xl text-foreground text-xs font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all "
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                    End date & time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                    <input
                      type="datetime-local"
                      required
                      value={endDateStr}
                      onChange={e => setEndDateStr(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-border hover:border-primary/40 focus:border-primary rounded-xl text-foreground text-xs font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all "
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Location & Virtual Conference */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-border/70 pb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">
                4. Location & online meeting settings
              </span>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                {eventType === 'virtual_meeting' ? 'Physical room (optional)' : 'Location / meeting link (optional)'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder={eventType === 'virtual_meeting'
                    ? 'e.g. SLUC Computer Lab 304 (optional physical backup room)'
                    : 'e.g. SLUC CS Department Room 102, Building A'}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border hover:border-primary/40 focus:border-primary rounded-xl text-foreground text-xs font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all "
                />
              </div>
            </div>

            {/* Virtual Meeting Details Block */}
            {eventType === 'virtual_meeting' && (
              <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3.5 animate-fade-in">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                    <Video className="w-4 h-4" />
                  </div>
                  <span className="text-[12px] font-semibold text-muted-foreground">Virtual conference platform</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Conference Platform
                    </label>
                    <select
                      value={meetingPlatform}
                      onChange={e => setMeetingPlatform(e.target.value as CalendarEvent['meetingPlatform'])}
                      className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 rounded-xl text-foreground text-xs font-sans"
                    >
                      <option value="zoom">Zoom Video</option>
                      <option value="google_meet">Google Meet</option>
                      <option value="teams">Microsoft Teams</option>
                      <option value="other">Other Link</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Join URL / Link
                    </label>
                    <input
                      type="text"
                      value={meetingJoinUrl}
                      onChange={e => setMeetingJoinUrl(e.target.value)}
                      placeholder="https://zoom.us/j/123456789"
                      className="w-full px-3 py-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 rounded-xl text-foreground text-xs font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Meeting ID (Optional)
                    </label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
                      <input
                        type="text"
                        value={meetingId}
                        onChange={e => setMeetingId(e.target.value)}
                        placeholder="845 2217 9034"
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 rounded-xl text-foreground text-xs font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Passcode (Optional)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
                      <input
                        type="text"
                        value={meetingPasscode}
                        onChange={e => setMeetingPasscode(e.target.value)}
                        placeholder="Passcode123"
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 rounded-xl text-foreground text-xs font-sans"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Appearance, Color Swatches & Live Calendar Preview */}
        <div className="space-y-5">
          {/* Card 5: Color Swatches */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3.5">
            <span className="text-[12px] font-semibold text-muted-foreground block">
              Event badge color
            </span>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColorHex(c.hex)}
                  title={c.label}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-soft cursor-pointer relative"
                  style={{ backgroundColor: c.hex }}
                >
                  {colorHex.toLowerCase() === c.hex.toLowerCase() && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </button>
              ))}
              <div className="flex items-center space-x-1 pl-1">
                <input
                  type="color"
                  value={colorHex}
                  onChange={e => setColorHex(e.target.value)}
                  className="w-7 h-7 p-0 border-0 rounded cursor-pointer"
                  title="Custom Color"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
              <span className="text-[12px] font-semibold text-muted-foreground flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Calendar card preview</span>
              </span>
              <span className="text-[10px] font-sans font-medium text-muted-foreground">
                Agenda View
              </span>
            </div>

            <div
              className="p-4 rounded-xl border transition-all space-y-2.5 "
              style={{
                borderColor: `${colorHex}40`,
                backgroundColor: `${colorHex}08`
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: colorHex }}
                  />
                  <h4 className="font-bold text-xs text-foreground truncate">
                    {title.trim() || 'Untitled Event'}
                  </h4>
                </div>
                <span
                  className="px-2 py-0.5 text-[9px] font-sans font-bold rounded-md shrink-0 border"
                  style={{
                    backgroundColor: `${colorHex}15`,
                    color: colorHex,
                    borderColor: `${colorHex}30`
                  }}
                >
                  {selectedTypeOption.label}
                </span>
              </div>

              {selectedCourse && (
                <div className="text-[11px] font-bold text-primary font-sans truncate">
                  {selectedCourse.code} • {selectedCourse.title}
                </div>
              )}

              <div className="flex items-center space-x-3 text-[11px] text-muted-foreground font-sans">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span>
                    {isAllDay
                      ? 'All Day'
                      : startDateStr
                      ? new Date(startDateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '09:00 AM'}
                  </span>
                </div>
                {location && (
                  <div className="flex items-center space-x-1 truncate">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}
              </div>

              {description && (
                <p className="text-[11px] text-muted-foreground font-sans line-clamp-2 pt-1 border-t border-border/40">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage;
