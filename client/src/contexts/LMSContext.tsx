import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type {
  User,
  UserRole,
  TermId,
  Course,
  Module,
  ModuleItem,
  ModuleComment,
  Quiz,
  Exam,
  LMSDatabase,
  CalendarEvent,
  Submission,
  SubmissionComment,
  Message,
  AdvisingSlot,
  HistoryLog,
  Announcement,
  AnnouncementReply,
  Discussion,
  DiscussionReply,
  CourseFile,
  CourseFolder,
  CourseStudentGrade,
  ChatGroup,
  Notification,
  CourseSection,
  EnrollmentRequest,
  SPRConfig,
  SPRColumn
} from '@/services/lms/types/lms.types';
import type { Activity } from '@/services/lms/types/lms.types';
import { activityPointsPossible } from '@/utils/activities';
import {
  autoScoreFraction,
  classStandingPercent,
  resolveSPRWeights,
  round2,
  termGrade,
} from '@/utils/spr';
import { commonsTemplates } from '@/services/courses/types';
import { effectiveTerms, normalizeGradesReleased, normalizeTermId } from '@/utils/gradingTerms';
import { AlertModal, type AlertModalOptions } from '@/components/shared/AlertModal';
import { canPickSection } from '@/utils/sections';
import type { OfficialSyllabusData } from '@/services/courses/types';
import { apiFetch, ApiError, getToken, setToken, clearToken } from '@/services/core/client';
import { settledValue } from '@/utils/promise';

interface LMSContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  accent: AccentId;
  customAccentHex: string;
  setAccent: (id: AccentId) => void;
  setCustomAccentHex: (hex: string) => void;
  resetAccent: () => void;
  
  // Authentication & Session
  isAuthenticated: boolean;
  currentUser: User | null;
  activeUser: User;
  activeRole: UserRole;
  login: (emailOrId: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void; // Keep for testing convenience if needed
  isLoading: boolean;
  isSyncing: boolean;
  lastError: string | null;
  authReady: boolean;
  // Session-restore gate: false until the token -> GET /api/auth/me restore
  // attempt settles (or is skipped when no token exists). Route guards
  // render the loading skeleton while this is false.

  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
  db: LMSDatabase;
  
  // SpeedGrader modal state
  activeSpeedGraderSubmissionId: string | null;
  openSpeedGrader: (submissionId: string) => void;
  closeSpeedGrader: () => void;

  // Drawers & Modals
  isHistoryDrawerOpen: boolean;
  setIsHistoryDrawerOpen: (open: boolean) => void;
  isHelpDrawerOpen: boolean;
  setIsHelpDrawerOpen: (open: boolean) => void;
  isRoleModalOpen: boolean;
  setIsRoleModalOpen: (open: boolean) => void;
  isUserProfileModalOpen: boolean;
  setIsUserProfileModalOpen: (open: boolean) => void;

  // Alert & Confirmation Modal
  showAlert: (options: string | AlertModalOptions, title?: string) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string) => void;
  closeAlert: () => void;

  // Real CRUD & Interactive Actions
  createCourse: (course: Partial<Course>) => Promise<Course>;
  createModule: (courseId: string, title: string) => Promise<Module>;
  updateModule: (moduleId: string, updates: Partial<Module>) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
  addModuleItem: (moduleId: string, item: Partial<ModuleItem>) => Promise<void>;
  updateModuleItem: (currentModuleId: string, itemId: string, updates: Partial<ModuleItem>, targetModuleId?: string) => Promise<void>;
  deleteModuleItem: (moduleId: string, itemId: string) => Promise<void>;
  createQuiz: (quiz: Partial<Quiz>) => Promise<Quiz>;
  recordQuizSubmission: (quizId: string, studentId: string, answers: Record<string, string>) => Promise<Submission>;
  createExam: (exam: Partial<Exam>) => Promise<Exam>;
  recordExamSubmission: (examId: string, studentId: string, answers: Record<string, string>) => Promise<Submission>;
  createActivity: (data: Partial<Activity>) => Promise<Activity>;
  updateActivity: (activityId: string, updates: Partial<Activity>) => Promise<Activity>;
  recordActivitySubmission: (activityId: string, studentId: string, answers: Record<string, string>) => Promise<Submission>;
  deleteActivity: (activityId: string) => Promise<void>;
  enrollPerson: (person: Partial<User>, courseId?: string) => Promise<boolean>;
  enrollStudentsInCourse: (studentIds: string[], courseId: string) => Promise<boolean>;
  createUser: (userData: Partial<User>) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User> & { banner?: string }) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
  joinCourseByCode: (joinCode: string) => Promise<{ success: boolean; message: string; course?: Course }>;
  regenerateCourseJoinCode: (courseId: string) => Promise<string>;
  updateCourseSyllabus: (courseId: string, syllabus: OfficialSyllabusData) => Promise<void>;
  removeCourseSyllabus: (courseId: string) => Promise<void>;
  updateCourseGradingTerms: (courseId: string, gradingTerms: TermId[] | null) => Promise<void>;
  setGradesReleased: (courseId: string, term: TermId, released: boolean) => Promise<void>;
  effectiveTermsForCourse: (courseId: string) => TermId[];
  importCommonsTemplate: (templateId: string, targetCourseId: string) => Promise<{ success: boolean; message: string }>;

  gradeSubmission: (
    submissionId: string,
    grade: number,
    rubricScores: Record<string, number>,
    commentText?: string
  ) => Promise<void>;
  upsertManualExamGrade: (examId: string, studentId: string, grade: number) => Promise<void>;
  submitActivity: (
    activityId: string,
    submissionType: 'file' | 'online_text',
    content?: string,
    fileName?: string,
    answers?: Record<string, string>
  ) => Promise<void>;
  toggleModulePublish: (moduleId: string) => Promise<void>;
  toggleItemCompletion: (moduleId: string, itemId: string) => Promise<void>;
  addModuleComment: (moduleId: string, content: string, parentId?: string) => Promise<void>;
  editModuleComment: (moduleId: string, commentId: string, newContent: string) => Promise<void>;
  deleteModuleComment: (moduleId: string, commentId: string) => Promise<void>;
  toggleLikeModuleComment: (moduleId: string, commentId: string) => Promise<void>;
  sendMessage: (recipientId: string, subject: string, body: string, courseId?: string, attachmentName?: string, attachmentSize?: string, isGroup?: boolean, groupId?: string) => Promise<void>;
  createChatGroup: (name: string, memberIds: string[], courseId?: string) => Promise<ChatGroup>;
  markThreadAsRead: (partnerId: string) => Promise<void>;
  toggleMessageReaction: (messageId: string, reaction: string) => Promise<void>;
  bookAdvisingSlot: (slotId: string) => Promise<void>;
  createAdvisingSlot: (date: string, timeSlot: string, location: string) => Promise<void>;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent>;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;

  // Announcements CRUD
  createAnnouncement: (data: Partial<Announcement>) => Promise<Announcement>;
  deleteAnnouncement: (id: string) => Promise<void>;
  togglePinAnnouncement: (id: string) => Promise<void>;
  toggleLikeAnnouncement: (id: string) => Promise<void>;
  addAnnouncementReply: (announcementId: string, content: string, parentId?: string) => Promise<void>;
  markAnnouncementRead: (id: string) => Promise<void>;

  // Notifications
  notifications: Notification[];
  getUnreadNotificationCount: (userId: string, type?: string) => number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId: string, type?: string) => Promise<void>;
  markTabVisited: (tab: string, courseId?: string) => void;
  markModuleCommentsRead: (moduleId: string) => Promise<void>;
  getNotifications: (userId: string, type?: string, limit?: number) => Notification[];

  // Discussions CRUD
  createDiscussion: (data: Partial<Discussion>) => Promise<Discussion>;
  deleteDiscussion: (id: string) => Promise<void>;
  togglePinDiscussion: (id: string) => Promise<void>;
  toggleLockDiscussion: (id: string) => Promise<void>;
  addDiscussionReply: (discussionId: string, content: string, parentId?: string, attachment?: { name: string; url?: string }) => Promise<void>;
  toggleLikeDiscussionReply: (discussionId: string, replyId: string) => Promise<void>;

  // Course Files & Folders CRUD
  // uploadCourseFile accepts an optional rawFile Blob for the multipart
  // upload endpoint; area/moduleId/moduleTitle trigger server-side filing.
  createCourseFolder: (courseId: string, name: string, parentId?: string | null, autoKey?: string) => Promise<CourseFolder>;
  uploadCourseFile: (fileData: Partial<CourseFile> & { rawFile?: File | Blob; area?: string; moduleId?: string; moduleTitle?: string }) => Promise<CourseFile>;
  deleteCourseFile: (fileId: string) => Promise<void>;
  deleteCourseFolder: (folderId: string) => Promise<void>;
  updateFileVisibility: (fileId: string, visibility: 'published' | 'unpublished' | 'restricted') => Promise<void>;
  renameCourseFile: (fileId: string, newName: string) => Promise<void>;

  // Course Grades CRUD (Midterm 40%, Final 60%)
  setCourseStudentGrade: (
    courseId: string,
    studentId: string,
    type: 'midterm' | 'final',
    score: number | null
  ) => Promise<void>;

  // SPR gradebook store (Tasks 4 and 5 consume these)
  getSPRConfig: (courseId: string) => SPRConfig | null;
  saveSPRConfig: (courseId: string, config: Omit<SPRConfig, 'courseId'>) => Promise<void>;
  setSPRCell: (
    courseId: string,
    studentId: string,
    term: 'midterm' | 'final',
    key: string,
    value: number | null
  ) => Promise<void>;
  resetSPRCell: (
    courseId: string,
    studentId: string,
    term: 'midterm' | 'final',
    key: string
  ) => Promise<void>;
  bulkImportSPRColumns: (courseId: string, term: 'midterm' | 'final') => Promise<void>;

  // Sections CRUD
  createSection: (courseId: string, data: Partial<CourseSection>) => Promise<CourseSection>;
  updateSection: (sectionId: string, updates: Partial<CourseSection>) => Promise<boolean>;
  deleteSection: (sectionId: string) => Promise<boolean>;
  getCourseSections: (courseId: string) => CourseSection[];
  getStudentSection: (courseId: string) => CourseSection | null;

  // Enrollment Requests
  createEnrollmentRequest: (courseId: string, type: 'self_join' | 'faculty_enroll') => Promise<EnrollmentRequest>;
  approveEnrollmentRequests: (requestIds: string[]) => Promise<boolean>;
  rejectEnrollmentRequests: (requestIds: string[]) => Promise<boolean>;
  removeStudentFromCourse: (courseId: string, studentId: string) => Promise<boolean>;
  studentApproveInvitation: (requestId: string) => Promise<boolean>;
  studentDeclineInvitation: (requestId: string) => Promise<boolean>;
  selectSection: (courseId: string, sectionId: string) => Promise<boolean>;
  requestSectionSwitch: (courseId: string, targetSectionId: string) => Promise<boolean>;
  getPendingRequestsForCourse: (courseId: string) => Promise<EnrollmentRequest[]>;
  getPendingRequestsForStudent: () => EnrollmentRequest[];
  requestJoinCourse: (courseId: string) => Promise<boolean>;
  getMyRequest: (courseId: string) => EnrollmentRequest | null;
  getPendingRequests: (courseId: string) => Promise<EnrollmentRequest[]>;

  logHistory: (path: string, title: string) => void;
  clearHistory: () => void;
}

const STORAGE_KEY_THEME = 'gabay_theme_v1';

const safeSetLocalStorage = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`LocalStorage setItem failed for "${key}".`, err);
    return false;
  }
};

export const LMSContext = createContext<LMSContextType | undefined>(undefined);

/** Selectable system accent. Presets ship hand-tuned light/dark HSL triples. */
export type AccentId = 'pink' | 'emerald' | 'navy' | 'gold' | 'custom';

export interface AccentTheme {
  id: Exclude<AccentId, 'custom'>;
  label: string;
  /** Representative dot color for the swatch UI. */
  swatch: string;
  light: { primary: string; ring: string; sidebarActive: string };
  dark: { primary: string; ring: string; sidebarActive: string };
}

export const ACCENT_PRESETS: AccentTheme[] = [
  {
    id: 'pink',
    label: 'College Pink',
    swatch: '#DB2777',
    light: { primary: '335 78% 46%', ring: '335 78% 46%', sidebarActive: '335 78% 46%' },
    dark: { primary: '335 85% 60%', ring: '335 85% 60%', sidebarActive: '335 85% 60%' }
  },
  {
    id: 'emerald',
    label: 'Emerald',
    swatch: '#0E7A5C',
    light: { primary: '162 65% 30%', ring: '162 65% 30%', sidebarActive: '162 65% 30%' },
    dark: { primary: '160 50% 55%', ring: '160 50% 55%', sidebarActive: '160 50% 55%' }
  },
  {
    id: 'navy',
    label: 'Navy',
    swatch: '#2B3F8C',
    light: { primary: '222 60% 34%', ring: '222 60% 34%', sidebarActive: '222 60% 34%' },
    dark: { primary: '220 55% 68%', ring: '220 55% 68%', sidebarActive: '220 55% 68%' }
  },
  {
    id: 'gold',
    label: 'Gold',
    swatch: '#B45309',
    light: { primary: '36 90% 34%', ring: '36 90% 34%', sidebarActive: '36 90% 34%' },
    dark: { primary: '42 95% 58%', ring: '42 95% 58%', sidebarActive: '42 95% 58%' }
  }
];

export const DEFAULT_ACCENT: AccentId = 'pink';
const DEFAULT_CUSTOM_HEX = '#0E7A5C';

const STORAGE_KEY_ACCENT = 'gabay_accent_v1';
const STORAGE_KEY_ACCENT_CUSTOM = 'gabay_accent_custom_v1';

