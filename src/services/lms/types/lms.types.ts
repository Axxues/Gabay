export type UserRole = 'admin' | 'faculty' | 'staff' | 'student';

export type TermId = 'prelim' | 'midterm' | 'finals';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  studentId?: string;
  department: string;
  title: string;
  password?: string;
  enrolledCourseIds?: string[];
  courseSections?: Record<string, string>;
  lastVisitedAt?: Record<string, string>;
}

import type { OfficialSyllabusData } from '@/data/syllabusData';

export interface Course {
  id: string;
  code: string;
  title: string;
  section: string;
  term: string;
  instructorId: string;
  instructorName: string;
  published: boolean;
  color?: string;
  enrolledCount: number;
  credits?: number;
  chedComplianceCode?: string;
  image?: string;
  syllabus?: OfficialSyllabusData | null;
  gradingTerms?: TermId[] | null;
  gradesReleased?: Partial<Record<TermId, boolean>> | null;
  joinCode?: string;
  sectionIds?: string[];
}

export interface CourseSection {
  id: string;
  courseId: string;
  name: string;
  capacity?: number;
  enrolledCount: number;
  schedule?: string;
  location?: string;
}

export interface EnrollmentRequest {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  type: 'self_join' | 'faculty_enroll' | 'section_switch';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  sectionId?: string;
  targetSectionId?: string;
  // Server-attached snapshot: pending rows reference courses outside the
  // student's cached (enrolled-only) course list, so payloads carry the
  // display name. Null when the course no longer exists.
  courseCode?: string | null;
  courseTitle?: string | null;
}

export interface ModuleItem {
  id: string;
  title: string;
  type: 'page' | 'activity' | 'quiz' | 'file' | 'external_url';
  published: boolean;
  required: boolean;
  completionCondition?: 'view' | 'submit' | 'min_score';
  minScore?: number;
  content?: string;
  activityId?: string | null;
  quizId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  completed?: boolean;
  authorId?: string;
  authorName?: string;
}

export interface ModuleComment {
  id: string;
  moduleId: string;
  parentId?: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  likes?: number;
  likedBy?: string[];
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Notification {
  id: string;
  type: 'module_comment_reply' | 'announcement_reply' | 'quiz_draft_saved' | 'activity_submitted' | 'calendar_event' | 'file_uploaded' | 'grade_posted';
  recipientId: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  relatedId: string; // moduleId or announcementId or quizId or activityKey
  relatedTitle: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
  published: boolean;
  prerequisiteModuleId?: string;
  authorId?: string;
  authorName?: string;
  items: ModuleItem[];
  comments?: ModuleComment[];
}

export interface RubricRating {
  points: number;
  description: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  points: number;
  ratings: RubricRating[];
}

export interface Activity {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  term: TermId;
  questions: QuizQuestion[];
  pointsPossible: number;
  dueDate?: string;
  published: boolean;
  format: 'classic' | 'questionset';
  submissionTypes?: string[];
  category?: string;
  weight?: number;
  rubric?: RubricCriterion[];
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
  availableFrom?: string;
  availableUntil?: string;
  sectionRestriction?: string;
}

export interface SubmissionComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
  text: string;
}

export interface Submission {
  id: string;
  activityKey?: string;
  quizId?: string;
  activityId?: string;
  examId?: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  submittedAt: string;
  submissionType: 'file' | 'online_text';
  content?: string;
  fileUrl?: string;
  fileName?: string;
  grade?: number;
  gradedAt?: string;
  gradedBy?: string;
  status: 'submitted' | 'graded' | 'missing';
  rubricScores: Record<string, number>;
  comments: SubmissionComment[];
}

export type QuizItemType =
  | 'multiple_choice'
  | 'identification'
  | 'true_false'
  | 'essay'
  | 'description'
  | 'page_break';

export interface QuizQuestion {
  id: string;
  text: string;
  type: QuizItemType;
  options?: string[];
  correctAnswer?: string;
  points: number;
  description?: string;
  rubricNotes?: string;
  imageUrl?: string;
  imageName?: string;
  fileUrl?: string;
  fileName?: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  term: TermId;
  timeLimitMinutes: number;
  published: boolean;
  delayedUntil?: string; // scheduled release date/time
  dueDate?: string;
  questions: QuizQuestion[];
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
}

export interface Exam {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  timeLimitMinutes: number;
  published: boolean;
  dueDate?: string;
  questions: QuizQuestion[];
  term: TermId;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  courseId?: string;
  courseCode?: string;
  type: 'activity' | 'milestone' | 'advising' | 'lecture' | 'exam' | 'event' | 'holiday' | 'virtual_meeting';
  description: string;
  createdAt?: string;
  startAt?: string;
  endAt?: string;
  isAllDay?: boolean;
  colorHex?: string;
  location?: string;
  meetingPlatform?: 'zoom' | 'google_meet' | 'teams' | 'other';
  meetingId?: string;
  meetingPasscode?: string;
  meetingJoinUrl?: string;
}

