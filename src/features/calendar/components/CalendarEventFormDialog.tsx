import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
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
  KeyRound
} from 'lucide-react';
import type { CalendarEvent, Course } from '@/services/lms/types/lms.types';
import { ModalPortal, useModalAnimate } from '@/components/shared/ModalPortal';

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
  icon: React.ElementType;
  iconColor: string;
  defaultColor: string;
}

const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  {
    value: 'event',
    label: 'General Event',
    icon: Calendar,
    iconColor: 'text-blue-500',
    defaultColor: '#2563eb'
  },
  {
    value: 'holiday',
    label: 'Holiday',
    icon: Sun,
    iconColor: 'text-amber-500',
    defaultColor: '#d97706'
  },
  {
    value: 'activity',
    label: 'Activity Deadline',
    icon: FileCheck2,
    iconColor: 'text-emerald-500',
    defaultColor: '#059669'
  },
  {
    value: 'milestone',
    label: 'Curriculum Milestone',
    icon: Flag,
    iconColor: 'text-purple-500',
    defaultColor: '#7c3aed'
  },
  {
    value: 'advising',
    label: 'Academic Advising',
    icon: UserCheck,
    iconColor: 'text-teal-500',
    defaultColor: '#0d9488'
  },
  {
    value: 'lecture',
    label: 'Lecture / Class Session',
    icon: BookOpen,
    iconColor: 'text-indigo-500',
    defaultColor: '#4f46e5'
  },
  {
    value: 'virtual_meeting',
    label: 'Virtual Meeting',
    icon: Video,
    iconColor: 'text-teal-500',
    defaultColor: '#0d9488'
  },
  {
    value: 'exam',
    label: 'Quiz / Major Examination',
    icon: HelpCircle,
    iconColor: 'text-rose-500',
    defaultColor: '#e11d48'
  }
];

interface CalendarEventFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<CalendarEvent, 'id'>, id?: string) => void;
  onDelete?: (id: string) => void;
  courses: Course[];
  anchorDate: Date | null;
  initialEvent?: CalendarEvent | null;
  readOnly?: boolean;
  adminOnlyMilestones?: boolean;
}