/** '#rrggbb' -> [h, s, l] with h 0-360, s/l 0-100. Returns null for invalid input. */
export function hexToHsl(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Derive theme-ready primary/ring/sidebar triple from a custom hex color. */
export function customAccentVars(hex: string, theme: 'dark' | 'light'): { primary: string; ring: string; sidebarActive: string } {
  const hsl = hexToHsl(hex);
  if (!hsl) {
    const fallback = ACCENT_PRESETS[0][theme];
    return { ...fallback };
  }
  const [h, s] = hsl;
  const sat = Math.max(s, 30);
  const light = theme === 'dark' ? 60 : 35;
  const triple = `${h} ${sat}% ${light}%`;
  return { primary: triple, ring: triple, sidebarActive: triple };
}

export const generateCourseJoinCode = (existingCourses: Course[] = [], prefix?: string): string => {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const cleanPrefix = (prefix || 'GBY')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase() || 'GBY';

  for (let attempt = 0; attempt < 200; attempt++) {
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidate = `${cleanPrefix}-${randomPart}`;
    if (!existingCourses.some(c => c.joinCode?.toUpperCase() === candidate)) {
      return candidate;
    }
  }
  return `${cleanPrefix}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
};

/** Upsert one enrollment request into a database snapshot (Task 2 cache scope). */
export const mergeEnrollmentRequest = (prev: LMSDatabase, request: EnrollmentRequest): LMSDatabase => {
  const existing = prev.enrollmentRequests || [];
  if (existing.some(r => r.id === request.id)) {
    return { ...prev, enrollmentRequests: existing.map(r => (r.id === request.id ? request : r)) };
  }
  return { ...prev, enrollmentRequests: [...existing, request] };
};

/** Task 4: server rows arrive with Dates serialized as ISO strings and
 *  null-able optionals — normalize them to the client shapes. */
const toIsoString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const toOptionalIso = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return toIsoString(value);
};

const normalizeActivity = (raw: any): Activity => ({
  ...raw,
  format: raw.format === 'classic' ? 'classic' : 'questionset',
  term: normalizeTermId(raw.term) ?? 'midterm',
  dueDate: toOptionalIso(raw.dueDate),
  questions: Array.isArray(raw.questions) ? raw.questions : [],
  submissionTypes: Array.isArray(raw.submissionTypes) ? raw.submissionTypes : undefined,
  rubric: Array.isArray(raw.rubric) ? raw.rubric : undefined,
  category: raw.category ?? undefined,
  weight: typeof raw.weight === 'number' ? raw.weight : undefined,
  fileName: raw.fileName ?? undefined,
  fileUrl: raw.fileUrl ?? undefined,
  fileSize: raw.fileSize ?? undefined,
  availableFrom: toOptionalIso(raw.availableFrom),
  availableUntil: toOptionalIso(raw.availableUntil),
  sectionRestriction: raw.sectionRestriction ?? undefined,
});

const normalizeQuiz = (raw: any): Quiz => ({
  ...raw,
  term: normalizeTermId(raw.term) ?? 'midterm',
  delayedUntil: toOptionalIso(raw.delayedUntil),
  dueDate: toOptionalIso(raw.dueDate),
  fileName: raw.fileName ?? undefined,
  fileUrl: raw.fileUrl ?? undefined,
  fileSize: raw.fileSize ?? undefined,
  questions: Array.isArray(raw.questions) ? raw.questions : [],
});

const normalizeExam = (raw: any): Exam => ({
  ...raw,
  timeLimitMinutes: typeof raw.timeLimitMinutes === 'number' ? raw.timeLimitMinutes : 30,
  dueDate: toOptionalIso(raw.dueDate),
  questions: Array.isArray(raw.questions) ? raw.questions : [],
  term: normalizeTermId(raw.term) ?? 'midterm',
});

const normalizeSubmissionComment = (raw: any): SubmissionComment => ({
  ...raw,
  createdAt: raw.createdAt ? toIsoString(raw.createdAt) : new Date().toISOString(),
});

const normalizeSubmission = (raw: any): Submission => ({
  id: raw.id,
  activityKey: raw.activityKey ?? undefined,
  quizId: raw.quizId ?? undefined,
  activityId: raw.activityId ?? undefined,
  examId: raw.examId ?? undefined,
  courseId: raw.courseId,
  studentId: raw.studentId,
  studentName: raw.studentName ?? '',
  studentAvatar: raw.studentAvatar ?? '',
  submittedAt: raw.submittedAt ? toIsoString(raw.submittedAt) : new Date().toISOString(),
  submissionType: raw.submissionType === 'file' ? 'file' : 'online_text',
  content: raw.content ?? undefined,
  fileUrl: raw.fileUrl ?? undefined,
  fileName: raw.fileName ?? undefined,
  grade: raw.grade ?? undefined,
  gradedAt: toOptionalIso(raw.gradedAt),
  gradedBy: raw.gradedBy ?? undefined,
  status: raw.status === 'graded' ? 'graded' : raw.status === 'missing' ? 'missing' : 'submitted',
  rubricScores: (() => {
    const v = raw.rubricScores;
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, number>;
    if (typeof v === 'string') {
      try {
        const parsed: unknown = JSON.parse(v);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, number>;
        }
      } catch {
        // fall through to empty
      }
    }
    return {};
  })(),
  comments: Array.isArray(raw.comments) ? raw.comments.map(normalizeSubmissionComment) : [],
});

const normalizeCourseGrade = (raw: any): CourseStudentGrade => ({
  courseId: raw.courseId,
  studentId: raw.studentId,
  midtermGrade: raw.midtermGrade ?? null,
  finalGrade: raw.finalGrade ?? null,
  updatedAt: raw.updatedAt ? toIsoString(raw.updatedAt) : undefined,
});

type SPRStudentCells = {
  midterm: Record<string, number | null>;
  mtExam: number | null;
  final: Record<string, number | null>;
  ftExam: number | null;
};

const stripNullMap = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'number' && !Number.isNaN(v)) out[k] = v;
  }
  return out;
};

const asExamOrNull = (value: unknown): number | null =>
  typeof value === 'number' && !Number.isNaN(value) ? value : null;

/** Server sprCells shape { midtermScores, mtExam, finalScores, ftExam }
 *  (JSON string or object) -> client manual-cell model. Returns null when
 *  the row carries no manual cells. */
const parseSPRCells = (raw: unknown): SPRStudentCells | null => {
  if (raw === null || raw === undefined) return null;
  let parsed: any = raw;
  if (typeof raw === 'string') {
    if (!raw) return null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const midterm = stripNullMap(parsed.midtermScores);
  const final = stripNullMap(parsed.finalScores);
  const mtExam = asExamOrNull(parsed.mtExam);
  const ftExam = asExamOrNull(parsed.ftExam);
  if (Object.keys(midterm).length === 0 && Object.keys(final).length === 0 && mtExam === null && ftExam === null) {
    return null;
  }
  return { midterm, mtExam, final, ftExam };
};

/** Union-merge per-course manual-cell maps (incoming student rows win). */
const mergeSPRCourseMaps = (
  prev: Record<string, Record<string, SPRStudentCells>> | undefined,
  incoming: Record<string, Record<string, SPRStudentCells>>,
): Record<string, Record<string, SPRStudentCells>> => {
  const out: Record<string, Record<string, SPRStudentCells>> = { ...(prev ?? {}) };
  for (const [courseId, students] of Object.entries(incoming)) {
    out[courseId] = { ...(out[courseId] ?? {}), ...students };
  }
  return out;
};

/** Union-merge grade rows by course+student (incoming rows win). */
const mergeSPRGrades = (
  prev: CourseStudentGrade[] | undefined,
  incoming: CourseStudentGrade[],
): CourseStudentGrade[] => {
  if (incoming.length === 0) return prev ?? [];
  const merged = [...(prev ?? [])];
  const index = new Map(merged.map((g, i) => [`${g.courseId}:${g.studentId}`, i]));
  for (const g of incoming) {
    const key = `${g.courseId}:${g.studentId}`;
    const at = index.get(key);
    if (at === undefined) {
      index.set(key, merged.length);
      merged.push(g);
    } else {
      merged[at] = g;
    }
  }
  return merged;
};

/** Task 5: the server stores Course.gradingTerms as a JSON string (nullable);
 *  the client cache holds the TermId array (null = auto-detect). */
const normalizeCourseGradingTerms = (raw: unknown): TermId[] | null => {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    if (!raw) return null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  return [...new Set((parsed as unknown[]).map(normalizeTermId).filter((t): t is TermId => t !== null))];
};

/** Task 5: the server stores Course.syllabus as a JSON string (nullable);
 *  the client cache holds the parsed OfficialSyllabusData object. */
const normalizeCourseSyllabus = (raw: any): Course => {
  const syllabus = raw?.syllabus;
  let parsedSyllabus: Course['syllabus'];
  if (typeof syllabus !== 'string' || !syllabus) {
    parsedSyllabus = syllabus ? raw.syllabus : null;
  } else {
    try {
      parsedSyllabus = JSON.parse(syllabus);
    } catch {
      parsedSyllabus = null;
    }
  }
  return { ...raw, syllabus: parsedSyllabus, gradingTerms: normalizeCourseGradingTerms(raw?.gradingTerms), gradesReleased: normalizeGradesReleased(raw?.gradesReleased) };
};

export const LMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved === 'light' ? 'light' : 'dark';
    } catch (_) {
      return 'dark';
    }
  });

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEY_THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // System accent color (user-selectable brand color)
  const [accent, setAccentState] = useState<AccentId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCENT);
      if (saved === 'pink' || saved === 'emerald' || saved === 'navy' || saved === 'gold' || saved === 'custom') {
        return saved;
      }
      return DEFAULT_ACCENT;
    } catch (_) {
      return DEFAULT_ACCENT;
    }
  });

  const [customAccentHex, setCustomAccentHexState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCENT_CUSTOM);
      return hexToHsl(saved ?? '') ? (saved as string) : DEFAULT_CUSTOM_HEX;
    } catch (_) {
      return DEFAULT_CUSTOM_HEX;
    }
  });

  useEffect(() => {
    const vars =
      accent === 'custom'
        ? customAccentVars(customAccentHex, theme)
        : { ...ACCENT_PRESETS.find(p => p.id === accent)![theme] };
    const root = document.documentElement;
    root.style.setProperty('--primary', vars.primary);
    root.style.setProperty('--ring', vars.ring);
    root.style.setProperty('--sidebar-active', vars.sidebarActive);
    safeSetLocalStorage(STORAGE_KEY_ACCENT, accent);
    safeSetLocalStorage(STORAGE_KEY_ACCENT_CUSTOM, customAccentHex);
  }, [accent, customAccentHex, theme]);

  const setAccent = (id: AccentId) => setAccentState(id);

  const setCustomAccentHex = (hex: string) => {
    if (!hexToHsl(hex)) return;
    setCustomAccentHexState(hex);
    setAccentState('custom');
  };

  const resetAccent = () => setAccentState(DEFAULT_ACCENT);

  const emptyDb = (): LMSDatabase => ({
    users: [],
    courses: [],
    modules: [],
    submissions: [],
    quizzes: [],
    exams: [],
    activities: [],
    calendarEvents: [],
    advisingSlots: [],
    messages: [],
    historyLogs: [],
    commonsTemplates: [],
    announcements: [],
    discussions: [],
    courseFiles: [],
    courseFolders: [],
    courseGrades: [],
    sprConfigs: {},
    sprScores: {},
    chatGroups: [],
    notifications: [],
    courseSections: [],
    enrollmentRequests: [],
  });

  // Database State (API-backed cache; starts empty, no localStorage persistence)
  const [db, setDb] = useState<LMSDatabase>(() => emptyDb());

  // Authentication State (token-backed; session restores via GET /api/auth/me)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  // SPR lazy-hydration guard: config/cells are fetched once per course per
  // session so getSPRConfig-triggered fills never refetch in a loop.
  const sprHydratedRef = useRef<Set<string>>(new Set());
  // SPR actions run async across awaits — this mirror always holds the
  // latest committed db snapshot for recompute without stale closures.
  const dbRef = useRef(db);
  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  const refreshAll = async (user: User): Promise<void> => {
    setIsLoading(true);
    setLastError(null);
    sprHydratedRef.current.clear();
    try {
      const coursesPath =
        user.role === 'student'
          ? `/api/courses?enrolled=${encodeURIComponent(user.id)}`
          : '/api/courses';
      // The first batch is failure-tolerant: only the course list is fatal
      // (nothing renders without it). A single failing notifications /
      // messages / calendar fetch must never empty the whole workspace —
      // that was the intermittent blank-screen cause.
      const [coursesSettled, notificationsSettled, messagesSettled, calendarSettled] = await Promise.allSettled([
        apiFetch<{ courses: Course[] }>(coursesPath),
        apiFetch<{ notifications: Notification[] }>('/api/notifications?limit=200'),
        apiFetch<{ messages: Message[] }>('/api/messages'),
        apiFetch<{ events: CalendarEvent[] }>('/api/calendar'),
      ]);
      if (coursesSettled.status === 'rejected') throw coursesSettled.reason;
      const coursesRes = coursesSettled.value;
      const notificationsRes = settledValue(notificationsSettled, { notifications: [] });
      const messagesRes = settledValue(messagesSettled, { messages: [] });
      const calendarRes = settledValue(calendarSettled, { events: [] });
      const fresh = emptyDb();
      // User directory for inbox threads/compose/group-member lookups. The
      // signed-in row stays authoritative; failure tolerates to self-only.
      try {
        const { users } = await apiFetch<{ users: User[] }>('/api/users');
        const others = (users || []).filter(u => u.id !== user.id);
        fresh.users = [user, ...others];
      } catch {
        fresh.users = [user];
      }
      fresh.courses = coursesRes.courses.map(normalizeCourseSyllabus);
      fresh.notifications = notificationsRes.notifications;
      fresh.messages = messagesRes.messages;
      fresh.calendarEvents = calendarRes.events;
      // Task 5: chat groups + advising slots are global (no per-course
      // scope). Failures are tolerated; sync getters read the cache.
      const groupAdvisingResults = await Promise.allSettled([
        apiFetch<{ groups: ChatGroup[] }>('/api/groups'),
        apiFetch<{ slots: AdvisingSlot[] }>('/api/advising'),
      ]);
      if (groupAdvisingResults[0].status === 'fulfilled') {
        const groups = groupAdvisingResults[0].value.groups || [];
        fresh.chatGroups = groups.map(g => ({
          ...g,
          memberIds: Array.isArray((g as any).memberIds)
            ? (g as any).memberIds
            : Array.isArray((g as any).members)
              ? (g as any).members.map((m: any) => m.userId)
              : [],
        }));
      }
      if (groupAdvisingResults[1].status === 'fulfilled') {
        fresh.advisingSlots = groupAdvisingResults[1].value.slots || [];
      }
      // Task 2: fill the course/request cache scope — sections plus pending
      // requests for each course. Per-course failures are tolerated (e.g.
      // students get 403 on the faculty-only requests endpoint); the sync
      // getters read whatever the cache holds.
      const scopeResults = await Promise.all(
        coursesRes.courses.map(course =>
          (async () => {
            const [sectionsSettled, requestsSettled, approvedSettled] = await Promise.allSettled([
              apiFetch<{ sections: CourseSection[] }>(`/api/courses/${encodeURIComponent(course.id)}/sections`),
              apiFetch<{ requests: EnrollmentRequest[] }>(`/api/courses/${encodeURIComponent(course.id)}/requests?status=pending`),
              apiFetch<{ requests: EnrollmentRequest[] }>(`/api/courses/${encodeURIComponent(course.id)}/requests?status=approved`),
            ]);
            return { sectionsSettled, requestsSettled, approvedSettled };
          })()
        )
      );
      const sectionMap = new Map<string, CourseSection>();
      const requestMap = new Map<string, EnrollmentRequest>();
      for (const r of scopeResults) {
        if (r.sectionsSettled.status === 'fulfilled') {
          for (const s of r.sectionsSettled.value.sections) sectionMap.set(s.id, s);
        }
        if (r.requestsSettled.status === 'fulfilled') {
          for (const req of r.requestsSettled.value.requests) requestMap.set(req.id, req);
        }
        // Approved rows seed the enrollment cache so rosters (People,
        // gradebooks) and enrolled-course lists survive refresh. Students
        // get 403 here — tolerated — and are covered by /requests/mine below.
        if (r.approvedSettled.status === 'fulfilled') {
          for (const req of r.approvedSettled.value.requests) requestMap.set(req.id, req);
        }
      }
      // Seed the request cache with the viewer's own requests so
      // getPendingRequestsForStudent (sync) survives reload.
      const mineSettled = await Promise.allSettled([
        apiFetch<{ requests: EnrollmentRequest[] }>('/api/requests/mine'),
      ]);
      if (mineSettled[0].status === 'fulfilled') {
        for (const req of mineSettled[0].value.requests) requestMap.set(req.id, req);
      }
      fresh.courseSections = [...sectionMap.values()];
      fresh.enrollmentRequests = [...requestMap.values()];
      // Course-content bootstrap: modules (with items + comments incl.
      // likedBy arrays), announcements (with replies/attachments/likedBy/
      // readBy), discussions (with replies) for each of the user's courses
      // (enrolled + taught — the same course set resolved above). Per-course
      // failures are tolerated (403-tolerant); sync getters read the cache.
      const contentResults = await Promise.all(
        coursesRes.courses.map(course =>
          (async () => {
            const [modulesSettled, announcementsSettled, discussionsSettled] = await Promise.allSettled([
              apiFetch<{ modules: Module[] }>(`/api/courses/${encodeURIComponent(course.id)}/modules`),
              apiFetch<{ announcements: Announcement[] }>(`/api/courses/${encodeURIComponent(course.id)}/announcements`),
              apiFetch<{ discussions: Discussion[] }>(`/api/courses/${encodeURIComponent(course.id)}/discussions`),
            ]);
            return { modulesSettled, announcementsSettled, discussionsSettled };
          })()
        )
      );
      const allModules: Module[] = [];
      const allAnnouncements: Announcement[] = [];
      const allDiscussions: Discussion[] = [];
      for (const r of contentResults) {
        if (r.modulesSettled.status === 'fulfilled') allModules.push(...r.modulesSettled.value.modules);
        if (r.announcementsSettled.status === 'fulfilled') {
          allAnnouncements.push(...r.announcementsSettled.value.announcements);
        }
        if (r.discussionsSettled.status === 'fulfilled') {
          allDiscussions.push(...r.discussionsSettled.value.discussions);
        }
      }
      fresh.modules = allModules;
      fresh.announcements = allAnnouncements;
      fresh.discussions = allDiscussions;
      // Task 4 assessment bootstrap: activities (both formats — classic
      // rows carry parsed submissionTypes/rubric arrays — plus
      // per-activity submissions; the server scopes rows by role, so
      // faculty see all course submissions while students see their own),
      // quizzes (+questions; the server strips answer keys for students),
      // and course grades (faculty all rows /
      // student own row). Per-course failures are tolerated
      // (403-tolerant); sync getters read the cache.
      const assessmentResults = await Promise.all(
        coursesRes.courses.map(course =>
          (async () => {
            const [quizzesSettled, examsSettled, activitiesSettled, gradesSettled] =
              await Promise.allSettled([
                apiFetch<{ quizzes: Quiz[] }>(`/api/quizzes?courseId=${encodeURIComponent(course.id)}`),
                apiFetch<{ exams: Exam[] }>(`/api/exams?courseId=${encodeURIComponent(course.id)}`),
                apiFetch<{ activities: Activity[] }>(`/api/activities?courseId=${encodeURIComponent(course.id)}`),
                apiFetch<{ grades: CourseStudentGrade[] }>(`/api/courses/${encodeURIComponent(course.id)}/grades`),
              ]);
            return { courseId: course.id, quizzesSettled, examsSettled, activitiesSettled, gradesSettled };
          })()
        )
      );
      const allQuizzes: Quiz[] = [];
      const allExams: Exam[] = [];
      const allActivities: Activity[] = [];
      const allGrades: CourseStudentGrade[] = [];
      const allSPRScores: Record<string, Record<string, SPRStudentCells>> = {};
      for (const r of assessmentResults) {
        if (r.quizzesSettled.status === 'fulfilled') {
          for (const q of r.quizzesSettled.value.quizzes) allQuizzes.push(normalizeQuiz(q));
        }
        if (r.examsSettled.status === 'fulfilled') {
          for (const e of r.examsSettled.value.exams) allExams.push(normalizeExam(e));
        }
        if (r.activitiesSettled.status === 'fulfilled') {
          for (const a of r.activitiesSettled.value.activities) allActivities.push(normalizeActivity(a));
        }
        if (r.gradesSettled.status === 'fulfilled') {
          for (const g of r.gradesSettled.value.grades) {
            allGrades.push(normalizeCourseGrade(g));
            // Grade rows carry the server-side sprCells payload — hydrate the
            // manual-cell map from it so cells survive reload with no extra
            // endpoint round-trip.
            const cells = parseSPRCells((g as any).sprCells);
            if (cells && typeof (g as any).studentId === 'string') {
              if (!allSPRScores[r.courseId]) allSPRScores[r.courseId] = {};
              allSPRScores[r.courseId][(g as any).studentId] = cells;
            }
          }
        }
      }
      // SPR config hydration: GET /api/courses/:id/spr per visible course
      // after grades load. Per-course failures are tolerated; sync getters
      // read whatever the cache holds and ensureSPRCourse retries lazily.
      const sprConfigResults = await Promise.all(
        coursesRes.courses.map(course =>
          (async () => {
            try {
              const { config } = await apiFetch<{ config: SPRConfig | null }>(
                `/api/courses/${encodeURIComponent(course.id)}/spr`
              );
              return { courseId: course.id, config: config ?? null };
            } catch {
              return { courseId: course.id, config: null };
            }
          })()
        )
      );
      const allSPRConfigs: Record<string, SPRConfig> = {};
      for (const r of sprConfigResults) {
        sprHydratedRef.current.add(r.courseId);
        if (r.config) allSPRConfigs[r.courseId] = r.config;
      }
      // Submissions ride per quiz / exam / activity (role-scoped
      // server-side; classic + question-set activities both list via
      // GET /api/activities/:id/submissions). Per-list failures are
      // tolerated (403-tolerant); sync getters read the cache.
      const allSubmissions: Submission[] = [];
      const seenSubmissionIds = new Set<string>();
      const quizSubmissionResults = await Promise.allSettled(
        allQuizzes.map(q =>
          apiFetch<{ submissions: any[] }>(`/api/quizzes/${encodeURIComponent(q.id)}/submissions`)
        )
      );
      const activitySubmissionResults = await Promise.allSettled(
        allActivities.map(a =>
          apiFetch<{ submissions: any[] }>(`/api/activities/${encodeURIComponent(a.id)}/submissions`)
        )
      );
      const examSubmissionResults = await Promise.allSettled(
        allExams.map(e =>
          apiFetch<{ submissions: any[] }>(`/api/exams/${encodeURIComponent(e.id)}/submissions`)
        )
      );
      for (const r of [...quizSubmissionResults, ...examSubmissionResults, ...activitySubmissionResults]) {
        if (r.status === 'fulfilled') {
          for (const s of r.value.submissions) {
            const merged = normalizeSubmission(s);
            if (seenSubmissionIds.has(merged.id)) continue;
            seenSubmissionIds.add(merged.id);
            allSubmissions.push(merged);
          }
        }
      }
      fresh.submissions = allSubmissions;
      fresh.quizzes = allQuizzes;
      fresh.exams = allExams;
      fresh.activities = allActivities;
      fresh.courseGrades = allGrades;
      fresh.sprConfigs = allSPRConfigs;
      fresh.sprScores = allSPRScores;
      // Task 5 files bootstrap: folders + direct CourseFile rows for each of
      // the user's courses (virtual aggregation in useCourseFiles reads these
      // rows plus module/announcement/activity sources). Per-course
      // failures are tolerated (403-tolerant); sync getters read the cache.
      const fileResults = await Promise.all(
        coursesRes.courses.map(course =>
          (async () => {
            const [foldersSettled, filesSettled] = await Promise.allSettled([
              apiFetch<{ folders: CourseFolder[] }>(`/api/courses/${encodeURIComponent(course.id)}/folders`),
              apiFetch<{ files: CourseFile[] }>(`/api/courses/${encodeURIComponent(course.id)}/files`),
            ]);
            return { foldersSettled, filesSettled };
          })()
        )
      );
      const allFolders: CourseFolder[] = [];
      const allFiles: CourseFile[] = [];
      for (const r of fileResults) {
        if (r.foldersSettled.status === 'fulfilled') allFolders.push(...r.foldersSettled.value.folders);
        if (r.filesSettled.status === 'fulfilled') allFiles.push(...r.filesSettled.value.files);
      }
      fresh.courseFolders = allFolders;
      fresh.courseFiles = allFiles;
      setDb(fresh);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load data.';
      setLastError(message);
      showAlert(message, 'Load Failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Session restore: token -> GET /api/auth/me -> user + bootstrap
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { user } = await apiFetch<{ user: User }>('/api/auth/me');
        if (cancelled) return;
        setCurrentUser(user);
        await refreshAll(user);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
        } else {
          const message = err instanceof ApiError ? err.message : 'Failed to restore session.';
          setLastError(message);
          showAlert(message, 'Load Failed');
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAuthenticated = currentUser !== null;
  const activeUser = currentUser || db.users[0];
  const activeRole: UserRole = currentUser?.role || 'student';

  const login = async (emailOrId: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { token, user } = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: { email: emailOrId, password },
      });
      setToken(token);
      setCurrentUser(user);
      await refreshAll(user);
      return { success: true };
    } catch (err) {
      if (err instanceof ApiError) return { success: false, message: err.message };
      return { success: false, message: 'Login failed.' };
    }
  };

  const logout = () => {
    clearToken();
    sprHydratedRef.current.clear();
    setCurrentUser(null);
    setDb(emptyDb());
    setIsUserProfileModalOpen(false);
    setIsRoleModalOpen(false);
  };

  const switchRole = (role: UserRole) => {
    const userWithRole = db.users.find(u => u.role === role);
    if (userWithRole) {
      setCurrentUser(userWithRole);
    }
  };

  // Course state
  const [activeCourseId, setActiveCourseId] = useState<string | null>('crs-cmsc131');

  // UI Drawers & Modals
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);

// Alert & Confirmation Modal state
  const [alertOptions, setAlertOptions] = useState<AlertModalOptions | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // Notifications state (mirrors db.notifications so badges survive reload)
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const stored = (db as LMSDatabase).notifications;
    if (stored && Array.isArray(stored)) {
      setNotifications(prev => {
        if (prev.length === stored.length && prev.every((n, i) => n.id === stored[i]?.id && n.read === stored[i]?.read)) {
          return prev;
        }
        return [...stored].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
    }
  }, [db.notifications]);

  const showAlert = (options: string | AlertModalOptions, title?: string) => {
    if (typeof options === 'string') {
      setAlertOptions({
        title: title || 'Notice',
        message: options,
        type: 'info'
      });
    } else {
      setAlertOptions(options);
    }
    setIsAlertOpen(true);
  };

  const showConfirm = (message: string, onConfirm: () => void, title?: string) => {
    setAlertOptions({
      title: title || 'Confirmation',
      message,
      type: 'confirm',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm
    });
    setIsAlertOpen(true);
  };

  const closeAlert = () => {
    setIsAlertOpen(false);
  };

  // SpeedGrader
  const [activeSpeedGraderSubmissionId, setActiveSpeedGraderSubmissionId] = useState<string | null>(null);

  const openSpeedGrader = (subId: string) => {
    setActiveSpeedGraderSubmissionId(subId);
  };

  const closeSpeedGrader = () => {
    setActiveSpeedGraderSubmissionId(null);
  };

  // History logger
  const logHistory = (path: string, title: string) => {
    const newLog: HistoryLog = {
      id: `hist-${Date.now()}`,
      path,
      title,
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    setDb(prev => ({
      ...prev,
      historyLogs: [newLog, ...prev.historyLogs.filter(h => h.path !== path)].slice(0, 15)
    }));
  };

  // ==========================================
  // REAL CRUD ACTIONS
  // ==========================================

  // Syllabus-driven grading terms: per-course options from the override
  // (Task 6 editor) or syllabus detection, consumed by Tasks 6-7.
  const effectiveTermsForCourse = (courseId: string): TermId[] => {
    const course = db.courses.find(c => c.id === courseId);
    return effectiveTerms(course ?? null, course?.syllabus ?? null);
  };

  const defaultTermForCourse = (courseId: string): TermId =>
    effectiveTermsForCourse(courseId)[0] ?? 'midterm';

  const createCourse = async (courseData: Partial<Course>): Promise<Course> => {
    const uniqueJoinCode =
      courseData.joinCode?.trim().toUpperCase() ||
      generateCourseJoinCode(db.courses, courseData.code);

    try {
      const { course } = await apiFetch<{ course: Course }>('/api/courses', {
        method: 'POST',
        body: {
          code: courseData.code || 'CMSC 199',
          title: courseData.title || 'Advanced Computer Science Topics',
          section: courseData.section || 'BSCS 4-1',
          term: courseData.term || '1st Sem AY 2026-2027',
          instructorName: activeUser.name,
          published: courseData.published ?? true,
          color: courseData.color !== undefined ? courseData.color : '',
          image: courseData.image || '',
          credits: courseData.credits || 3,
          chedComplianceCode: courseData.chedComplianceCode || 'CMO-25-2015',
          joinCode: uniqueJoinCode
        }
      });

      setDb(prev => ({
        ...prev,
        courses: [course, ...prev.courses]
      }));

      setActiveCourseId(course.id);
      return course;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create course.';
      setLastError(message);
      showAlert(message, 'Create Course Failed');
      throw err;
    }
  };

  const createModule = async (courseId: string, title: string): Promise<Module> => {
    try {
      const { module } = await apiFetch<{ module: Module }>(
        `/api/courses/${encodeURIComponent(courseId)}/modules`,
        { method: 'POST', body: { title } }
      );
      // Server defaults order to 0 — keep the client's append-at-end ordering.
      const merged: Module = {
        ...module,
        order: module.order || db.modules.filter(m => m.courseId === courseId).length + 1,
        items: module.items || [],
        comments: (module as Module).comments || []
      };
      setDb(prev => ({
        ...prev,
        modules: [...prev.modules, merged]
      }));
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create module.';
      setLastError(message);
      showAlert(message, 'Create Module Failed');
      throw err;
    }
  };

  const updateModule = async (moduleId: string, updates: Partial<Module>): Promise<void> => {
    // Folder renames ride along server-side (module:<id> autoKey); no client
    // courseFolders bookkeeping needed.
    const body: Record<string, string | boolean | number> = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.published !== undefined) body.published = updates.published;
    if (updates.order !== undefined) body.order = updates.order;
    try {
      const { module } = await apiFetch<{ module: Module }>(
        `/api/modules/${encodeURIComponent(moduleId)}`,
        { method: 'PATCH', body }
      );
      setDb(prev => ({
        ...prev,
        modules: (prev.modules || []).map(m =>
          m.id === moduleId
            ? { ...m, ...module, items: m.items, comments: m.comments }
            : m
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update module.';
      setLastError(message);
      showAlert(message, 'Update Module Failed');
      throw err;
    }
  };

  const deleteModule = async (moduleId: string): Promise<void> => {
    // No-cascade semantics live server-side (filed CourseFile rows stay).
    try {
      await apiFetch<{ ok: true }>(`/api/modules/${encodeURIComponent(moduleId)}`, {
        method: 'DELETE'
      });
      setDb(prev => ({
        ...prev,
        modules: (prev.modules || []).filter(m => m.id !== moduleId)
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete module.';
      setLastError(message);
      showAlert(message, 'Delete Module Failed');
      throw err;
    }
  };

  const addModuleItem = async (moduleId: string, itemData: Partial<ModuleItem>): Promise<void> => {
    // File fields pass through; the server files them (area/modules folders).
    const body: Record<string, string | boolean> = {};
    if (itemData.title !== undefined) body.title = itemData.title;
    if (itemData.type !== undefined) body.type = itemData.type;
    if (itemData.published !== undefined) body.published = itemData.published;
    if (itemData.required !== undefined) body.required = itemData.required;
    if (itemData.completionCondition !== undefined) body.completionCondition = itemData.completionCondition;
    if (itemData.content !== undefined && itemData.content !== null) body.content = itemData.content;
    if (itemData.activityId !== undefined && itemData.activityId !== null) body.activityId = itemData.activityId;
    if (itemData.quizId !== undefined && itemData.quizId !== null) body.quizId = itemData.quizId;
    if (itemData.fileUrl !== undefined && itemData.fileUrl !== null) body.fileUrl = itemData.fileUrl;
    if (itemData.fileName !== undefined && itemData.fileName !== null) body.fileName = itemData.fileName;
    if (itemData.fileSize !== undefined && itemData.fileSize !== null) body.fileSize = itemData.fileSize;
    if (itemData.fileType !== undefined && itemData.fileType !== null) body.fileType = itemData.fileType;
    try {
      const { item } = await apiFetch<{ item: ModuleItem }>(
        `/api/modules/${encodeURIComponent(moduleId)}/items`,
        { method: 'POST', body }
      );
      setDb(prev => ({
        ...prev,
        modules: prev.modules.map(mod =>
          mod.id === moduleId ? { ...mod, items: [...mod.items, item as ModuleItem] } : mod
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to add module item.';
      setLastError(message);
      showAlert(message, 'Add Item Failed');
      throw err;
    }
  };

  const updateModuleItem = async (
    currentModuleId: string,
    itemId: string,
    updates: Partial<ModuleItem>,
    targetModuleId?: string
  ): Promise<void> => {
    const destModuleId = targetModuleId || currentModuleId;
    try {
      const body: Record<string, string | boolean | number> = {};
      const stringFields = [
        'title', 'type', 'completionCondition', 'content', 'activityId',
        'quizId', 'fileUrl', 'fileName', 'fileSize', 'fileType'
      ] as const;
      for (const key of stringFields) {
        const value = updates[key];
        if (value !== undefined && value !== null) body[key] = value;
      }
      if (updates.published !== undefined) body.published = updates.published;
      if (updates.required !== undefined) body.required = updates.required;
      if (updates.minScore !== undefined) body.minScore = updates.minScore;
      if (destModuleId !== currentModuleId) {
        // Cross-module move: single PATCH carrying the target FK — the item
        // id is PRESERVED server-side.
        const { item } = await apiFetch<{ item: ModuleItem }>(
          `/api/modules/${encodeURIComponent(currentModuleId)}/items/${encodeURIComponent(itemId)}`,
          { method: 'PATCH', body: { ...body, targetModuleId: destModuleId } }
        );
        setDb(prev => {
          const moved = item as ModuleItem;
          const withoutSource = (prev.modules || []).map(mod =>
            mod.id === currentModuleId
              ? { ...mod, items: mod.items.filter(it => it.id !== itemId) }
              : mod
          );
          return {
            ...prev,
            modules: withoutSource.map(mod =>
              mod.id === destModuleId ? { ...mod, items: [...mod.items, moved] } : mod
            )
          };
        });
        return;
      }
      const { item } = await apiFetch<{ item: ModuleItem }>(
        `/api/modules/${encodeURIComponent(currentModuleId)}/items/${encodeURIComponent(itemId)}`,
        { method: 'PATCH', body }
      );
      setDb(prev => ({
        ...prev,
        modules: (prev.modules || []).map(mod =>
          mod.id === currentModuleId
            ? { ...mod, items: mod.items.map(it => (it.id === itemId ? { ...it, ...(item as ModuleItem) } : it)) }
            : mod
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update module item.';
      setLastError(message);
      showAlert(message, 'Update Item Failed');
      throw err;
    }
  };

  const deleteModuleItem = async (moduleId: string, itemId: string): Promise<void> => {
    try {
      await apiFetch<{ ok: true }>(
        `/api/modules/${encodeURIComponent(moduleId)}/items/${encodeURIComponent(itemId)}`,
        { method: 'DELETE' }
      );
      setDb(prev => ({
        ...prev,
        modules: (prev.modules || []).map(mod =>
          mod.id === moduleId ? { ...mod, items: mod.items.filter(it => it.id !== itemId) } : mod
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete module item.';
      setLastError(message);
      showAlert(message, 'Delete Item Failed');
      throw err;
    }
  };

  const createQuiz = async (quizData: Partial<Quiz>): Promise<Quiz> => {
    const courseId = quizData.courseId || activeCourseId || 'crs-cmsc131';
    const term = quizData.term ?? defaultTermForCourse(courseId);
    // Questions pass through (server parses option blobs; students get the
    // key stripped on read while faculty keep it).
    try {
      const { quiz } = await apiFetch<{ quiz: Quiz }>('/api/quizzes', {
        method: 'POST',
        body: {
          courseId,
          title: quizData.title || 'New Assessment Quiz',
          term,
          instructions: quizData.instructions || 'Answer all questions carefully. Time limit strictly enforced.',
          published: quizData.published ?? true,
          questions: quizData.questions || [
            {
              id: `q-${Date.now()}-1`,
              text: 'Which architectural pattern is recommended for modern web applications?',
              type: 'multiple_choice',
              options: ['Component-based (e.g. React)', 'Monolithic CGI', 'FTP Server', 'Telnet Terminal'],
              correctAnswer: 'Component-based (e.g. React)',
              points: 10
            }
          ],
          ...(quizData.timeLimitMinutes !== undefined ? { timeLimitMinutes: quizData.timeLimitMinutes } : {}),
          ...(quizData.delayedUntil !== undefined ? { delayedUntil: quizData.delayedUntil } : {}),
          ...(quizData.dueDate !== undefined ? { dueDate: quizData.dueDate } : {}),
          ...(quizData.fileName !== undefined ? { fileName: quizData.fileName } : {}),
          ...(quizData.fileUrl !== undefined ? { fileUrl: quizData.fileUrl } : {}),
          ...(quizData.fileSize !== undefined ? { fileSize: quizData.fileSize } : {})
        }
      });
      const merged = normalizeQuiz(quiz);
      setDb(prev => ({
        ...prev,
        quizzes: [merged, ...prev.quizzes]
      }));
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create quiz.';
      setLastError(message);
      showAlert(message, 'Create Quiz Failed');
      throw err;
    }
  };

  const recordQuizSubmission = async (
    quizId: string,
    studentId: string,
    answers: Record<string, string>
  ): Promise<Submission> => {
    // Client computes nothing new: POST the answers, cache the server row.
    // Instant-feedback scoring stays in QuizzesView's client scorer; the
    // gradebook reads the server row.
    try {
      const { submission } = await apiFetch<{ submission: any }>(
        `/api/quizzes/${encodeURIComponent(quizId)}/submit`,
        { method: 'POST', body: { answers } }
      );
      const merged = normalizeSubmission(submission);
      setDb(prev => {
        const idx = prev.submissions.findIndex(
          s => merged.activityKey !== undefined && s.activityKey === merged.activityKey && s.studentId === studentId
        );
        if (idx >= 0) {
          const updatedSubs = [...prev.submissions];
          updatedSubs[idx] = merged;
          return { ...prev, submissions: updatedSubs };
        }
        return { ...prev, submissions: [merged, ...prev.submissions] };
      });
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to submit quiz.';
      setLastError(message);
      showAlert(message, 'Submit Quiz Failed');
      throw err;
    }
  };

  const createExam = async (examData: Partial<Exam>): Promise<Exam> => {
    const courseId = examData.courseId || activeCourseId || 'crs-cmsc131';
    const term = examData.term ?? defaultTermForCourse(courseId);
    try {
      const { exam } = await apiFetch<{ exam: Exam }>('/api/exams', {
        method: 'POST',
        body: {
          courseId,
          title: examData.title || 'New Exam',
          term,
          instructions: examData.instructions || 'Answer all questions carefully. Time limit strictly enforced.',
          published: examData.published ?? true,
          questions: examData.questions || [
            {
              id: `q-${Date.now()}-1`,
              text: 'Which architectural pattern is recommended for modern web applications?',
              type: 'multiple_choice',
              options: ['Component-based (e.g. React)', 'Monolithic CGI', 'FTP Server', 'Telnet Terminal'],
              correctAnswer: 'Component-based (e.g. React)',
              points: 10
            }
          ],
          ...(examData.timeLimitMinutes !== undefined ? { timeLimitMinutes: examData.timeLimitMinutes } : {}),
          ...(examData.dueDate !== undefined ? { dueDate: examData.dueDate } : {}),
          ...((examData as { fileName?: unknown }).fileName !== undefined ? { fileName: (examData as { fileName?: unknown }).fileName } : {}),
          ...((examData as { fileUrl?: unknown }).fileUrl !== undefined ? { fileUrl: (examData as { fileUrl?: unknown }).fileUrl } : {}),
          ...((examData as { fileSize?: unknown }).fileSize !== undefined ? { fileSize: (examData as { fileSize?: unknown }).fileSize } : {})
        }
      });
      const merged = normalizeExam(exam);
      setDb(prev => ({
        ...prev,
        exams: [merged, ...(prev.exams || [])]
      }));
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create exam.';
      setLastError(message);
      showAlert(message, 'Create Exam Failed');
      throw err;
    }
  };

  const recordExamSubmission = async (
    examId: string,
    studentId: string,
    answers: Record<string, string>
  ): Promise<Submission> => {
    // Client computes nothing new: POST the answers, cache the server row.
    // Instant-feedback scoring stays in ExamsView's client scorer; the
    // gradebook reads the server row.
    try {
      const { submission } = await apiFetch<{ submission: any }>(
        `/api/exams/${encodeURIComponent(examId)}/submit`,
        { method: 'POST', body: { answers } }
      );
      const merged = normalizeSubmission(submission);
      setDb(prev => {
        const idx = (prev.submissions || []).findIndex(
          s => merged.activityKey !== undefined && s.activityKey === merged.activityKey && s.studentId === studentId
        );
        if (idx >= 0) {
          const updatedSubs = [...prev.submissions];
          updatedSubs[idx] = merged;
          return { ...prev, submissions: updatedSubs };
        }
        return { ...prev, submissions: [merged, ...prev.submissions] };
      });
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to submit exam.';
      setLastError(message);
      showAlert(message, 'Submit Exam Failed');
      throw err;
    }
  };

  const createActivity = async (data: Partial<Activity>): Promise<Activity> => {
    const courseId = data.courseId || activeCourseId || 'crs-cmsc131';
    const questions = data.questions || [];
    const term = data.term ?? defaultTermForCourse(courseId);
    const format = data.format ?? 'questionset';
    try {
      const body: Record<string, unknown> =
        format === 'classic'
          ? {
              courseId,
              title: data.title?.trim() || 'New Course Activity',
              instructions:
                data.instructions || 'Please review the guidelines and submit your work before the deadline.',
              pointsPossible: data.pointsPossible ?? 100,
              dueDate: data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
              ...(data.term !== undefined ? { term: data.term } : { term }),
              submissionTypes: data.submissionTypes || ['file', 'online_text'],
              published: data.published ?? true,
              category: data.category || 'Laboratory',
              weight: data.weight ?? 20,
              // No predefined rubric: the Classic Activity form owns an
              // opt-in custom rubric (ActivityFormValue.includeRubric); when
              // unchecked the payload carries `rubric: []` and SpeedGrader
              // falls back to plain score entry.
              rubric: Array.isArray(data.rubric) ? data.rubric : [],
              ...(data.fileName !== undefined ? { fileName: data.fileName } : {}),
              ...(data.fileUrl !== undefined ? { fileUrl: data.fileUrl } : {}),
              ...(data.fileSize !== undefined ? { fileSize: data.fileSize } : {}),
              ...(data.availableFrom !== undefined ? { availableFrom: data.availableFrom } : {}),
              ...(data.availableUntil !== undefined ? { availableUntil: data.availableUntil } : {}),
              ...(data.sectionRestriction !== undefined ? { sectionRestriction: data.sectionRestriction } : {}),
              format: 'classic',
            }
          : {
              courseId,
              title: data.title?.trim() || 'New Question-Set Activity',
              term,
              instructions: data.instructions || 'Answer all questions carefully.',
              pointsPossible: data.pointsPossible ?? activityPointsPossible(questions),
              ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
              published: data.published ?? true,
              questions,
              format: 'questionset',
            };
      const { activity } = await apiFetch<{ activity: Activity }>('/api/activities', {
        method: 'POST',
        body,
      });
      const merged = normalizeActivity(activity);
      setDb(prev => ({
        ...prev,
        activities: [merged, ...(prev.activities || [])]
      }));

      if (merged.format === 'classic' && merged.dueDate) {
        // Client-only calendar mirroring: classic activities get a deadline
        // event (CalendarEvent type 'activity').
        const newCalEvent: CalendarEvent = {
          id: `evt-${Date.now()}`,
          title: `Due: ${merged.title}`,
          date: merged.dueDate.split('T')[0],
          time: '11:59 PM',
          courseId: merged.courseId,
          type: 'activity',
          description: `Course activity submission deadline for ${merged.title}`
        };
        setDb(prev => ({
          ...prev,
          calendarEvents: [...prev.calendarEvents, newCalEvent]
        }));
      }

      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create activity.';
      setLastError(message);
      showAlert(message, 'Create Activity Failed');
      throw err;
    }
  };

  const updateActivity = async (activityId: string, updates: Partial<Activity>): Promise<Activity> => {
    // Mirrors PATCH /api/activities/:id (union of classic + question-set
    // fields — all classic fields supported). Questions are write-once, so
    // the cached question set is preserved here.
    try {
      const body: Record<string, unknown> = {};
      if (updates.title !== undefined) body.title = updates.title;
      if (updates.term !== undefined) body.term = updates.term;
      if (updates.instructions !== undefined) body.instructions = updates.instructions;
      if (updates.published !== undefined) body.published = updates.published;
      if (updates.dueDate !== undefined) body.dueDate = updates.dueDate;
      if (updates.pointsPossible !== undefined) body.pointsPossible = updates.pointsPossible;
      if (updates.submissionTypes !== undefined) body.submissionTypes = updates.submissionTypes;
      if (updates.category !== undefined) body.category = updates.category;
      if (updates.weight !== undefined) body.weight = updates.weight;
      if (updates.rubric !== undefined) body.rubric = updates.rubric;
      if (updates.fileName !== undefined) body.fileName = updates.fileName;
      if (updates.fileUrl !== undefined) body.fileUrl = updates.fileUrl;
      if (updates.fileSize !== undefined) body.fileSize = updates.fileSize;
      if (updates.availableFrom !== undefined) body.availableFrom = updates.availableFrom;
      if (updates.availableUntil !== undefined) body.availableUntil = updates.availableUntil;
      if (updates.sectionRestriction !== undefined) body.sectionRestriction = updates.sectionRestriction;
      const { activity } = await apiFetch<{ activity: Activity }>(
        `/api/activities/${encodeURIComponent(activityId)}`,
        { method: 'PATCH', body }
      );
      const normalized = normalizeActivity(activity);
      let merged: Activity = normalized;
      setDb(prev => {
        const existing = (prev.activities || []).find(a => a.id === activityId);
        merged = {
          ...normalized,
          questions:
            normalized.questions && normalized.questions.length > 0
              ? normalized.questions
              : existing?.questions || []
        };
        return {
          ...prev,
          activities: (prev.activities || []).map(a => (a.id === activityId ? merged : a))
        };
      });
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update activity.';
      setLastError(message);
      showAlert(message, 'Update Activity Failed');
      throw err;
    }
  };

  const recordActivitySubmission = async (
    activityId: string,
    studentId: string,
    answers: Record<string, string>
  ): Promise<Submission> => {
    // Same pattern as quizzes: POST the answers, cache the server row.
    // Essay-pending status comes from the server row (status stays
    // 'submitted' until faculty grades in SpeedGrader).
    try {
      const { submission } = await apiFetch<{ submission: any }>(
        `/api/activities/${encodeURIComponent(activityId)}/submit`,
        { method: 'POST', body: { answers } }
      );
      const merged = normalizeSubmission(submission);
      setDb(prev => {
        const updatedSubs = [...prev.submissions];
        const idx = updatedSubs.findIndex(
          s => merged.activityKey !== undefined && s.activityKey === merged.activityKey && s.studentId === studentId
        );
        if (idx >= 0) {
          updatedSubs[idx] = merged;
        } else {
          updatedSubs.unshift(merged);
        }
        return { ...prev, submissions: updatedSubs };
      });
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to submit activity.';
      setLastError(message);
      showAlert(message, 'Submit Activity Failed');
      throw err;
    }
  };

  const deleteActivity = async (activityId: string): Promise<void> => {
    try {
      await apiFetch<{ ok: true }>(`/api/activities/${encodeURIComponent(activityId)}`, {
        method: 'DELETE'
      });
      setDb(prev => ({
        ...prev,
        activities: (prev.activities || []).filter(a => a.id !== activityId),
        submissions: prev.submissions.filter(
          s => s.activityKey !== activityId && s.activityKey !== `asg-activity-${activityId}`
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete activity.';
      setLastError(message);
      showAlert(message, 'Delete Activity Failed');
      throw err;
    }
  };

  const enrollPerson = async (person: Partial<User>, courseId?: string): Promise<boolean> => {
    const targetCourseId = courseId || activeCourseId;
    const newPerson: User = {
      id: `usr-${person.role || 'stud'}-${Date.now().toString(36)}`,
      name: person.name || 'New Enrollee',
      email: person.email || `user.${Date.now()}@dmmmsu.edu.ph`,
      role: person.role || 'student',
      avatar: person.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      studentId: person.studentId || (person.role === 'student' ? `2026-SLUC-${Math.floor(1000 + Math.random() * 9000)}` : undefined),
      department: person.department || 'BS Computer Science',
      title: person.title || (person.role === 'student' ? 'Enrolled Student' : 'Instructor'),
      enrolledCourseIds: person.enrolledCourseIds || (targetCourseId ? [targetCourseId] : [])
    };

    setDb(prev => {
      const updatedCourses = prev.courses.map(c => {
        if (c.id === targetCourseId && newPerson.role === 'student') {
          return { ...c, enrolledCount: c.enrolledCount + 1 };
        }
        return c;
      });

      return {
        ...prev,
        users: [...prev.users, newPerson],
        courses: updatedCourses
      };
    });

    // Mirror the invite server-side when the person references an existing
    // account id. When the invite fails, roll back the created user.
    if (targetCourseId && person.id) {
      try {
        const { request } = await apiFetch<{ request: EnrollmentRequest }>(
          `/api/courses/${encodeURIComponent(targetCourseId)}/invites`,
          { method: 'POST', body: { studentId: person.id } }
        );
        setDb(prev => mergeEnrollmentRequest(prev, request));
      } catch (err) {
        const createdId = newPerson.id;
        setDb(prev => ({
          ...prev,
          users: prev.users.filter(u => u.id !== createdId)
        }));
        const message = err instanceof ApiError ? err.message : 'Failed to send course invite.';
        setLastError(message);
        showAlert(message, 'Invite Failed');
        return false;
      }
    }
    return true;
  };

  const enrollStudentsInCourse = async (studentIds: string[], courseId: string): Promise<boolean> => {
    const targetCourseId = courseId || activeCourseId;
    if (!targetCourseId || studentIds.length === 0) return false;

    try {
      const results = await Promise.all(
        studentIds.map(studentId =>
          apiFetch<{ request: EnrollmentRequest }>(
            `/api/courses/${encodeURIComponent(targetCourseId)}/invites`,
            { method: 'POST', body: { studentId } }
          )
        )
      );
      setDb(prev => {
        let merged = prev;
        for (const { request } of results) {
          merged = mergeEnrollmentRequest(merged, request);
        }
        return merged;
      });
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to enroll students.';
      setLastError(message);
      showAlert(message, 'Enroll Failed');
      return false;
    }
  };

  const createUser = async (userData: Partial<User>): Promise<User> => {
    const role = userData.role || 'student';
    try {
      const { user } = await apiFetch<{ user: User }>('/api/users', {
        method: 'POST',
        body: {
          name: userData.name?.trim() || userData.email?.trim() || 'New User',
          email: userData.email?.trim() || '',
          role,
          password: userData.password || 'password123',
          avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          department: userData.department || 'College of Computer Science',
          title: userData.title || (role === 'student' ? 'Undergraduate Student' : 'Faculty Instructor'),
        }
      });
      // The server returns the public user only — reattach the client-side
      // account extras (studentId, password, enrolledCourseIds).
      const merged: User = {
        ...user,
        studentId: userData.studentId || (role === 'student' ? `2026-${Math.floor(10000 + Math.random() * 90000)}` : undefined),
        password: userData.password || 'password123',
        enrolledCourseIds: userData.enrolledCourseIds || []
      };
      setDb(prev => ({
        ...prev,
        users: [...prev.users, merged]
      }));
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create user.';
      setLastError(message);
      showAlert(message, 'Create User Failed');
      throw err;
    }
  };

  const updateUser = async (id: string, updates: Partial<User> & { banner?: string }): Promise<boolean> => {
    // Server PATCH accepts name/avatar/department/title plus
    // email/role/password (validated server-side).
    const patchBody: Record<string, string> = {};
    if (updates.name !== undefined) patchBody.name = updates.name;
    if (updates.avatar !== undefined) patchBody.avatar = updates.avatar;
    if (updates.department !== undefined) patchBody.department = updates.department;
    if (updates.title !== undefined) patchBody.title = updates.title;
    if (updates.email !== undefined) patchBody.email = updates.email;
    if (updates.role !== undefined) patchBody.role = updates.role;
    if (updates.password !== undefined) patchBody.password = updates.password;
    const localUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    ) as Partial<User>;

    try {
      if (Object.keys(patchBody).length > 0) {
        const { user } = await apiFetch<{ user: User }>(
          `/api/users/${encodeURIComponent(id)}`,
          { method: 'PATCH', body: patchBody }
        );
        const merged = { ...user, ...localUpdates };
        setDb(prev => ({
          ...prev,
          users: prev.users.map(u => (u.id === id ? { ...u, ...merged } : u))
        }));
        // Active session reads from currentUser (not db.users) — sync it so
        // avatar/banner/name changes render instantly without a reload.
        setCurrentUser(prev => (prev && prev.id === id ? { ...prev, ...merged } : prev));
      } else {
        setDb(prev => ({
          ...prev,
          users: prev.users.map(u => (u.id === id ? { ...u, ...localUpdates } : u))
        }));
        setCurrentUser(prev => (prev && prev.id === id ? { ...prev, ...localUpdates } : prev));
      }
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update user.';
      setLastError(message);
      showAlert(message, 'Update User Failed');
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    if (activeUser.id === userId) {
      return {
        success: false,
        message: 'You cannot delete your own active account.'
      };
    }

    const userToDelete = db.users.find(u => u.id === userId);
    if (!userToDelete) {
      return { success: false, message: 'User not found.' };
    }

    try {
      await apiFetch<{ ok: true }>(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete user.';
      setLastError(message);
      return { success: false, message };
    }

    setDb(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== userId),
      submissions: prev.submissions.filter(s => s.studentId !== userId)
    }));

    return {
      success: true,
      message: `Account for ${userToDelete.name} has been deleted.`
    };
  };

  const joinCourseByCode = async (code: string): Promise<{ success: boolean; message: string; course?: Course }> => {
    const cleanCode = code.trim().toUpperCase();
    const targetCourse = db.courses.find(c => (c.joinCode || '').toUpperCase() === cleanCode);

    const currentEnrolled = activeUser.enrolledCourseIds || [];
    if (targetCourse && currentEnrolled.includes(targetCourse.id)) {
      return {
        success: false,
        message: `You are already enrolled in ${targetCourse.code} (${targetCourse.title}).`,
        course: targetCourse
      };
    }

    const existingPending = targetCourse
      ? (db.enrollmentRequests || []).find(
        r => r.studentId === activeUser.id && r.courseId === targetCourse.id && r.status === 'pending'
      )
      : undefined;
    if (targetCourse && existingPending) {
      return {
        success: false,
        message: `You already have a pending join request for ${targetCourse.code}.`,
        course: targetCourse
      };
    }

    // Server is the source of truth for the code (the course may not be in
    // the local cache); the success shape stays { success, message, course? }.
    try {
      const { request } = await apiFetch<{ request: EnrollmentRequest }>('/api/courses/join', {
        method: 'POST',
        body: { code: cleanCode }
      });
      setDb(prev => mergeEnrollmentRequest(prev, request));

      return {
        success: true,
        message: targetCourse
          ? `Join request sent for ${targetCourse.code} - ${targetCourse.title}. Waiting for instructor approval.`
          : `Join request sent for code "${cleanCode}". Waiting for instructor approval.`,
        course: targetCourse
      };
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'course_not_found' || err.status === 404)) {
        return { success: false, message: `No course found matching code "${cleanCode}". Please verify with your instructor.` };
      }
      const message = err instanceof ApiError ? err.message : 'Failed to send join request.';
      setLastError(message);
      return { success: false, message };
    }
  };

  const regenerateCourseJoinCode = async (courseId: string): Promise<string> => {
    const targetCourse = db.courses.find(c => c.id === courseId);
    const newCode = generateCourseJoinCode(db.courses, targetCourse?.code);
    // Client generates the code string; the server only persists it via PATCH.
    try {
      const { course } = await apiFetch<{ course: Course }>(
        `/api/courses/${encodeURIComponent(courseId)}`,
        { method: 'PATCH', body: { joinCode: newCode } }
      );
      const resolved = course.joinCode || newCode;
      setDb(prev => ({
        ...prev,
        courses: prev.courses.map(c => (c.id === courseId ? { ...c, joinCode: resolved } : c))
      }));
      return resolved;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to regenerate join code.';
      setLastError(message);
      showAlert(message, 'Regenerate Failed');
      return targetCourse?.joinCode || newCode;
    }
  };

  const updateCourseSyllabus = async (courseId: string, syllabus: OfficialSyllabusData): Promise<void> => {
    const boundSyllabus: OfficialSyllabusData = {
      ...syllabus,
      courseId
    };
    const instructorFromSyllabus = boundSyllabus.facultyMembers?.[0]?.name;
    // Server stores syllabus as a JSON string (String? column) — stringify
    // client-side; the cache keeps the parsed object.
    try {
      await apiFetch<{ course: Course }>(
        `/api/courses/${encodeURIComponent(courseId)}`,
        { method: 'PATCH', body: { syllabus: JSON.stringify(boundSyllabus) } }
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update syllabus.';
      setLastError(message);
      showAlert(message, 'Update Syllabus Failed');
      throw err;
    }
    setDb(prev => ({
      ...prev,
      courses: prev.courses.map(c => (c.id === courseId ? {
        ...c,
        syllabus: boundSyllabus,
        ...(instructorFromSyllabus ? { instructorName: instructorFromSyllabus } : {})
      } : c))
    }));
  };

  const removeCourseSyllabus = async (courseId: string): Promise<void> => {
    // Server accepts `syllabus: null` as CLEAR (sets the column NULL).
    try {
      await apiFetch<{ course: Course }>(
        `/api/courses/${encodeURIComponent(courseId)}`,
        { method: 'PATCH', body: { syllabus: null } }
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to remove syllabus.';
      setLastError(message);
      showAlert(message, 'Remove Syllabus Failed');
      throw err;
    }
    setDb(prev => ({
      ...prev,
      courses: prev.courses.map(c => (c.id === courseId ? { ...c, syllabus: null } : c))
    }));
  };

  const updateCourseGradingTerms = async (courseId: string, gradingTerms: TermId[] | null): Promise<void> => {
    // Server stores the override as a JSON string (null clears to auto-detect);
    // the array/null is sent verbatim and the response row is re-normalized.
    try {
      const { course } = await apiFetch<{ course: Course }>(
        `/api/courses/${encodeURIComponent(courseId)}`,
        { method: 'PATCH', body: { gradingTerms } }
      );
      const normalized = normalizeCourseSyllabus(course);
      setDb(prev => ({
        ...prev,
        courses: prev.courses.map(c => (c.id === courseId ? normalized : c))
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update grading terms.';
      setLastError(message);
      showAlert(message, 'Update Grading Terms Failed');
      throw err;
    }
  };

  const setGradesReleased = async (courseId: string, term: TermId, released: boolean): Promise<void> => {
    const prev = db.courses.find(c => c.id === courseId)?.gradesReleased;
    const optimistic = { ...(prev || {}), [term]: released };
    setDb(prevDb => ({
      ...prevDb,
      courses: prevDb.courses.map(c => (c.id === courseId ? { ...c, gradesReleased: optimistic } : c))
    }));
    try {
      const { course } = await apiFetch<{ course: Course }>(
        `/api/courses/${encodeURIComponent(courseId)}/grades-release`,
        { method: 'PATCH', body: { term, released } }
      );
      const normalized = normalizeCourseSyllabus(course);
      setDb(prevDb => ({
        ...prevDb,
        courses: prevDb.courses.map(c => (c.id === courseId ? normalized : c))
      }));
      showAlert({
        title: released ? 'Grades Released' : 'Grades Un-released',
        message: `${term} grades are now ${released ? 'visible to students' : 'hidden from students'}.`,
        type: 'success'
      });
    } catch (err) {
      setDb(prevDb => ({
        ...prevDb,
        courses: prevDb.courses.map(c =>
          c.id === courseId ? { ...c, gradesReleased: prev || {} } : c
        )
      }));
      const message = err instanceof ApiError ? err.message : 'Failed to update grade release.';
      setLastError(message);
      showAlert(message, 'Grade Release Failed');
      throw err;
    }
  };

  const importCommonsTemplate = async (templateId: string, targetCourseId: string): Promise<{ success: boolean; message: string }> => {
    // Template ships from the static catalog;
    // the module + blueprint item persist via the modules endpoints.
    const tmpl = commonsTemplates.find(t => t.id === templateId);
    const targetCourse = db.courses.find(c => c.id === targetCourseId);

    if (!tmpl || !targetCourse) {
      return { success: false, message: 'Invalid template or course target' };
    }

    try {
      const newMod = await createModule(targetCourseId, `[Imported] ${tmpl.title}`);
      await addModuleItem(newMod.id, {
        title: `${tmpl.title} Blueprint & Rubric Guidelines`,
        type: 'page',
        content: `${tmpl.description}\n\nAlignment: ${tmpl.chedAlignment}\nTags: ${tmpl.tags.join(', ')}`
      });

      return {
        success: true,
        message: `Successfully imported "${tmpl.title}" into ${targetCourse.code} (${targetCourse.section})!`
      };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to import template.';
      setLastError(message);
      showAlert(message, 'Import Failed');
      return { success: false, message };
    }
  };

  const gradeSubmission = async (
    submissionId: string,
    grade: number,
    rubricScores: Record<string, number>,
    commentText?: string
  ): Promise<void> => {
    // Grade + rubricScores persist via the grade endpoint; feedback text
    // rides the comments endpoint (the grade endpoint would duplicate it).
    try {
      if (!Number.isFinite(grade)) {
        throw new Error('Grade must be a number.');
      }
      const { submission } = await apiFetch<{ submission: any }>(
        `/api/submissions/${encodeURIComponent(submissionId)}/grade`,
        { method: 'POST', body: { grade, rubricScores } }
      );
      let appended: SubmissionComment | null = null;
      if (commentText && commentText.trim()) {
        const { comment } = await apiFetch<{ comment: SubmissionComment }>(
          `/api/submissions/${encodeURIComponent(submissionId)}/comments`,
          { method: 'POST', body: { text: commentText.trim() } }
        );
        appended = normalizeSubmissionComment(comment);
      }
      const graded = normalizeSubmission(submission);
      setDb(prev => ({
        ...prev,
        submissions: prev.submissions.map(sub =>
          sub.id === submissionId
            ? {
                ...graded,
                // Server now echoes persisted rubricScores; fall back to the
                // just-submitted values if the row predates the column.
                rubricScores:
                  graded.rubricScores && Object.keys(graded.rubricScores).length > 0
                    ? graded.rubricScores
                    : rubricScores,
                comments: [...(sub.comments ?? []), ...(appended ? [appended] : [])],
              }
            : sub
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to grade submission.';
      setLastError(message);
      showAlert(message, 'Grade Submission Failed');
      throw err;
    }
  };

  const upsertManualExamGrade = async (examId: string, studentId: string, grade: number): Promise<void> => {
    try {
      if (!Number.isFinite(grade) || grade < 0) {
        throw new Error('Grade must be a non-negative number.');
      }
      const { submission } = await apiFetch<{ submission: unknown }>(
        `/api/exams/${encodeURIComponent(examId)}/manual-grade`,
        { method: 'POST', body: { studentId, grade } }
      );
      const merged = normalizeSubmission(submission);
      setDb(prev => {
        const idx = (prev.submissions || []).findIndex(
          s => s.activityKey === merged.activityKey && s.studentId === merged.studentId
        );
        if (idx >= 0) {
          const updated = [...prev.submissions];
          updated[idx] = merged;
          return { ...prev, submissions: updated };
        }
        return { ...prev, submissions: [merged, ...prev.submissions] };
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save manual exam grade.';
      setLastError(message);
      showAlert(message, 'Manual Grade Failed');
      throw err;
    }
  };

  // Contract for the 5th param: `answers` is for question-set activities
  // only. When `answers` is provided the question-set submit path is used;
  // otherwise the cached `format` decides — a cache MISS (unknown format)
  // takes the question-set `/:id/submit` path, never the classic path, so a
  // not-yet-hydrated question-set activity can never be mis-submitted as a
  // classic file/text row. Only a positively-known `classic` format uses
  // `POST /api/activities/:id/submissions`.
  const submitActivity = async (
    activityId: string,
    submissionType: 'file' | 'online_text',
    content?: string,
    fileName?: string,
    answers?: Record<string, string>
  ): Promise<void> => {
    const cached = dbRef.current.activities?.find(a => a.id === activityId);
    const useQuestionSetPath = answers !== undefined || cached?.format !== 'classic';
    try {
      const { submission } = useQuestionSetPath
        ? await apiFetch<{ submission: any }>(
            `/api/activities/${encodeURIComponent(activityId)}/submit`,
            { method: 'POST', body: { answers: answers ?? {} } }
          )
        : await apiFetch<{ submission: any }>(
            `/api/activities/${encodeURIComponent(activityId)}/submissions`,
            {
              method: 'POST',
              body: {
                submissionType,
                ...(content !== undefined ? { content } : {}),
                ...(fileName !== undefined ? { fileName } : {})
              }
            }
          );
      const merged = normalizeSubmission(submission);
      setDb(prev => {
        const idx = prev.submissions.findIndex(
          s => merged.activityKey !== undefined && s.activityKey === merged.activityKey && s.studentId === merged.studentId
        );
        if (idx >= 0) {
          const updated = [...prev.submissions];
          updated[idx] = merged;
          return { ...prev, submissions: updated };
        }
        return { ...prev, submissions: [merged, ...prev.submissions] };
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to submit activity.';
      setLastError(message);
      showAlert(message, 'Submit Activity Failed');
      throw err;
    }
  };

  const toggleModulePublish = async (moduleId: string): Promise<void> => {
    const current = (db.modules || []).find(m => m.id === moduleId);
    try {
      const { module } = await apiFetch<{ module: Module }>(
        `/api/modules/${encodeURIComponent(moduleId)}`,
        { method: 'PATCH', body: { published: !(current?.published ?? false) } }
      );
      setDb(prev => ({
        ...prev,
        modules: (prev.modules || []).map(m =>
          m.id === moduleId
            ? { ...m, ...module, items: m.items, comments: m.comments }
            : m
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle publish.';
      setLastError(message);
      showAlert(message, 'Publish Failed');
      throw err;
    }
  };

  const toggleItemCompletion = async (moduleId: string, itemId: string): Promise<void> => {
    const current = (db.modules || []).find(m => m.id === moduleId)?.items.find(i => i.id === itemId);
    try {
      const { item } = await apiFetch<{ item: ModuleItem }>(
        `/api/modules/${encodeURIComponent(moduleId)}/items/${encodeURIComponent(itemId)}`,
        { method: 'PATCH', body: { completed: !(current?.completed ?? false) } }
      );
      setDb(prev => ({
        ...prev,
        modules: (prev.modules || []).map(mod =>
          mod.id === moduleId
            ? { ...mod, items: mod.items.map(it => (it.id === itemId ? { ...it, ...(item as ModuleItem) } : it)) }
            : mod
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle completion.';
      setLastError(message);
      showAlert(message, 'Completion Failed');
      throw err;
    }
  };

  const addModuleComment = async (moduleId: string, content: string, parentId?: string): Promise<void> => {
    if (!content.trim()) return;
    // Server creates the reply notification inline (no client call needed).
    try {
      const { comment } = await apiFetch<{ comment: ModuleComment }>(
        `/api/modules/${encodeURIComponent(moduleId)}/comments`,
        { method: 'POST', body: parentId ? { content: content.trim(), parentId } : { content: content.trim() } }
      );
      setDb(prev => ({
        ...prev,
        modules: prev.modules.map(mod =>
          mod.id === moduleId
            ? { ...mod, comments: [...(mod.comments || []), comment] }
            : mod
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to post comment.';
      setLastError(message);
      showAlert(message, 'Comment Failed');
      throw err;
    }
  };

  const editModuleComment = async (moduleId: string, commentId: string, newContent: string): Promise<void> => {
    if (!newContent.trim()) return;
    try {
      const { comment } = await apiFetch<{ comment: ModuleComment }>(
        `/api/modules/${encodeURIComponent(moduleId)}/comments/${encodeURIComponent(commentId)}`,
        { method: 'PATCH', body: { content: newContent.trim() } }
      );
      setDb(prev => ({
        ...prev,
        modules: prev.modules.map(mod =>
          mod.id === moduleId
            ? { ...mod, comments: (mod.comments || []).map(c => (c.id === commentId ? comment : c)) }
            : mod
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to edit comment.';
      setLastError(message);
      showAlert(message, 'Edit Comment Failed');
      throw err;
    }
  };

  const deleteModuleComment = async (moduleId: string, commentId: string): Promise<void> => {
    // Server hard-deletes the row, so the cache drops it (replacing the old
    // client soft-delete placeholder).
    try {
      await apiFetch<{ ok: true }>(
        `/api/modules/${encodeURIComponent(moduleId)}/comments/${encodeURIComponent(commentId)}`,
        { method: 'DELETE' }
      );
      setDb(prev => ({
        ...prev,
        modules: prev.modules.map(mod =>
          mod.id === moduleId
            ? { ...mod, comments: (mod.comments || []).filter(c => c.id !== commentId) }
            : mod
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete comment.';
      setLastError(message);
      showAlert(message, 'Delete Comment Failed');
      throw err;
    }
  };

  const toggleLikeModuleComment = async (moduleId: string, commentId: string): Promise<void> => {
    try {
      const { likes, liked } = await apiFetch<{ likes: number; liked: boolean }>(
        `/api/modules/${encodeURIComponent(moduleId)}/comments/${encodeURIComponent(commentId)}/like`,
        { method: 'POST' }
      );
      setDb(prev => ({
        ...prev,
        modules: prev.modules.map(mod => {
          if (mod.id === moduleId) {
            return {
              ...mod,
              comments: (mod.comments || []).map(c => {
                if (c.id === commentId) {
                  const likedBy = liked
                    ? [...new Set([...(c.likedBy || []), activeUser.id])]
                    : (c.likedBy || []).filter(id => id !== activeUser.id);
                  return { ...c, likedBy, likes };
                }
                return c;
              })
            };
          }
          return mod;
        })
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle like.';
      setLastError(message);
      showAlert(message, 'Like Failed');
      throw err;
    }
  };

  const sendMessage = async (
    recipientId: string,
    subject: string,
    body: string,
    courseId?: string,
    attachmentName?: string,
    attachmentSize?: string,
    isGroupParam?: boolean,
    groupIdParam?: string
  ): Promise<void> => {
    const matchedGroup = (db.chatGroups || []).find(g => g.id === (groupIdParam || recipientId));
    const isGroup = isGroupParam !== undefined ? isGroupParam : !!matchedGroup;
    // Server persists recipient/subject/body/courseId (+ groupId for group
    // rows); attachment metadata rides in the cache only (no server field).
    try {
      const { message } = await apiFetch<{ message: Message }>('/api/messages', {
        method: 'POST',
        body: {
          recipientId,
          subject,
          body,
          ...(courseId !== undefined ? { courseId } : {}),
          ...(isGroup && matchedGroup ? { groupId: matchedGroup.id } : {}),
        },
      });
      const merged: Message = {
        ...message,
        ...(attachmentName !== undefined ? { attachmentName } : {}),
        ...(attachmentSize !== undefined ? { attachmentSize } : {}),
      };
      setDb(prev => ({ ...prev, messages: [merged, ...(prev.messages || [])] }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to send message.';
      setLastError(message);
      showAlert(message, 'Send Message Failed');
      throw err;
    }
  };

  const createChatGroup = async (name: string, memberIds: string[], courseId?: string): Promise<ChatGroup> => {
    try {
      const { group } = await apiFetch<{ group: any }>('/api/groups', {
        method: 'POST',
        body: {
          name: name.trim() || 'New Study Group',
          memberIds,
          ...(courseId !== undefined ? { courseId } : {}),
        },
      });
      // Server returns { ...group, members } — rehydrate the memberIds array.
      const merged: ChatGroup = {
        ...(group as ChatGroup),
        memberIds: Array.isArray((group as any).memberIds)
          ? (group as any).memberIds
          : Array.isArray((group as any).members)
            ? (group as any).members.map((m: any) => m.userId)
            : Array.from(new Set([activeUser.id, ...memberIds])),
      };
      // Welcome message rides the group-messages endpoint (client single-row
      // group convention); best-effort so group creation still succeeds.
      try {
        const { message } = await apiFetch<{ message: Message }>(
          `/api/groups/${encodeURIComponent(merged.id)}/messages`,
          {
            method: 'POST',
            body: {
              subject: `Welcome to ${merged.name}`,
              body: `Group created by ${activeUser.name}. Welcome everyone!`,
            },
          }
        );
        setDb(prev => ({
          ...prev,
          chatGroups: [merged, ...(prev.chatGroups || [])],
          messages: [message, ...(prev.messages || [])]
        }));
      } catch {
        setDb(prev => ({
          ...prev,
          chatGroups: [merged, ...(prev.chatGroups || [])]
        }));
      }
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create group.';
      setLastError(message);
      showAlert(message, 'Create Group Failed');
      throw err;
    }
  };

  const markThreadAsRead = async (partnerId: string): Promise<void> => {
    const isGroup = (db.chatGroups || []).some(g => g.id === partnerId);
    setDb(prev => ({
      ...prev,
      messages: (prev.messages || []).map(m => {
        if (isGroup) {
          if ((m.groupId === partnerId || m.recipientId === partnerId) && m.senderId !== activeUser.id && !m.read) {
            return { ...m, read: true };
          }
          return m;
        }
        if (m.senderId === partnerId && m.recipientId === activeUser.id && !m.read) {
          return { ...m, read: true };
        }
        return m;
      })
    }));
    // Read path: stay silent (no modal) on failure; cache already updated.
    try {
      await apiFetch<{ updated: number }>('/api/messages/thread/read', {
        method: 'POST',
        body: isGroup ? { groupId: partnerId } : { partnerId },
      });
    } catch (err) {
      setLastError(err instanceof ApiError ? err.message : 'Failed to mark thread read.');
    }
  };

  const toggleMessageReaction = async (messageId: string, reaction: string): Promise<void> => {
    // Toggle-off: clicking the active emoji DELETEs the reaction, otherwise
    // POST sets it. The cache follows the returned row (server truth wins).
    const current = (db.messages || []).find(m => m.id === messageId)?.reaction;
    const clearing = current === reaction;
    try {
      const { message } = clearing
        ? await apiFetch<{ message: Message }>(
          `/api/messages/${encodeURIComponent(messageId)}/react`,
          { method: 'DELETE' }
        )
        : await apiFetch<{ message: Message }>(
          `/api/messages/${encodeURIComponent(messageId)}/react`,
          { method: 'POST', body: { reaction } }
        );
      setDb(prev => ({
        ...prev,
        messages: (prev.messages || []).map(m =>
          m.id === messageId ? { ...m, ...(message as Message) } : m
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to react to message.';
      setLastError(message);
      showAlert(message, 'Reaction Failed');
      throw err;
    }
  };

  const bookAdvisingSlot = async (slotId: string): Promise<void> => {
    try {
      const { slot } = await apiFetch<{ slot: AdvisingSlot }>(
        `/api/advising/${encodeURIComponent(slotId)}/book`,
        { method: 'POST' }
      );
      setDb(prev => ({
        ...prev,
        advisingSlots: prev.advisingSlots.map(s => (s.id === slotId ? { ...s, ...(slot as AdvisingSlot) } : s))
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to book advising slot.';
      setLastError(message);
      showAlert(message, 'Booking Failed');
      throw err;
    }
  };

  const createAdvisingSlot = async (date: string, timeSlot: string, location: string): Promise<void> => {
    try {
      const { slot } = await apiFetch<{ slot: AdvisingSlot }>('/api/advising', {
        method: 'POST',
        body: { date, timeSlot, location }
      });
      setDb(prev => ({
        ...prev,
        advisingSlots: [...prev.advisingSlots, slot]
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create advising slot.';
      setLastError(message);
      showAlert(message, 'Create Slot Failed');
      throw err;
    }
  };

  const addCalendarEvent = async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    try {
      const { event: created } = await apiFetch<{ event: CalendarEvent }>('/api/calendar', {
        method: 'POST',
        body: {
          title: event.title,
          date: event.date,
          ...(event.time !== undefined ? { time: event.time } : {}),
          ...(event.courseId !== undefined ? { courseId: event.courseId } : {}),
          ...(event.courseCode !== undefined ? { courseCode: event.courseCode } : {}),
          ...(event.type !== undefined ? { type: event.type } : {}),
          ...(event.description !== undefined ? { description: event.description } : {}),
          ...(event.startAt !== undefined ? { startAt: event.startAt } : {}),
          ...(event.endAt !== undefined ? { endAt: event.endAt } : {}),
          ...(event.isAllDay !== undefined ? { isAllDay: event.isAllDay } : {}),
          ...(event.colorHex !== undefined ? { colorHex: event.colorHex } : {}),
          ...(event.location !== undefined ? { location: event.location } : {}),
          ...(event.meetingPlatform !== undefined ? { meetingPlatform: event.meetingPlatform } : {}),
          ...(event.meetingId !== undefined ? { meetingId: event.meetingId } : {}),
          ...(event.meetingPasscode !== undefined ? { meetingPasscode: event.meetingPasscode } : {}),
          ...(event.meetingJoinUrl !== undefined ? { meetingJoinUrl: event.meetingJoinUrl } : {}),
        }
      });
      setDb(prev => ({
        ...prev,
        calendarEvents: [...prev.calendarEvents, created]
      }));
      return created;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create event.';
      setLastError(message);
      showAlert(message, 'Create Event Failed');
      throw err;
    }
  };

  const updateCalendarEvent = async (id: string, updates: Partial<CalendarEvent>): Promise<void> => {
    const body: Record<string, string | boolean> = {};
    const stringFields = [
      'title', 'date', 'time', 'courseId', 'courseCode', 'type', 'description',
      'startAt', 'endAt', 'colorHex', 'location', 'meetingPlatform',
      'meetingId', 'meetingPasscode', 'meetingJoinUrl'
    ] as const;
    for (const key of stringFields) {
      const value = updates[key];
      if (value !== undefined && value !== null) body[key] = value;
    }
    if (updates.isAllDay !== undefined) body.isAllDay = updates.isAllDay;
    try {
      const { event } = await apiFetch<{ event: CalendarEvent }>(
        `/api/calendar/${encodeURIComponent(id)}`,
        { method: 'PATCH', body }
      );
      setDb(prev => ({
        ...prev,
        calendarEvents: prev.calendarEvents.map(evt =>
          evt.id === id ? { ...evt, ...(event as CalendarEvent) } : evt
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update event.';
      setLastError(message);
      showAlert(message, 'Update Event Failed');
      throw err;
    }
  };

  const deleteCalendarEvent = async (id: string): Promise<void> => {
    try {
      await apiFetch<{ ok: true }>(`/api/calendar/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      setDb(prev => ({
        ...prev,
        calendarEvents: prev.calendarEvents.filter(evt => evt.id !== id)
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete event.';
      setLastError(message);
      showAlert(message, 'Delete Event Failed');
      throw err;
    }
  };

  // ==========================================
  // ANNOUNCEMENTS CRUD
  // ==========================================

  const createAnnouncement = async (data: Partial<Announcement>): Promise<Announcement> => {
    const courseId = data.courseId || activeCourseId || 'crs-cmsc131';
    // Server persists title/content/sectionId/attachments (+ files them);
    // client-only flags (pinned, allowComments, allowLiking, delayedUntil,
    // usersMustPostBeforeReplies) ride along in the cache.
    try {
      const { announcement } = await apiFetch<{ announcement: Announcement }>(
        `/api/courses/${encodeURIComponent(courseId)}/announcements`,
        {
          method: 'POST',
          body: {
            title: data.title || 'Untitled Announcement',
            content: data.content || '',
            ...(data.sectionId !== undefined ? { sectionId: data.sectionId } : {}),
            ...((data.attachments || []).length > 0
              ? {
                attachments: (data.attachments || []).map(a => ({
                  name: a.name,
                  size: a.size,
                  ...(a.url !== undefined ? { url: a.url } : {})
                }))
              }
              : {})
          }
        }
      );
      const merged: Announcement = {
        ...announcement,
        courseId,
        sectionId: data.sectionId || (announcement as Announcement).sectionId || 'all',
        sectionRestriction: data.sectionRestriction || 'All Sections',
        delayedUntil: data.delayedUntil,
        allowComments: data.allowComments ?? true,
        usersMustPostBeforeReplies: data.usersMustPostBeforeReplies ?? false,
        allowLiking: data.allowLiking ?? true,
        likes: announcement.likes ?? 0,
        likedBy: (announcement as Announcement).likedBy || [],
        pinned: data.pinned ?? false,
        attachments: ((announcement as Announcement).attachments || []).map(a => ({
          name: a.name,
          size: a.size,
          ...(a.url !== undefined && a.url !== null ? { url: a.url } : {})
        })),
        replies: [],
        readBy: [activeUser.id]
      };
      setDb(prev => ({
        ...prev,
        announcements: [merged, ...(prev.announcements || [])]
      }));
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create announcement.';
      setLastError(message);
      showAlert(message, 'Create Announcement Failed');
      throw err;
    }
  };

  const deleteAnnouncement = async (id: string): Promise<void> => {
    // No-cascade semantics live server-side (filed CourseFile copies stay).
    try {
      await apiFetch<{ ok: true }>(`/api/announcements/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      setDb(prev => ({
        ...prev,
        announcements: (prev.announcements || []).filter(a => a.id !== id)
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete announcement.';
      setLastError(message);
      showAlert(message, 'Delete Announcement Failed');
      throw err;
    }
  };

  const togglePinAnnouncement = async (id: string): Promise<void> => {
    const current = (db.announcements || []).find(a => a.id === id);
    try {
      const { announcement } = await apiFetch<{ announcement: Announcement }>(
        `/api/announcements/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: { pinned: !(current?.pinned ?? false) } }
      );
      setDb(prev => ({
        ...prev,
        announcements: (prev.announcements || []).map(a =>
          a.id === id ? { ...a, ...(announcement as Announcement), replies: a.replies } : a
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle pin.';
      setLastError(message);
      showAlert(message, 'Pin Failed');
      throw err;
    }
  };

  const toggleLikeAnnouncement = async (id: string): Promise<void> => {
    try {
      const { likes, liked } = await apiFetch<{ likes: number; liked: boolean }>(
        `/api/announcements/${encodeURIComponent(id)}/like`,
        { method: 'POST' }
      );
      setDb(prev => ({
        ...prev,
        announcements: (prev.announcements || []).map(a => {
          if (a.id !== id) return a;
          const likedBy = liked
            ? [...new Set([...(a.likedBy || []), activeUser.id])]
            : (a.likedBy || []).filter(uid => uid !== activeUser.id);
          return { ...a, likedBy, likes };
        })
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle like.';
      setLastError(message);
      showAlert(message, 'Like Failed');
      throw err;
    }
  };

  const addAnnouncementReply = async (announcementId: string, content: string, parentId?: string): Promise<void> => {
    // Server notifies the announcement author inline (no client call needed).
    try {
      const { reply } = await apiFetch<{ reply: AnnouncementReply }>(
        `/api/announcements/${encodeURIComponent(announcementId)}/replies`,
        { method: 'POST', body: parentId ? { content, parentId } : { content } }
      );
      setDb(prev => ({
        ...prev,
        announcements: (prev.announcements || []).map(a =>
          a.id === announcementId
            ? { ...a, replies: [...a.replies, reply] }
            : a
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to post reply.';
      setLastError(message);
      showAlert(message, 'Reply Failed');
      throw err;
    }
  };

  const markAnnouncementRead = async (id: string): Promise<void> => {
    try {
      await apiFetch<{ ok: true }>(`/api/announcements/${encodeURIComponent(id)}/read`, {
        method: 'POST'
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to mark announcement read.';
      setLastError(message);
      // Read path: stay silent (no modal), still update the local cache.
    }
    setDb(prev => ({
      ...prev,
      announcements: (prev.announcements || []).map(a => {
        if (a.id !== id) return a;
        const readBy = a.readBy || [];
        if (readBy.includes(activeUser.id)) return a;
        return { ...a, readBy: [...readBy, activeUser.id] };
      })
    }));
  };

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  const getUnreadNotificationCount = (userId: string, type?: string): number => {
    const userNotifications = (notifications || [])
      .filter(n => n.recipientId === userId && !n.read);

    if (!type) return userNotifications.length;

    return userNotifications.filter(n => n.type === type).length;
  };

  const markNotificationRead = async (id: string): Promise<void> => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );

    setDb(prev => ({
      ...prev,
      notifications: (prev.notifications || []).map(n =>
        n.id === id ? { ...n, read: true } : n
      )
    }));

    // Read path: stay silent (no modal) on failure; cache already updated.
    try {
      await apiFetch<{ notification: Notification }>(
        `/api/notifications/${encodeURIComponent(id)}/read`,
        { method: 'POST' }
      );
    } catch (err) {
      setLastError(err instanceof ApiError ? err.message : 'Failed to mark notification read.');
    }
  };

  const markAllNotificationsRead = async (userId: string, type?: string): Promise<void> => {
    setNotifications(prev =>
      prev.map(n =>
        n.recipientId === userId && (!type || n.type === type) ? { ...n, read: true } : n
      )
    );

    setDb(prev => ({
      ...prev,
      notifications: (prev.notifications || []).map(n =>
        n.recipientId === userId && (!type || n.type === type) ? { ...n, read: true } : n
      )
    }));

    // Read path: stay silent (no modal) on failure; cache already updated.
    // The server marks the caller's own rows (userId is a client-side filter).
    try {
      await apiFetch<{ updated: number }>('/api/notifications/read-all', {
        method: 'POST',
        body: type ? { type } : {}
      });
    } catch (err) {
      setLastError(err instanceof ApiError ? err.message : 'Failed to mark notifications read.');
    }
  };

  const markTabVisited = (tab: string, courseId?: string) => {
    const key = courseId ? `${tab}:${courseId}` : tab;
    const stamp = new Date().toISOString();
    setDb(prev => ({
      ...prev,
      users: prev.users.map(u =>
        u.id === activeUser.id
          ? { ...u, lastVisitedAt: { ...(u.lastVisitedAt || {}), [key]: stamp } }
          : u
      )
    }));
    // Badges read activeUser.lastVisitedAt (from currentUser, not db.users) —
    // sync it so the badge clears instantly without a page reload.
    setCurrentUser(prev =>
      prev && prev.id === activeUser.id
        ? { ...prev, lastVisitedAt: { ...(prev.lastVisitedAt || {}), [key]: stamp } }
        : prev
    );
  };

  const markModuleCommentsRead = async (moduleId: string): Promise<void> => {
    // Mark matching cached rows locally, then mark each server-side per id
    // (no bulk/type call — client semantics clear only this module's rows).
    const targets = (notifications || []).filter(
      n => n.recipientId === activeUser.id && n.relatedId === moduleId && !n.read
    );
    setNotifications(prev =>
      prev.map(n =>
        n.recipientId === activeUser.id && n.relatedId === moduleId && !n.read
          ? { ...n, read: true }
          : n
      )
    );
    setDb(prev => ({
      ...prev,
      notifications: (prev.notifications || []).map(n =>
        n.recipientId === activeUser.id && n.relatedId === moduleId && !n.read
          ? { ...n, read: true }
          : n
      )
    }));
    await Promise.allSettled(
      targets.map(n =>
        apiFetch<{ notification: Notification }>(
          `/api/notifications/${encodeURIComponent(n.id)}/read`,
          { method: 'POST' }
        )
      )
    );
  };

  const getNotifications = (userId: string, type?: string, limit?: number): Notification[] => {
    const userNotifications = (notifications || [])
      .filter(n => n.recipientId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (type) {
      return userNotifications.filter(n => n.type === type).slice(0, limit);
    }

    return userNotifications.slice(0, limit);
  };

  // ==========================================
  // DISCUSSIONS CRUD
  // ==========================================

  const createDiscussion = async (data: Partial<Discussion>): Promise<Discussion> => {
    const courseId = data.courseId || activeCourseId || 'crs-cmsc131';
    // Server persists title/prompt; client-only flags ride along in cache.
    try {
      const { discussion } = await apiFetch<{ discussion: Discussion }>(
        `/api/courses/${encodeURIComponent(courseId)}/discussions`,
        {
          method: 'POST',
          body: {
            title: data.title || 'Untitled Discussion Topic',
            prompt: data.prompt || ''
          }
        }
      );
      const merged: Discussion = {
        ...discussion,
        courseId,
        isGraded: data.isGraded ?? false,
        pointsPossible: data.pointsPossible,
        dueDate: data.dueDate,
        pinned: (discussion as Discussion).pinned ?? data.pinned ?? false,
        locked: (discussion as Discussion).locked ?? data.locked ?? false,
        usersMustPostBeforeReplies: data.usersMustPostBeforeReplies ?? false,
        groupActivity: data.groupActivity || 'All Students',
        replies: []
      };
      setDb(prev => ({
        ...prev,
        discussions: [merged, ...(prev.discussions || [])]
      }));
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create discussion.';
      setLastError(message);
      showAlert(message, 'Create Discussion Failed');
      throw err;
    }
  };

  const deleteDiscussion = async (id: string): Promise<void> => {
    try {
      await apiFetch<{ ok: true }>(`/api/discussions/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      setDb(prev => ({
        ...prev,
        discussions: (prev.discussions || []).filter(d => d.id !== id)
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete discussion.';
      setLastError(message);
      showAlert(message, 'Delete Discussion Failed');
      throw err;
    }
  };

  const togglePinDiscussion = async (id: string): Promise<void> => {
    const current = (db.discussions || []).find(d => d.id === id);
    try {
      const { discussion } = await apiFetch<{ discussion: Discussion }>(
        `/api/discussions/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: { pinned: !(current?.pinned ?? false) } }
      );
      setDb(prev => ({
        ...prev,
        discussions: (prev.discussions || []).map(d =>
          d.id === id ? { ...d, ...(discussion as Discussion), replies: d.replies } : d
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle pin.';
      setLastError(message);
      showAlert(message, 'Pin Failed');
      throw err;
    }
  };

  const toggleLockDiscussion = async (id: string): Promise<void> => {
    const current = (db.discussions || []).find(d => d.id === id);
    try {
      const { discussion } = await apiFetch<{ discussion: Discussion }>(
        `/api/discussions/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: { locked: !(current?.locked ?? false) } }
      );
      setDb(prev => ({
        ...prev,
        discussions: (prev.discussions || []).map(d =>
          d.id === id ? { ...d, ...(discussion as Discussion), replies: d.replies } : d
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle lock.';
      setLastError(message);
      showAlert(message, 'Lock Failed');
      throw err;
    }
  };

  const addDiscussionReply = async (
    discussionId: string,
    content: string,
    parentId?: string,
    attachment?: { name: string; url?: string }
  ): Promise<void> => {
    // Server has no reply-attachment field — the attachment rides in cache only.
    // Server notifies the discussion author inline (no client call needed).
    try {
      const { reply } = await apiFetch<{ reply: DiscussionReply }>(
        `/api/discussions/${encodeURIComponent(discussionId)}/replies`,
        {
          method: 'POST',
          body: {
            content,
            ...(parentId !== undefined ? { parentId } : {})
          }
        }
      );
      const merged: DiscussionReply = attachment
        ? { ...reply, attachments: [attachment] }
        : reply;
      setDb(prev => ({
        ...prev,
        discussions: (prev.discussions || []).map(d =>
          d.id === discussionId
            ? { ...d, replies: [...d.replies, merged] }
            : d
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to post reply.';
      setLastError(message);
      showAlert(message, 'Reply Failed');
      throw err;
    }
  };

  const toggleLikeDiscussionReply = async (discussionId: string, replyId: string): Promise<void> => {
    try {
      const { likes, liked } = await apiFetch<{ likes: number; liked: boolean }>(
        `/api/discussions/${encodeURIComponent(discussionId)}/replies/${encodeURIComponent(replyId)}/like`,
        { method: 'POST' }
      );
      setDb(prev => ({
        ...prev,
        discussions: (prev.discussions || []).map(d => {
          if (d.id !== discussionId) return d;
          return {
            ...d,
            replies: d.replies.map(r => {
              if (r.id !== replyId) return r;
              const likedBy = liked
                ? [...new Set([...(r.likedBy || []), activeUser.id])]
                : (r.likedBy || []).filter(uid => uid !== activeUser.id);
              return { ...r, likedBy, likes };
            })
          };
        })
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle like.';
      setLastError(message);
      showAlert(message, 'Like Failed');
      throw err;
    }
  };

  // ==========================================
  // COURSE FILES & FOLDERS CRUD
  // ==========================================

  const createCourseFolder = async (courseId: string, name: string, parentId?: string | null, autoKey?: string): Promise<CourseFolder> => {
    try {
      const { folder } = await apiFetch<{ folder: CourseFolder }>(
        `/api/courses/${encodeURIComponent(courseId)}/folders`,
        {
          method: 'POST',
          body: {
            name,
            ...(parentId ? { parentId } : {}),
          },
        }
      );
      // Server stores name/parent only — autoKey stays a client cache overlay.
      const merged: CourseFolder = autoKey ? { ...folder, autoKey } : folder;
      setDb(prev => ({
        ...prev,
        courseFolders: [...(prev.courseFolders || []), merged]
      }));
      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create folder.';
      setLastError(message);
      showAlert(message, 'Create Folder Failed');
      throw err;
    }
  };

  const uploadCourseFile = async (
    fileData: Partial<CourseFile> & { rawFile?: File | Blob; area?: string; moduleId?: string; moduleTitle?: string }
  ): Promise<CourseFile> => {
    const courseId = fileData.courseId || activeCourseId || 'crs-cmsc131';
    // Metadata-only calls (no raw bytes) go to the JSON files endpoint —
    // no Blob placeholders anywhere. Real bytes ride the multipart upload.
    if (!fileData.rawFile) {
      try {
        const body: Record<string, unknown> = { name: fileData.name };
        if (fileData.url !== undefined) body.url = fileData.url;
        if (fileData.fileUrl !== undefined) body.fileUrl = fileData.fileUrl;
        if (fileData.size !== undefined) body.size = fileData.size;
        if (fileData.formattedSize !== undefined) body.formattedSize = fileData.formattedSize;
        if (fileData.type !== undefined) body.type = fileData.type;
        if (fileData.visibility !== undefined) body.visibility = fileData.visibility;
        if (fileData.folderId !== undefined) body.folderId = fileData.folderId;
        if (fileData.area !== undefined) body.sourceArea = fileData.area;
        if (fileData.moduleId !== undefined) body.sourceId = fileData.moduleId;
        if (fileData.content !== undefined) body.content = fileData.content;
        const { file } = await apiFetch<{ file: CourseFile }>(
          `/api/courses/${encodeURIComponent(courseId)}/files`,
          { method: 'POST', body }
        );
        setDb(prev => ({
          ...prev,
          courseFiles: [...(prev.courseFiles || []), file]
        }));
        return file;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to upload file.';
        setLastError(message);
        showAlert(message, 'Upload File Failed');
        throw err;
      }
    }
    // The files endpoint is multipart (multer single `file`) — apiFetch is
    // JSON-only, so this posts FormData directly with the auth token.
    const form = new FormData();
    form.append('file', fileData.rawFile, fileData.name || 'uploaded_asset.pdf');
    if (fileData.folderId) form.append('folderId', fileData.folderId);
    if (fileData.area) {
      form.append('area', fileData.area);
      if (fileData.moduleId) form.append('moduleId', fileData.moduleId);
      if (fileData.moduleTitle) form.append('moduleTitle', fileData.moduleTitle);
    }
    form.append('visibility', fileData.visibility || 'published');
    try {
      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/files/upload`, {
        method: 'POST',
        headers,
        body: form,
      });
      const data = (await res.json().catch(() => null)) as { file?: CourseFile; error?: { code?: string; message?: string } } | null;
      if (!res.ok || !data?.file) {
        throw new ApiError(res.status, data?.error?.code || 'request_failed', data?.error?.message || `Upload failed (${res.status}).`);
      }
      setDb(prev => ({
        ...prev,
        courseFiles: [...(prev.courseFiles || []), data.file as CourseFile]
      }));
      return data.file as CourseFile;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to upload file.';
      setLastError(message);
      showAlert(message, 'Upload File Failed');
      throw err;
    }
  };

  const deleteCourseFile = async (fileId: string): Promise<void> => {
    // Virtual ids (mod-file-*, ann-file-*, act-file-*, sub-file-*, quiz-*)
    // are cache-only aggregations from useCourseFiles — they clear the source
    // fields locally. Real CourseFile rows delete via the files endpoint.
    const isVirtual = /^(mod-file-|ann-file-|act-file-|sub-file-|quiz-file-|quiz-q-file-)/.test(fileId);
    if (!isVirtual) {
      try {
        await apiFetch<{ ok: true }>(`/api/files/${encodeURIComponent(fileId)}`, {
          method: 'DELETE'
        });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to delete file.';
        setLastError(message);
        showAlert(message, 'Delete File Failed');
        throw err;
      }
      setDb(prev => ({
        ...prev,
        courseFiles: (prev.courseFiles || []).filter(f => f.id !== fileId)
      }));
      return;
    }
    setDb(prev => {
      // 1. Direct course files
      const updatedCourseFiles = (prev.courseFiles || []).filter(f => f.id !== fileId);

      // 2. Module item file
      let updatedModules = prev.modules;
      if (fileId.startsWith('mod-file-')) {
        const itemId = fileId.replace('mod-file-', '');
        updatedModules = (prev.modules || []).map(m => ({
          ...m,
          items: m.items
            .map(item => {
              if (item.id === itemId) {
                return {
                  ...item,
                  fileName: undefined,
                  fileUrl: undefined,
                  fileSize: undefined,
                  fileType: undefined
                };
              }
              return item;
            })
            .filter(item => !(item.type === 'file' && item.id === itemId))
        }));
      }

      // 3. Announcement attachment
      let updatedAnnouncements = prev.announcements;
      if (fileId.startsWith('ann-file-')) {
        const parts = fileId.split('-');
        const attIdx = Number(parts[parts.length - 1]);
        updatedAnnouncements = (prev.announcements || []).map(ann => {
          if (fileId.includes(ann.id)) {
            return {
              ...ann,
              attachments: (ann.attachments || []).filter((_, idx) => idx !== attIdx)
            };
          }
          return ann;
        });
      }

      // 4. Classic activity handout file (link-key values preserved)
      let updatedActivities = prev.activities;
      if (fileId.startsWith('act-file-')) {
        const actId = fileId.replace('act-file-', '');
        updatedActivities = (prev.activities || []).map(act => {
          if (act.id === actId) {
            return {
              ...act,
              fileName: undefined,
              fileUrl: undefined,
              fileSize: undefined
            };
          }
          return act;
        });
      }

      // 5. Submission file
      let updatedSubmissions = prev.submissions;
      if (fileId.startsWith('sub-file-')) {
        const subId = fileId.replace('sub-file-', '');
        updatedSubmissions = (prev.submissions || []).map(sub => {
          if (sub.id === subId) {
            return {
              ...sub,
              fileName: undefined,
              fileUrl: undefined
            };
          }
          return sub;
        });
      }

      // 6. Quiz reference or question file
      let updatedQuizzes = prev.quizzes;
      if (fileId.startsWith('quiz-file-')) {
        const quizId = fileId.replace('quiz-file-', '');
        updatedQuizzes = (prev.quizzes || []).map(q => {
          if (q.id === quizId) {
            return {
              ...q,
              fileName: undefined,
              fileUrl: undefined,
              fileSize: undefined
            } as any;
          }
          return q;
        });
      } else if (fileId.startsWith('quiz-q-file-')) {
        updatedQuizzes = (prev.quizzes || []).map(q => {
          if (fileId.includes(q.id)) {
            return {
              ...q,
              questions: (q.questions || []).map((question: any) => {
                if (fileId.includes(question.id)) {
                  return {
                    ...question,
                    imageUrl: undefined,
                    imageName: undefined,
                    fileUrl: undefined,
                    fileName: undefined
                  };
                }
                return question;
              })
            };
          }
          return q;
        });
      }

      return {
        ...prev,
        courseFiles: updatedCourseFiles,
        modules: updatedModules,
        announcements: updatedAnnouncements,
        activities: updatedActivities,
        submissions: updatedSubmissions,
        quizzes: updatedQuizzes
      };
    });
  };

  const deleteCourseFolder = async (folderId: string): Promise<void> => {
    try {
      await apiFetch<{ ok: true }>(`/api/folders/${encodeURIComponent(folderId)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete folder.';
      setLastError(message);
      showAlert(message, 'Delete Folder Failed');
      throw err;
    }
    setDb(prev => ({
      ...prev,
      courseFolders: (prev.courseFolders || []).filter(f => f.id !== folderId && f.parentId !== folderId),
      courseFiles: (prev.courseFiles || []).filter(f => f.folderId !== folderId)
    }));
  };

  const updateFileVisibility = async (fileId: string, visibility: 'published' | 'unpublished' | 'restricted'): Promise<void> => {
    try {
      const { file } = await apiFetch<{ file: CourseFile }>(
        `/api/files/${encodeURIComponent(fileId)}`,
        { method: 'PATCH', body: { visibility } }
      );
      setDb(prev => ({
        ...prev,
        courseFiles: (prev.courseFiles || []).map(f =>
          f.id === fileId ? { ...f, ...(file as CourseFile) } : f
        )
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update visibility.';
      setLastError(message);
      showAlert(message, 'Visibility Failed');
      throw err;
    }
  };

  const renameCourseFile = async (fileId: string, newName: string): Promise<void> => {
    // Real CourseFile rows rename via the files endpoint; virtual
    // aggregation ids (mod-file-*, ann-file-*, act-file-*) rename the source
    // fields locally below.
    const isVirtual = /^(mod-file-|ann-file-|act-file-|sub-file-|quiz-file-|quiz-q-file-)/.test(fileId);
    if (!isVirtual) {
      try {
        const { file } = await apiFetch<{ file: CourseFile }>(
          `/api/files/${encodeURIComponent(fileId)}`,
          { method: 'PATCH', body: { name: newName } }
        );
        setDb(prev => ({
          ...prev,
          courseFiles: (prev.courseFiles || []).map(f =>
            f.id === fileId ? { ...f, ...(file as CourseFile) } : f
          )
        }));
        return;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to rename file.';
        setLastError(message);
        showAlert(message, 'Rename Failed');
        throw err;
      }
    }
    setDb(prev => {
      const updatedCourseFiles = (prev.courseFiles || []).map(f =>
        f.id === fileId ? { ...f, name: newName, updatedAt: new Date().toISOString() } : f
      );

      let updatedModules = prev.modules;
      if (fileId.startsWith('mod-file-')) {
        const itemId = fileId.replace('mod-file-', '');
        updatedModules = (prev.modules || []).map(m => ({
          ...m,
          items: m.items.map(item =>
            item.id === itemId ? { ...item, fileName: newName } : item
          )
        }));
      }

      let updatedAnnouncements = prev.announcements;
      if (fileId.startsWith('ann-file-')) {
        const parts = fileId.split('-');
        const attIdx = Number(parts[parts.length - 1]);
        updatedAnnouncements = (prev.announcements || []).map(ann => {
          if (fileId.includes(ann.id)) {
            return {
              ...ann,
              attachments: (ann.attachments || []).map((att, idx) =>
                idx === attIdx ? { ...att, name: newName } : att
              )
            };
          }
          return ann;
        });
      }

      let updatedActivities = prev.activities;
      if (fileId.startsWith('act-file-')) {
        const actId = fileId.replace('act-file-', '');
        updatedActivities = (prev.activities || []).map(act =>
          act.id === actId ? { ...act, fileName: newName } : act
        );
      }

      return {
        ...prev,
        courseFiles: updatedCourseFiles,
        modules: updatedModules,
        announcements: updatedAnnouncements,
        activities: updatedActivities
      };
    });
  };

  const setCourseStudentGrade = async (
    courseId: string,
    studentId: string,
    type: 'midterm' | 'final',
    score: number | null
  ): Promise<void> => {
    try {
      const { grade } = await apiFetch<{ grade: CourseStudentGrade }>(
        `/api/courses/${encodeURIComponent(courseId)}/grades/${encodeURIComponent(studentId)}`,
        { method: 'PUT', body: type === 'midterm' ? { midtermGrade: score } : { finalGrade: score } }
      );
      const merged = normalizeCourseGrade(grade);
      setDb(prev => {
        const existingGrades = prev.courseGrades || [];
        const index = existingGrades.findIndex(
          g => g.courseId === courseId && g.studentId === studentId
        );
        if (index >= 0) {
          const updatedList = [...existingGrades];
          updatedList[index] = merged;
          return { ...prev, courseGrades: updatedList };
        }
        return { ...prev, courseGrades: [...existingGrades, merged] };
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update grade.';
      setLastError(message);
      showAlert(message, 'Update Grade Failed');
      throw err;
    }
  };

  // ==========================================
  // SPR GRADEBOOK STORE
  // ==========================================

  // Lazy per-course fill: config + manual cells (parsed from the course
  // grade rows' sprCells payload — no dedicated cells endpoint exists).
  // Ref-guarded so first-access triggers never refetch in a loop.
  const ensureSPRCourse = async (courseId: string): Promise<void> => {
    if (sprHydratedRef.current.has(courseId)) return;
    sprHydratedRef.current.add(courseId);
    try {
      const [{ config }, gradesRes] = await Promise.all([
        apiFetch<{ config: SPRConfig | null }>(`/api/courses/${encodeURIComponent(courseId)}/spr`),
        apiFetch<{ grades: any[] }>(`/api/courses/${encodeURIComponent(courseId)}/grades`),
      ]);
      const cells: Record<string, SPRStudentCells> = {};
      const grades: CourseStudentGrade[] = [];
      for (const g of gradesRes.grades || []) {
        grades.push(normalizeCourseGrade(g));
        const parsed = parseSPRCells((g as any).sprCells);
        if (parsed && typeof (g as any).studentId === 'string') cells[(g as any).studentId] = parsed;
      }
      setDb(prev => ({
        ...prev,
        sprConfigs: config ? { ...(prev.sprConfigs ?? {}), [courseId]: config } : (prev.sprConfigs ?? {}),
        sprScores: mergeSPRCourseMaps(prev.sprScores, Object.keys(cells).length > 0 ? { [courseId]: cells } : {}),
        courseGrades: mergeSPRGrades(prev.courseGrades, grades),
      }));
    } catch (err) {
      // Lazy-only failure: never pop an alert over the workspace; sync
      // getters read whatever the cache holds.
      console.warn('[ensureSPRCourse] background sync failed:', err instanceof ApiError ? err.message : err);
    }
  };

  const getSPRConfig = (courseId: string): SPRConfig | null => {
    // Lazy fill on first Grades-tab access for this course.
    void ensureSPRCourse(courseId);
    return db.sprConfigs?.[courseId] ?? null;
  };

  const saveSPRConfig = async (courseId: string, config: Omit<SPRConfig, 'courseId'>): Promise<void> => {
    try {
      const { config: saved } = await apiFetch<{ config: SPRConfig }>(
        `/api/courses/${encodeURIComponent(courseId)}/spr`,
        { method: 'PUT', body: { config: { ...config, courseId } } }
      );
      setDb(prev => ({
        ...prev,
        sprConfigs: { ...(prev.sprConfigs ?? {}), [courseId]: saved },
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save SPR config.';
      setLastError(message);
      showAlert(message, 'Save SPR Config Failed');
      throw err;
    }
  };

  // Recompute both term grades for a student from the given snapshot
  // (manual map entry wins, else Task 1 autoScoreFraction) and sync them
  // through the existing term-grade path. Sync failures propagate with the
  // existing setCourseStudentGrade alert; the cell write is NOT rolled back.
  const recomputeAndSyncSPR = async (
    snapshot: LMSDatabase,
    courseId: string,
    studentId: string
  ): Promise<void> => {
    const config = snapshot.sprConfigs?.[courseId];
    if (!config) return;
    const course = snapshot.courses.find(c => c.id === courseId);
    const weights = resolveSPRWeights(course?.syllabus?.gradingSystem ?? null);
    const cells = snapshot.sprScores?.[courseId]?.[studentId];
    const resolveTerm = (term: 'midterm' | 'final'): number | null => {
      const columns = term === 'midterm' ? config.midtermColumns : config.finalColumns;
      const examPerfect = term === 'midterm' ? config.mtExamPerfect : config.ftExamPerfect;
      const manual = term === 'midterm' ? cells?.midterm ?? {} : cells?.final ?? {};
      const scores: Array<number | null> = [];
      const perfects: number[] = [];
      for (const col of columns) {
        const manualValue = manual[col.id];
        if (typeof manualValue === 'number') {
          scores.push(manualValue);
        } else {
          const fraction = autoScoreFraction({
            column: col,
            studentId,
            submissions: snapshot.submissions,
            activities: snapshot.activities ?? [],
            quizzes: snapshot.quizzes,
          });
          scores.push(fraction === null ? null : fraction * col.perfectScore);
        }
        perfects.push(col.perfectScore);
      }
      const cs = classStandingPercent(scores, perfects);
      const exam = term === 'midterm' ? cells?.mtExam ?? null : cells?.ftExam ?? null;
      const hasCSData = scores.some(s => s !== null);
      return termGrade(cs, exam, examPerfect, weights, hasCSData || exam !== null);
    };
    const mtGrade = resolveTerm('midterm');
    const ftGrade = resolveTerm('final');
    await setCourseStudentGrade(courseId, studentId, 'midterm', mtGrade === null ? null : round2(mtGrade));
    await setCourseStudentGrade(courseId, studentId, 'final', ftGrade === null ? null : round2(ftGrade));
  };

  const setSPRCell = async (
    courseId: string,
    studentId: string,
    term: 'midterm' | 'final',
    key: string,
    value: number | null
  ): Promise<void> => {
    const snapshot = dbRef.current;
    const prevCell = snapshot.sprScores?.[courseId]?.[studentId];
    const nextCell: SPRStudentCells = {
      midterm: { ...(prevCell?.midterm ?? {}) },
      mtExam: prevCell?.mtExam ?? null,
      final: { ...(prevCell?.final ?? {}) },
      ftExam: prevCell?.ftExam ?? null,
    };
    if (key === '__mtExam') {
      nextCell.mtExam = value;
    } else if (key === '__ftExam') {
      nextCell.ftExam = value;
    } else {
      // Store ONLY explicit manual numbers — a null/reset deletes the map
      // entry so auto resolution wins again (manual tagging).
      const map = term === 'midterm' ? nextCell.midterm : nextCell.final;
      if (value === null) delete map[key];
      else map[key] = value;
    }
    try {
      await apiFetch(
        `/api/courses/${encodeURIComponent(courseId)}/spr/${encodeURIComponent(studentId)}`,
        {
          method: 'PUT',
          body: {
            midtermScores: { ...nextCell.midterm },
            mtExam: nextCell.mtExam,
            finalScores: { ...nextCell.final },
            ftExam: nextCell.ftExam,
          },
        }
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save SPR cell.';
      setLastError(message);
      showAlert(message, 'Save SPR Cell Failed');
      throw err;
    }
    const nextDb: LMSDatabase = {
      ...snapshot,
      sprScores: mergeSPRCourseMaps(snapshot.sprScores, { [courseId]: { [studentId]: nextCell } }),
    };
    setDb(prev => ({
      ...prev,
      sprScores: mergeSPRCourseMaps(prev.sprScores, { [courseId]: { [studentId]: nextCell } }),
    }));
    await recomputeAndSyncSPR(nextDb, courseId, studentId);
  };

  const resetSPRCell = async (
    courseId: string,
    studentId: string,
    term: 'midterm' | 'final',
    key: string
  ): Promise<void> => {
    await setSPRCell(courseId, studentId, term, key, null);
  };

  const bulkImportSPRColumns = async (courseId: string, term: 'midterm' | 'final'): Promise<void> => {
    const snapshot = dbRef.current;
    const base = snapshot.sprConfigs?.[courseId];
    const config: SPRConfig = base ?? {
      courseId,
      midtermColumns: [],
      finalColumns: [],
      mtExamPerfect: 100,
      ftExamPerfect: 100,
    };
    // Sources already linked in EITHER term list are skipped.
    const linked = new Set<string>();
    for (const col of [...config.midtermColumns, ...config.finalColumns]) {
      if (col.linkedSource) linked.add(`${col.linkedSource.kind}:${col.linkedSource.sourceId}`);
    }
    const next: SPRColumn[] = [...(term === 'midterm' ? config.midtermColumns : config.finalColumns)];
    for (const a of snapshot.activities ?? []) {
      if (a.courseId !== courseId || linked.has(`activity:${a.id}`)) continue;
      linked.add(`activity:${a.id}`);
      next.push({
        id: crypto.randomUUID(),
        title: a.title,
        perfectScore: a.pointsPossible,
        linkedSource: { kind: 'activity', sourceId: a.id },
      });
    }
    for (const q of snapshot.quizzes) {
      if (q.courseId !== courseId || !q.published || linked.has(`quiz:${q.id}`)) continue;
      linked.add(`quiz:${q.id}`);
      const points = (q.questions || []).reduce((sum, qq) => sum + (qq.points ?? 0), 0);
      next.push({
        id: crypto.randomUUID(),
        title: q.title,
        perfectScore: Math.max(1, points),
        linkedSource: { kind: 'quiz', sourceId: q.id },
      });
    }
    await saveSPRConfig(courseId, {
      midtermColumns: term === 'midterm' ? next : config.midtermColumns,
      finalColumns: term === 'final' ? next : config.finalColumns,
      mtExamPerfect: config.mtExamPerfect,
      ftExamPerfect: config.ftExamPerfect,
    });
  };

  const clearHistory = () => {
    setDb(prev => ({
      ...prev,
      historyLogs: []
    }));
  };

  // ==========================================
  // SECTIONS CRUD
  // ==========================================

  const createSection = async (courseId: string, data: Partial<CourseSection>): Promise<CourseSection> => {
    try {
      const { section } = await apiFetch<{ section: CourseSection }>(
        `/api/courses/${encodeURIComponent(courseId)}/sections`,
        {
          method: 'POST',
          body: {
            name: data.name || 'New Section',
            ...(data.capacity !== undefined ? { capacity: data.capacity } : {})
          }
        }
      );

      // Server stores name/capacity only — schedule/location ride along in cache.
      const merged: CourseSection = {
        ...section,
        schedule: data.schedule || '',
        location: data.location || ''
      };

      setDb(prev => ({
        ...prev,
        courseSections: [...(prev.courseSections || []), merged],
        courses: prev.courses.map(c =>
          c.id === courseId
            ? { ...c, sectionIds: [...(c.sectionIds || []), merged.id] }
            : c
        )
      }));

      return merged;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create section.';
      setLastError(message);
      showAlert(message, 'Create Section Failed');
      throw err;
    }
  };

  const updateSection = async (sectionId: string, updates: Partial<CourseSection>): Promise<boolean> => {
    const patchBody: Record<string, string | number> = {};
    if (updates.name !== undefined) patchBody.name = updates.name;
    if (updates.capacity !== undefined) patchBody.capacity = updates.capacity;
    if (updates.schedule !== undefined) patchBody.schedule = updates.schedule;
    if (updates.location !== undefined) patchBody.location = updates.location;
    try {
      const { section } = await apiFetch<{ section: CourseSection }>(
        `/api/sections/${encodeURIComponent(sectionId)}`,
        { method: 'PATCH', body: patchBody }
      );
      setDb(prev => ({
        ...prev,
        courseSections: (prev.courseSections || []).map((s: CourseSection) =>
          s.id === sectionId ? { ...s, ...section } : s
        )
      }));
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update section.';
      setLastError(message);
      showAlert(message, 'Update Section Failed');
      return false;
    }
  };

  const deleteSection = async (sectionId: string): Promise<boolean> => {
    const section = (db.courseSections || []).find((s: CourseSection) => s.id === sectionId);
    const isOccupied = db.users.some(u =>
      Object.values(u.courseSections || {}).includes(sectionId)
    );
    const hasPendingRequests = section
      ? (db.enrollmentRequests || []).some(
          (r: EnrollmentRequest) => r.courseId === section.courseId && r.status === 'pending'
        )
      : false;
    if (isOccupied || hasPendingRequests) {
      showAlert(
        'This section cannot be deleted because students are assigned to it or there are pending enrollment requests for this course.',
        'Delete Blocked'
      );
      return false;
    }
    try {
      await apiFetch<{ ok: true }>(`/api/sections/${encodeURIComponent(sectionId)}`, {
        method: 'DELETE'
      });
      setDb(prev => ({
        ...prev,
        courseSections: (prev.courseSections || []).filter((s: CourseSection) => s.id !== sectionId),
        courses: prev.courses.map(c => ({
          ...c,
          sectionIds: (c.sectionIds || []).filter(id => id !== sectionId)
        }))
      }));
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete section.';
      setLastError(message);
      showAlert(message, 'Delete Section Failed');
      return false;
    }
  };

  const getCourseSections = (courseId: string): CourseSection[] => {
    return (db.courseSections || []).filter((s: CourseSection) => s.courseId === courseId);
  };

  const getStudentSection = (courseId: string): CourseSection | null => {
    const sectionId = activeUser.courseSections?.[courseId];
    if (!sectionId) return null;
    return (db.courseSections || []).find((s: CourseSection) => s.id === sectionId) || null;
  };

  // ==========================================
  // ENROLLMENT REQUEST WORKFLOW
  // ==========================================

  const createEnrollmentRequest = async (courseId: string, type: 'self_join' | 'faculty_enroll'): Promise<EnrollmentRequest> => {
    try {
      if (type === 'self_join') {
        // Join endpoint takes the course code — resolve it from cache.
        const course = db.courses.find(c => c.id === courseId);
        if (!course?.joinCode) {
          throw new ApiError(400, 'bad_request', 'Join code for this course is not available.');
        }
        const { request } = await apiFetch<{ request: EnrollmentRequest }>('/api/courses/join', {
          method: 'POST',
          body: { code: course.joinCode }
        });
        setDb(prev => mergeEnrollmentRequest(prev, request));
        return request;
      }
      const { request } = await apiFetch<{ request: EnrollmentRequest }>(
        `/api/courses/${encodeURIComponent(courseId)}/invites`,
        { method: 'POST', body: { studentId: activeUser.id } }
      );
      setDb(prev => mergeEnrollmentRequest(prev, request));
      return request;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create enrollment request.';
      setLastError(message);
      showAlert(message, 'Request Failed');
      throw err;
    }
  };

  const approveEnrollmentRequests = async (requestIds: string[]): Promise<boolean> => {
    if (activeRole !== 'faculty' && activeRole !== 'admin') return false;
    const succeeded: string[] = [];
    try {
      // Per-id approve endpoints, in sequence per the endpoint map.
      for (const requestId of requestIds) {
        await apiFetch<{ request: EnrollmentRequest }>(
          `/api/requests/${encodeURIComponent(requestId)}/approve`,
          { method: 'POST' }
        );
        succeeded.push(requestId);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to approve requests.';
      setLastError(message);
      showAlert(message, 'Approve Failed');
      if (succeeded.length === 0) return false;
    }
    const effectiveIds = succeeded.length > 0 ? succeeded : requestIds;
    setDb(prev => {
      const now = new Date().toISOString();
      const existingRequests = prev.enrollmentRequests || [];
      const requestsToApprove = existingRequests.filter(
        (r: EnrollmentRequest) => effectiveIds.includes(r.id) && r.status === 'pending'
      );

      const enrollmentApprovals = requestsToApprove.filter(
        (r: EnrollmentRequest) => r.type !== 'section_switch'
      );
      const switchApprovals = requestsToApprove.filter(
        (r: EnrollmentRequest) => r.type === 'section_switch'
      );

      const studentIds = enrollmentApprovals.map((r: EnrollmentRequest) => r.studentId);
      const courseIds = [...new Set(enrollmentApprovals.map((r: EnrollmentRequest) => r.courseId))];

      let updatedUsers = prev.users;
      let updatedCourses = prev.courses;
      let updatedSections = prev.courseSections || [];

      for (const courseId of courseIds) {
        const courseStudents = studentIds.filter((sid: string) =>
          enrollmentApprovals.find((r: EnrollmentRequest) => r.studentId === sid && r.courseId === courseId)
        );

        updatedUsers = updatedUsers.map(u => {
          if (courseStudents.includes(u.id)) {
            const currentCourses: string[] = u.enrolledCourseIds || [];
            if (!currentCourses.includes(courseId)) {
              return { ...u, enrolledCourseIds: [...currentCourses, courseId] };
            }
          }
          return u;
        });

        updatedCourses = updatedCourses.map(c => {
          if (c.id === courseId) {
            return { ...c, enrolledCount: (c.enrolledCount || 0) + courseStudents.length };
          }
          return c;
        });
      }

      const skippedSwitchIds: string[] = [];

      for (const req of switchApprovals) {
        const target = (updatedSections || []).find((s: CourseSection) => s.id === req.targetSectionId);
        if (!target || !canPickSection(target)) {
          skippedSwitchIds.push(req.id);
          continue;
        }
        const student = updatedUsers.find(u => u.id === req.studentId);
        const oldSectionId = student?.courseSections?.[req.courseId];
        if (oldSectionId && oldSectionId !== req.targetSectionId) {
          updatedSections = updatedSections.map((s: CourseSection) =>
            s.id === oldSectionId ? { ...s, enrolledCount: Math.max(0, s.enrolledCount - 1) } : s
          );
          updatedSections = updatedSections.map((s: CourseSection) =>
            s.id === req.targetSectionId ? { ...s, enrolledCount: s.enrolledCount + 1 } : s
          );
        } else if (!oldSectionId) {
          updatedSections = updatedSections.map((s: CourseSection) =>
            s.id === req.targetSectionId ? { ...s, enrolledCount: s.enrolledCount + 1 } : s
          );
        }
        if (oldSectionId !== req.targetSectionId) {
          updatedUsers = updatedUsers.map(u =>
            u.id === req.studentId
              ? { ...u, courseSections: { ...(u.courseSections || {}), [req.courseId]: req.targetSectionId as string } }
              : u
          );
        }
      }

      const skippedSet = new Set(skippedSwitchIds);

      return {
        ...prev,
        users: updatedUsers,
        courses: updatedCourses,
        courseSections: updatedSections,
        enrollmentRequests: existingRequests.map((r: EnrollmentRequest) =>
          effectiveIds.includes(r.id) && r.status === 'pending' && !skippedSet.has(r.id)
            ? { ...r, status: 'approved' as const, resolvedAt: now, resolvedBy: activeUser.id }
            : r
        )
      };
    });
    return true;
  };

  const rejectEnrollmentRequests = async (requestIds: string[]): Promise<boolean> => {
    if (activeRole !== 'faculty' && activeRole !== 'admin') return false;
    const succeeded: string[] = [];
    try {
      for (const requestId of requestIds) {
        await apiFetch<{ request: EnrollmentRequest }>(
          `/api/requests/${encodeURIComponent(requestId)}/reject`,
          { method: 'POST' }
        );
        succeeded.push(requestId);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to reject requests.';
      setLastError(message);
      showAlert(message, 'Reject Failed');
      if (succeeded.length === 0) return false;
    }
    const effective = new Set(succeeded.length > 0 ? succeeded : requestIds);
    setDb(prev => ({
      ...prev,
      enrollmentRequests: (prev.enrollmentRequests || []).map((r: EnrollmentRequest) =>
        effective.has(r.id) && r.status === 'pending'
          ? { ...r, status: 'rejected' as const, resolvedAt: new Date().toISOString(), resolvedBy: activeUser.id }
          : r
      )
    }));
    return true;
  };

  const removeStudentFromCourse = async (courseId: string, studentId: string): Promise<boolean> => {
    if (activeRole !== 'faculty' && activeRole !== 'admin') return false;
    try {
      await apiFetch<{ removed: number }>(
        `/api/courses/${encodeURIComponent(courseId)}/remove-student`,
        { method: 'POST', body: { studentId } }
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to remove student.';
      setLastError(message);
      showAlert(message, 'Remove Failed');
      return false;
    }
    // Coursework (submissions, grades) stays intact — only membership is
    // revoked, so the student can rejoin later via code or invite.
    setDb(prev => {
      const freedSectionIds = new Set(
        (prev.enrollmentRequests || [])
          .filter(
            (r: EnrollmentRequest) =>
              r.courseId === courseId && r.studentId === studentId && r.status === 'approved' && r.targetSectionId
          )
          .map((r: EnrollmentRequest) => r.targetSectionId as string)
      );
      return {
        ...prev,
        users: (prev.users || []).map(u => {
          if (u.id !== studentId) return u;
          const next: User = {
            ...u,
            enrolledCourseIds: (u.enrolledCourseIds || []).filter(id => id !== courseId)
          };
          if (next.courseSections && next.courseSections[courseId]) {
            const { [courseId]: _dropped, ...rest } = next.courseSections;
            next.courseSections = rest;
          }
          return next;
        }),
        courses: (prev.courses || []).map(c =>
          c.id === courseId ? { ...c, enrolledCount: Math.max(0, (c.enrolledCount || 0) - 1) } : c
        ),
        courseSections: (prev.courseSections || []).map((s: CourseSection) =>
          freedSectionIds.has(s.id) ? { ...s, enrolledCount: Math.max(0, s.enrolledCount - 1) } : s
        ),
        enrollmentRequests: (prev.enrollmentRequests || []).filter(
          (r: EnrollmentRequest) =>
            !(r.courseId === courseId && r.studentId === studentId && r.status === 'approved')
        )
      };
    });
    return true;
  };

  const studentApproveInvitation = async (requestId: string): Promise<boolean> => {
    try {
      const { request } = await apiFetch<{ request: EnrollmentRequest }>(
        `/api/requests/${encodeURIComponent(requestId)}/accept`,
        { method: 'POST' }
      );
      if (request.studentId !== activeUser.id) return false;

      const updatedUser = {
        ...activeUser,
        enrolledCourseIds: [...new Set([...(activeUser.enrolledCourseIds || []), request.courseId])]
      };
      setCurrentUser(updatedUser);

      // Fetch the newly-approved course so it appears without a page refresh.
      // Student course lists are scoped to db.courses (enrolled only), so a
      // map-only update would be a no-op when the course isn't cached yet.
      let freshCourse: Course | null = null;
      try {
        const res = await apiFetch<{ course: Course }>(
          `/api/courses/${encodeURIComponent(request.courseId)}`
        );
        freshCourse = res.course ? normalizeCourseSyllabus(res.course) : null;
      } catch {
        freshCourse = null;
      }

      setDb(prev => ({
        ...mergeEnrollmentRequest(prev, request),
        users: prev.users.map(u => u.id === activeUser.id ? updatedUser : u),
        courses: (() => {
          const exists = prev.courses.some(c => c.id === request.courseId);
          if (exists) {
            return prev.courses.map(c =>
              c.id === request.courseId
                ? { ...c, enrolledCount: (c.enrolledCount || 0) + 1 }
                : c
            );
          }
          if (freshCourse) {
            return [...prev.courses, { ...freshCourse, enrolledCount: (freshCourse.enrolledCount || 0) + 1 } as Course];
          }
          // Fallback: minimal row from request payload so lists still update.
          const fallback = {
            id: request.courseId,
            code: (request as unknown as { courseCode?: string }).courseCode || request.courseId,
            title: (request as unknown as { courseTitle?: string }).courseTitle || request.courseId,
            section: '',
            enrolledCount: 1,
          } as unknown as Course;
          return [...prev.courses, fallback];
        })()
      }));
      setActiveCourseId(request.courseId);
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to accept invitation.';
      setLastError(message);
      showAlert(message, 'Accept Failed');
      return false;
    }
  };

  const studentDeclineInvitation = async (requestId: string): Promise<boolean> => {
    try {
      await apiFetch<{ ok: true }>(
        `/api/requests/${encodeURIComponent(requestId)}/decline`,
        { method: 'POST' }
      );
      // Server deletes declined invites — mirror by dropping the row from cache.
      setDb(prev => ({
        ...prev,
        enrollmentRequests: (prev.enrollmentRequests || []).filter(
          (r: EnrollmentRequest) => !(r.id === requestId && r.studentId === activeUser.id)
        )
      }));
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to decline invitation.';
      setLastError(message);
      showAlert(message, 'Decline Failed');
      return false;
    }
  };

  const selectSection = async (courseId: string, sectionId: string): Promise<boolean> => {
    const bypassGate = activeRole === 'faculty' || activeRole === 'admin';
    if (!bypassGate) {
      const hasApproval = (db.enrollmentRequests || []).some(
        (r: EnrollmentRequest) =>
          r.studentId === activeUser.id && r.courseId === courseId && r.status === 'approved'
      );
      if (!hasApproval) {
        showAlert(
          'You need an approved enrollment request before selecting a section.',
          'Section Selection Blocked'
        );
        return false;
      }
    }

    const targetSection = (db.courseSections || []).find((s: CourseSection) => s.id === sectionId);
    if (!targetSection) return false;
    if (!canPickSection(targetSection)) {
      showAlert('This section is full. Please choose another section.', 'Section Full');
      return false;
    }

    try {
      const { request } = await apiFetch<{ request: EnrollmentRequest }>(
        `/api/courses/${encodeURIComponent(courseId)}/choose-section`,
        { method: 'POST', body: { sectionId } }
      );

      // Section counts are authoritative server-side — refresh them, keeping
      // the client-only schedule/location overlay.
      try {
        const { sections } = await apiFetch<{ sections: CourseSection[] }>(
          `/api/courses/${encodeURIComponent(courseId)}/sections`
        );
        setDb(prev => {
          const prevById = new Map((prev.courseSections || []).map(s => [s.id, s]));
          const refreshed = sections.map(s => ({
            ...s,
            schedule: s.schedule || prevById.get(s.id)?.schedule || '',
            location: s.location || prevById.get(s.id)?.location || ''
          }));
          return {
            ...prev,
            courseSections: [
              ...(prev.courseSections || []).filter(s => s.courseId !== courseId),
              ...refreshed
            ]
          };
        });
      } catch {
        // Keep cached counts when the refresh fails.
      }

      // User.courseSections stays a client-side cache, maintained from the
      // choose-section response (current logic, API-fed).
      const chosenId = request.targetSectionId || sectionId;
      const updatedSections = { ...(activeUser.courseSections || {}), [courseId]: chosenId };
      const updatedUser = { ...activeUser, courseSections: updatedSections };
      setCurrentUser(updatedUser);

      setDb(prev => ({
        ...mergeEnrollmentRequest(prev, request),
        users: prev.users.map(u => u.id === activeUser.id ? updatedUser : u)
      }));
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to select section.';
      setLastError(message);
      showAlert(message, 'Section Selection Failed');
      return false;
    }
  };

  const requestSectionSwitch = async (courseId: string, targetSectionId: string): Promise<boolean> => {
    if (activeRole === 'faculty' || activeRole === 'admin') return false;
    const currentSectionId = activeUser.courseSections?.[courseId];
    if (currentSectionId === targetSectionId) return false;
    const duplicate = (db.enrollmentRequests || []).some(
      (r: EnrollmentRequest) =>
        r.studentId === activeUser.id &&
        r.courseId === courseId &&
        r.type === 'section_switch' &&
        r.targetSectionId === targetSectionId &&
        r.status === 'pending'
    );
    if (duplicate) return false;
    try {
      const { request } = await apiFetch<{ request: EnrollmentRequest }>(
        `/api/courses/${encodeURIComponent(courseId)}/switch-section`,
        { method: 'POST', body: { sectionId: targetSectionId } }
      );
      setDb(prev => mergeEnrollmentRequest(prev, request));
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to request section switch.';
      setLastError(message);
      showAlert(message, 'Switch Request Failed');
      return false;
    }
  };

  const getPendingRequestsForCourse = async (courseId: string): Promise<EnrollmentRequest[]> => {
    try {
      const { requests } = await apiFetch<{ requests: EnrollmentRequest[] }>(
        `/api/courses/${encodeURIComponent(courseId)}/requests?status=pending`
      );
      setDb(prev => ({
        ...prev,
        // REPLACE (not merge) this course's cached pendings with server truth.
        enrollmentRequests: [
          ...(prev.enrollmentRequests || []).filter(
            (r: EnrollmentRequest) => !(r.courseId === courseId && r.status === 'pending')
          ),
          ...requests,
        ],
      }));
      return requests;
    } catch (err) {
      // Read path: stay silent (no modal) and serve the cache.
      setLastError(err instanceof ApiError ? err.message : 'Failed to load requests.');
      return (db.enrollmentRequests || []).filter((r: EnrollmentRequest) => r.courseId === courseId && r.status === 'pending');
    }
  };

  const getPendingRequestsForStudent = (): EnrollmentRequest[] => {
    return (db.enrollmentRequests || []).filter(
      (r: EnrollmentRequest) => r.studentId === activeUser.id && r.status === 'pending' && (r.type === 'faculty_enroll' || r.type === 'self_join' || r.type === 'section_switch')
    );
  };

  const requestJoinCourse = async (courseId: string): Promise<boolean> => {
    if (activeRole === 'faculty' || activeRole === 'admin') return false;
    const mine = (db.enrollmentRequests || []).filter(
      (r: EnrollmentRequest) => r.studentId === activeUser.id && r.courseId === courseId
    );
    if (mine.some((r: EnrollmentRequest) => r.status === 'pending')) return false;
    if (
      mine.some((r: EnrollmentRequest) => r.status === 'approved') &&
      (activeUser.enrolledCourseIds || []).includes(courseId)
    ) return false;
    try {
      await createEnrollmentRequest(courseId, 'self_join');
      return true;
    } catch {
      // createEnrollmentRequest already surfaced the alert.
      return false;
    }
  };

  const getMyRequest = (courseId: string): EnrollmentRequest | null => {
    const mine = (db.enrollmentRequests || []).filter(
      (r: EnrollmentRequest) => r.studentId === activeUser.id && r.courseId === courseId
    );
    return mine.length > 0 ? mine[mine.length - 1] : null;
  };

  const getPendingRequests = (courseId: string): Promise<EnrollmentRequest[]> => {
    return getPendingRequestsForCourse(courseId);
  };

  return (
    <LMSContext.Provider
      value={{
        theme,
        toggleTheme,
        accent,
        customAccentHex,
        setAccent,
        setCustomAccentHex,
        resetAccent,
        isAuthenticated,
        currentUser,
        activeUser,
        activeRole,
        login,
        logout,
        switchRole,
        isLoading,
        isSyncing: false,
        authReady,
        lastError,
        activeCourseId,
        setActiveCourseId,
        db,
        activeSpeedGraderSubmissionId,
        openSpeedGrader,
        closeSpeedGrader,
        isHistoryDrawerOpen,
        setIsHistoryDrawerOpen,
        isHelpDrawerOpen,
        setIsHelpDrawerOpen,
        isRoleModalOpen,
        setIsRoleModalOpen,
        isUserProfileModalOpen,
        setIsUserProfileModalOpen,
        showAlert,
        showConfirm,
        closeAlert,
        createCourse,
        createModule,
        updateModule,
        deleteModule,
        addModuleItem,
        updateModuleItem,
        deleteModuleItem,
        createQuiz,
        recordQuizSubmission,
        createExam,
        recordExamSubmission,
        createActivity,
        updateActivity,
        recordActivitySubmission,
        deleteActivity,
        enrollPerson,
        enrollStudentsInCourse,
        createUser,
        updateUser,
        deleteUser,
        joinCourseByCode,
        regenerateCourseJoinCode,
        updateCourseSyllabus,
        removeCourseSyllabus,
        updateCourseGradingTerms,
        setGradesReleased,
        effectiveTermsForCourse,
        importCommonsTemplate,
        gradeSubmission,
        upsertManualExamGrade,
        submitActivity,
        toggleModulePublish,
        toggleItemCompletion,
        addModuleComment,
        editModuleComment,
        deleteModuleComment,
        toggleLikeModuleComment,
        sendMessage,
        createChatGroup,
        markThreadAsRead,
        toggleMessageReaction,
        bookAdvisingSlot,
        createAdvisingSlot,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        createAnnouncement,
        deleteAnnouncement,
        togglePinAnnouncement,
        toggleLikeAnnouncement,
        addAnnouncementReply,
        markAnnouncementRead,
        notifications,
        getUnreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        markTabVisited,
        markModuleCommentsRead,
        getNotifications,
        createDiscussion,
        deleteDiscussion,
        togglePinDiscussion,
        toggleLockDiscussion,
        addDiscussionReply,
        toggleLikeDiscussionReply,
        createCourseFolder,
        uploadCourseFile,
        deleteCourseFile,
        deleteCourseFolder,
        updateFileVisibility,
        renameCourseFile,
        setCourseStudentGrade,
        getSPRConfig,
        saveSPRConfig,
        setSPRCell,
        resetSPRCell,
        bulkImportSPRColumns,
        createSection,
        updateSection,
        deleteSection,
        getCourseSections,
        getStudentSection,
        createEnrollmentRequest,
        approveEnrollmentRequests,
        rejectEnrollmentRequests,
        removeStudentFromCourse,
        studentApproveInvitation,
        studentDeclineInvitation,
        selectSection,
        requestSectionSwitch,
        getPendingRequestsForCourse,
        getPendingRequestsForStudent,
        requestJoinCourse,
        getMyRequest,
        getPendingRequests,
        logHistory,
        clearHistory
      }}
    >
      {children}
      <AlertModal
        isOpen={isAlertOpen}
        options={alertOptions}
        onClose={closeAlert}
      />
    </LMSContext.Provider>
  );
};

export const useLMS = () => {
  const context = useContext(LMSContext);
  if (!context) {
    throw new Error('useLMS must be used within an LMSProvider');
  }
  return context;
};