export interface AdvisingSlot {
  id: string;
  instructorId: string;
  instructorName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "10:00 AM - 10:30 AM"
  location: string;
  status: 'available' | 'booked';
  bookedByStudentId?: string;
  bookedByStudentName?: string;
  notes?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  recipientRole: UserRole;
  courseId?: string;
  courseCode?: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
  reaction?: string;
  attachmentName?: string;
  attachmentSize?: string;
  groupId?: string;
  isGroup?: boolean;
}

export interface ChatGroup {
  id: string;
  name: string;
  avatar?: string;
  memberIds: string[];
  courseId?: string;
  courseCode?: string;
  createdAt: string;
  createdBy: string;
}

export interface HistoryLog {
  id: string;
  path: string;
  title: string;
  timestamp: string;
}

export interface CommonsTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  chedAlignment: string;
}

export interface AnnouncementReply {
  id: string;
  announcementId: string;
  parentId?: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  likes: number;
  likedBy?: string[];
}

export interface Announcement {
  id: string;
  courseId: string; // or 'all' for institutional announcements
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  createdAt: string;
  delayedUntil?: string; // scheduled release date
  sectionId?: string; // 'all' default or a section id
  sectionRestriction?: string; // 'All Sections' | 'BSCS 4-1' etc.
  allowComments: boolean;
  usersMustPostBeforeReplies?: boolean;
  allowLiking?: boolean;
  likes: number;
  likedBy?: string[];
  pinned: boolean;
  attachments?: { name: string; size: string; url?: string }[];
  replies: AnnouncementReply[];
  readBy?: string[];
}

export interface DiscussionReply {
  id: string;
  discussionId: string;
  parentId?: string; // for nested/threaded replies
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  likes: number;
  likedBy?: string[];
  attachments?: { name: string; url?: string }[];
}

export interface Discussion {
  id: string;
  courseId: string;
  title: string;
  prompt: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  createdAt: string;
  isGraded: boolean;
  pointsPossible?: number;
  dueDate?: string;
  pinned: boolean;
  locked: boolean;
  usersMustPostBeforeReplies: boolean;
  groupActivity?: string;
  replies: DiscussionReply[];
}

export interface CourseFile {
  id: string;
  courseId: string; // or 'user-<id>' for personal storage
  folderId?: string | null;
  name: string;
  size: number;
  formattedSize: string;
  type: 'pdf' | 'document' | 'slide' | 'code' | 'archive' | 'image';
  visibility: 'published' | 'unpublished' | 'restricted';
  updatedAt: string;
  uploadedBy: string;
  uploadedByName: string;
  content?: string; // for built-in previewer
  url?: string;
  fileUrl?: string;
  sourceArea?: FileSourceArea;
  sourceId?: string;
}

export interface CourseFolder {
  id: string;
  courseId: string;
  parentId?: string | null;
  name: string;
  updatedAt: string;
  autoKey?: string;
}

export type FileSourceArea = 'announcements' | 'modules' | 'syllabus';

export interface FileAreaInput {
  courseId: string;
  area: FileSourceArea;
  sourceId?: string;
  moduleId?: string;
  moduleTitle?: string;
  name: string;
  url?: string;
  fileUrl?: string;
  size?: number;
  formattedSize?: string;
  type?: CourseFile['type'];
  visibility?: CourseFile['visibility'];
  content?: string;
  reuseExistingName?: boolean;
}

export interface CourseStudentGrade {
  courseId: string;
  studentId: string;
  midtermGrade?: number | null;
  finalGrade?: number | null;
  updatedAt?: string;
}

export interface SPRSourceLink { kind: 'activity' | 'quiz' | 'exam'; sourceId: string }
export interface SPRColumn { id: string; title: string; perfectScore: number; linkedSource?: SPRSourceLink }
export interface SPRConfig { courseId: string; prelimColumns?: SPRColumn[]; midtermColumns: SPRColumn[]; finalColumns: SPRColumn[]; mtExamPerfect: number; ftExamPerfect: number }
export type SPRCellMap = Record<string, Record<string, number | null>>;
export interface SPRWeights { csWeight: number; examWeight: number; mtWeight: number; ftWeight: number; formulaLabel: string; parseError?: boolean }

export interface LMSDatabase {
  users: User[];
  courses: Course[];
  modules: Module[];
  submissions: Submission[];
  quizzes: Quiz[];
  activities?: Activity[];
  exams?: Exam[];
  calendarEvents: CalendarEvent[];
  advisingSlots: AdvisingSlot[];
  messages: Message[];
  historyLogs: HistoryLog[];
  commonsTemplates: CommonsTemplate[];
  announcements?: Announcement[];
  discussions?: Discussion[];
  courseFiles?: CourseFile[];
  courseFolders?: CourseFolder[];
  courseGrades?: CourseStudentGrade[];
  sprConfigs?: Record<string, SPRConfig>;
  sprScores?: Record<string, Record<string, { midterm: Record<string, number | null>; mtExam: number | null; final: Record<string, number | null>; ftExam: number | null }>>;
  chatGroups?: ChatGroup[];
  notifications?: Notification[];
  courseSections?: CourseSection[];
  enrollmentRequests?: EnrollmentRequest[];
}
