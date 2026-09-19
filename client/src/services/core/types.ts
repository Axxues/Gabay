import type {
  User,
  Course,
  Module,
  CalendarEvent,
  Submission,
  Announcement,
  Message,
  HistoryLog,
  CourseStudentGrade,
  SPRConfig,
} from '@/services/lms/types/lms.types';

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LikhaCourseEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  role: 'student' | 'faculty';
  status: 'enrolled' | 'pending' | 'dropped';
  enrolled_at: string;
}

export interface LikhaAssessment {
  id: string;
  course_id: string;
  title: string;
  type: 'quiz' | 'exam' | 'activity';
  term: 'prelim' | 'midterm' | 'finals';
  total_points: number;
  due_date?: string | null;
  published: boolean;
  config?: unknown;
  questions?: unknown;
}

export interface LikhaSchema {
  directus_users: User[];
  courses: Course[];
  course_modules: Module[];
  course_enrollments: LikhaCourseEnrollment[];
  assessments: LikhaAssessment[];
  submissions: Submission[];
  grades: CourseStudentGrade[];
  course_grading_configs: SPRConfig[];
  calendar_events: CalendarEvent[];
  announcements: Announcement[];
  messages: Message[];
  activity_logs: HistoryLog[];
}