export const CalendarEventFormDialog: React.FC<CalendarEventFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  courses,
  anchorDate,
  initialEvent,
  readOnly = false,
  adminOnlyMilestones = false
}) => {
  const isEditing = !!initialEvent?.id;
  const { isClosing, startClose } = useModalAnimate(onClose, 200);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [eventType, setEventType] = useState<CalendarEvent['type']>('event');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [location, setLocation] = useState('');
  const [colorHex, setColorHex] = useState('#be185d');
  const [meetingPlatform, setMeetingPlatform] = useState<CalendarEvent['meetingPlatform']>('zoom');
  const [meetingId, setMeetingId] = useState('');
  const [meetingPasscode, setMeetingPasscode] = useState('');
  const [meetingJoinUrl, setMeetingJoinUrl] = useState('');

  // Custom dropdown open states
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const courseDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
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
    if (!isOpen) return;

    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setDescription(initialEvent.description || '');
      setCourseId(initialEvent.courseId || '');
      setEventType(initialEvent.type || 'event');
      setIsAllDay(initialEvent.isAllDay ?? false);
      setLocation(initialEvent.location || '');
      setColorHex(initialEvent.colorHex || '#be185d');
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
      setColorHex('#be185d');
      setMeetingPlatform('zoom');
      setMeetingId('');
      setMeetingPasscode('');
      setMeetingJoinUrl('');
      setStartDateStr(toDatetimeLocalValue(base));
      setEndDateStr(toDatetimeLocalValue(end));
    }

    setIsCourseDropdownOpen(false);
    setIsTypeDropdownOpen(false);
  }, [isOpen, initialEvent, anchorDate]);

  if (!isOpen) return null;

  const selectedCourse = courses.find(c => c.id === courseId);
  const selectedTypeOption = EVENT_TYPE_OPTIONS.find(opt => opt.value === eventType) || EVENT_TYPE_OPTIONS[0];
  const SelectedTypeIcon = selectedTypeOption.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let startIso = '';
    let endIso = '';
    let dateOnly = '';
    let timeFormatted = '';

    if (isAllDay) {
      const parts = startDateStr.split('-').map(Number);
      const s = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
      const e = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);

      startIso = s.toISOString();
      endIso = e.toISOString();
      dateOnly = startDateStr;
      timeFormatted = 'All Day';
    } else {
      const s = new Date(startDateStr);
      const e = new Date(endDateStr);

      startIso = s.toISOString();
      endIso = e.toISOString();
      dateOnly = toDateOnlyValue(s);
      timeFormatted = `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    const matchedCourse = courses.find(c => c.id === courseId);

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

    startClose(() => {
      onSubmit(payload, initialEvent?.id);
    });
  };

  const handleDelete = () => {
    if (initialEvent && onDelete) {
      startClose(() => {
        onDelete(initialEvent.id);
      });
    }
  };

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 overlay-backdrop ${
          isClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}
        onClick={() => startClose()}
      >
        <div
          className={`w-full max-w-lg bg-card border border-border rounded-2xl shadow-elevated overflow-visible ${
            isClosing ? 'animate-scale-out' : 'animate-scale-in'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40 rounded-t-2xl">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {isEditing ? 'Edit Scheduled Event' : 'Schedule New Event'}
                </h2>
                <p className="text-[11px] font-sans text-muted-foreground">
                  Cell We Go Interactive Calendar Engine
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => startClose()}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Title */}
            <div>
              <label className="block font-bold text-foreground mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Lab 3 Submission, Faculty Advising, Midterm Exam, Independence Day"
                className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs shadow-inner font-sans"
              />
            </div>

            {/* Custom Dropdowns for Course Attachment and Event Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Custom Course Attachment Dropdown */}
              <div className="relative" ref={courseDropdownRef}>
                <label className="block font-bold text-foreground mb-1">
                  Course Attachment
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCourseDropdownOpen(prev => !prev);
                    setIsTypeDropdownOpen(false);
                  }}
                  className={`w-full p-2.5 bg-background border rounded-xl text-foreground text-xs font-sans font-medium flex items-center justify-between shadow-subtle cursor-pointer transition-all ${
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
                    className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
                      isCourseDropdownOpen ? 'rotate-180 text-primary' : 'rotate-0'
                    }`}
                  />
                </button>

                {/* Course Dropdown Menu */}
                {isCourseDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 dropdown-panel p-1.5 z-50 animate-dropdown max-h-56 overflow-y-auto custom-scrollbar shadow-elevated">
                    <div className="px-2 py-1 text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1 flex items-center justify-between">
                      <span>Select Course Context</span>
                      {adminOnlyMilestones && (
                        <span className="text-primary text-[9px]">Admin Milestone Scope</span>
                      )}
                    </div>
                    {/* General / Institutional Milestone */}
                    <button
                      type="button"
                      onClick={() => {
                        setCourseId('');
                        setIsCourseDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-sans transition-all text-left cursor-pointer ${
                        courseId === ''
                          ? 'bg-primary/15 text-primary font-bold border border-primary/30 shadow-xs'
                          : 'text-foreground hover:bg-muted font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">General / Institutional Milestone</span>
                      </div>
                      {courseId === '' && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                    </button>

                    {/* Course list */}
                    {courses.map(c => {
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
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-sans transition-all text-left cursor-pointer ${
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

              {/* Custom Event Type Dropdown */}
              <div className="relative" ref={typeDropdownRef}>
                <label className="block font-bold text-foreground mb-1">
                  Event Type
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsTypeDropdownOpen(prev => !prev);
                    setIsCourseDropdownOpen(false);
                  }}
                  className={`w-full p-2.5 bg-background border rounded-xl text-foreground text-xs font-sans font-medium flex items-center justify-between shadow-subtle cursor-pointer transition-all ${
                    isTypeDropdownOpen
                      ? 'border-primary ring-2 ring-primary/20 text-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate min-w-0 pr-1">
                    <SelectedTypeIcon className={`w-3.5 h-3.5 shrink-0 ${selectedTypeOption.iconColor}`} />
                    <span className="truncate font-semibold text-foreground">
                      {selectedTypeOption.label}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
                      isTypeDropdownOpen ? 'rotate-180 text-primary' : 'rotate-0'
                    }`}
                  />
                </button>

                {/* Event Type Dropdown Menu */}
                {isTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 dropdown-panel p-1.5 z-50 animate-dropdown max-h-60 overflow-y-auto custom-scrollbar shadow-elevated">
                    <div className="px-2 py-1 text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
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
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-sans transition-all text-left cursor-pointer ${
                            isSelected
                              ? 'bg-primary/15 text-primary font-bold border border-primary/30 shadow-xs'
                              : 'text-foreground hover:bg-muted font-medium'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate min-w-0">
                            <div className="p-1 rounded-md bg-muted shrink-0">
                              <IconComp className={`w-3.5 h-3.5 ${opt.iconColor}`} />
                            </div>
                            <span className="font-bold block truncate text-foreground">
                              {opt.label}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* All Day Switch */}
            <div className="flex items-center space-x-2 py-1">
              <input
                type="checkbox"
                id="isAllDayCheckbox"
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
              <label htmlFor="isAllDayCheckbox" className="font-semibold text-foreground cursor-pointer select-none">
                All Day Event
              </label>
            </div>

            {/* Date & Time Pickers - When All Day is checked, End Date is hidden */}
            {isAllDay ? (
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Event Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDateStr}
                  onChange={e => setStartDateStr(e.target.value)}
                  className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs font-sans"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startDateStr}
                    onChange={e => setStartDateStr(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs font-sans"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endDateStr}
                    onChange={e => setEndDateStr(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs font-sans"
                  />
                </div>
              </div>
            )}

            {/* Location / Meeting Link */}
            <div>
              <label className="block font-bold text-foreground mb-1">
                {eventType === 'virtual_meeting' ? 'Location / Room (Optional)' : 'Location / Video Link (Optional)'}
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder={eventType === 'virtual_meeting'
                    ? 'e.g. SLUC CS Lab 304 (physical room, optional)'
                    : 'e.g. SLUC CS Lab 304, Zoom Meeting Link'}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs"
                />
              </div>
            </div>

            {/* Virtual Meeting Details */}
            {eventType === 'virtual_meeting' && (
              <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-foreground">Virtual Meeting Details</span>
                </div>

                {/* Platform Dropdown */}
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    Meeting Platform
                  </label>
                  <select
                    value={meetingPlatform}
                    onChange={e => setMeetingPlatform(e.target.value as CalendarEvent['meetingPlatform'])}
                    className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs font-sans"
                  >
                    <option value="zoom">Zoom</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Meeting Join URL */}
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    Meeting Join Link (Optional)
                  </label>
                  <div className="relative">
                    <Video className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      value={meetingJoinUrl}
                      onChange={e => setMeetingJoinUrl(e.target.value)}
                      placeholder="e.g. https://zoom.us/j/1234567890"
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs"
                    />
                  </div>
                </div>

                {/* Meeting ID */}
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    Meeting ID (Optional)
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      value={meetingId}
                      onChange={e => setMeetingId(e.target.value)}
                      placeholder="e.g. 845 2217 9034"
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs"
                    />
                  </div>
                </div>

                {/* Passcode */}
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    Passcode (Optional)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      value={meetingPasscode}
                      onChange={e => setMeetingPasscode(e.target.value)}
                      placeholder="e.g. 882471"
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Color Swatch Picker */}
            <div>
              <label className="block font-bold text-foreground mb-1">
                Event Badge Color
              </label>
              <div className="flex items-center space-x-2.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColorHex(c.hex)}
                    title={c.label}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-soft cursor-pointer"
                    style={{ backgroundColor: c.hex }}
                  >
                    {colorHex.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                  </button>
                ))}
                <input
                  type="color"
                  value={colorHex}
                  onChange={e => setColorHex(e.target.value)}
                  className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                  title="Custom color"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-bold text-foreground mb-1">
                Description / Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add agenda, activity instructions, or advising notes..."
                className="w-full p-2.5 bg-background border border-border focus:ring-2 focus:ring-primary/30 rounded-xl text-foreground text-xs font-sans"
              />
            </div>

            {/* Modal Actions */}
            {readOnly ? (
              <div className="pt-3 border-t border-border flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => startClose()}
                  className="px-5 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl transition-all shadow-primary-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-border flex items-center justify-between">
                {isEditing && onDelete ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Event</span>
                  </button>
                ) : <div />}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => startClose()}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-xl transition-all shadow-primary-sm cursor-pointer"
                  >
                    {isEditing ? 'Save Changes' : 'Schedule Event'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
