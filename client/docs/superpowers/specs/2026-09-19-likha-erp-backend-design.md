# Likha ERP Backend Design Specification for Gabay LMS

**Date:** 2026-09-19  
**Status:** Approved  
**Target Backend:** `https://gabay.zyberlab.com/`  
**Frontend Repository:** `https://github.com/Axxues/Gabay` (`D:\4thesis\GabaySystem\Gabay\client`)  
**SDK Package:** `@likha-erp/likha-sdk@^1.0.7`  

---

## 1. Executive Summary & Goals

This specification outlines the architecture, data schemas, security model, and frontend SDK integration for the Gabay Learning Management System (LMS) powered by **Likha ERP** (Directus-based headless CMS/BaaS).

### Scope & Constraints
1. **Direct Frontend-to-Backend Architecture**: The React/Vite frontend connects directly to Likha ERP via `@likha-erp/likha-sdk`. No intermediate Node.js daemon or Express server is maintained.
2. **Automated One-Time Provisioning**: Schema creation and initial seeding are executed once via a standalone TypeScript provisioning script using Likha ERP's Directus Admin REST API and SDK.
3. **Strict Scope Isolation**: Excludes all RAG / n8n pipelines. The Likha ERP backend serves exclusively as the relational LMS data store for Gabay's user accounts, courses, syllabus, assessments, gradebook, calendar, announcements, messaging, and activity logs.

---

## 2. Likha ERP Collections & Schemas

The following 11 data collections and custom user fields are provisioned on `https://gabay.zyberlab.com/`.

### 2.1 Extended User System (`directus_users`)
Built-in Directus user collection extended with academic fields:
- `student_id` (`string`, nullable): Unique institutional ID (e.g. `23103733`).
- `department` (`string`, default: `College of Information Technology`): Academic department/college.
- `title` (`string`, default: `Student`): Display title (e.g. `Student`, `Instructor`, `Dean`).
- `user_role` (`string`): Role identifier (`student` | `faculty` | `admin` | `staff`).
- `banner` (`string`, nullable): Header banner background URL.
- `student_type` (`string`, nullable): `regular` | `irregular`.

### 2.2 Academic Core: Courses & Modules
#### Collection: `courses`
- `id` (`uuid`, primary key)
- `code` (`string`): Course code (e.g. `CSPC 112`, `CMSC 131`).
- `title` (`string`): Full course title.
- `section` (`string`): Section descriptor (e.g. `BSIT 3-A`).
- `term` (`string`): Semester / Academic Term (e.g. `1st Semester 2026-2027`).
- `instructor_id` (`uuid`, M2O -> `directus_users.id`)
- `credits` (`integer`, default: 3)
- `published` (`boolean`, default: true)
- `syllabus` (`json`): Full course syllabus structure (description, course outcomes, schedule, grading criteria).
- `sections` (`json`): Sub-sections and schedules.

#### Collection: `course_modules`
- `id` (`uuid`, primary key)
- `course_id` (`uuid`, M2O -> `courses.id`, cascade delete)
- `title` (`string`): Module title (e.g. `Module 1: Introduction`).
- `order` (`integer`): Display order.
- `items` (`json`): List of module learning items (pages, files, external links, assignments).

#### Collection: `course_enrollments`
- `id` (`uuid`, primary key)
- `course_id` (`uuid`, M2O -> `courses.id`)
- `user_id` (`uuid`, M2O -> `directus_users.id`)
- `role` (`string`): `student` | `faculty`
- `status` (`string`, default: `enrolled`): `enrolled` | `pending` | `dropped`
- `enrolled_at` (`timestamp`, default: `now()`)

### 2.3 Learning Assessments & Submissions
#### Collection: `assessments`
- `id` (`uuid`, primary key)
- `course_id` (`uuid`, M2O -> `courses.id`)
- `title` (`string`): Assessment title.
- `type` (`string`): `quiz` | `exam` | `activity`
- `term` (`string`): `prelim` | `midterm` | `finals`
- `total_points` (`integer`, default: 100)
- `due_date` (`timestamp`, nullable)
- `published` (`boolean`, default: true)
- `config` (`json`, nullable): Time limits, attempts allowed, rubrics.
- `questions` (`json`, nullable): Quiz/Exam questions and choice structures.

#### Collection: `submissions`
- `id` (`uuid`, primary key)
- `assessment_id` (`uuid`, M2O -> `assessments.id`)
- `student_id` (`uuid`, M2O -> `directus_users.id`)
- `course_id` (`uuid`, M2O -> `courses.id`)
- `score` (`float`, nullable): Graded score.
- `status` (`string`, default: `submitted`): `submitted` | `graded` | `late`
- `answers` (`json`, nullable): Student responses or uploaded file metadata.
- `feedback` (`text`, nullable): Instructor feedback comments.
- `submitted_at` (`timestamp`, default: `now()`)
- `graded_at` (`timestamp`, nullable)

### 2.4 Grading & Student Permanent Records (SPR)
#### Collection: `grades`
- `id` (`uuid`, primary key)
- `course_id` (`uuid`, M2O -> `courses.id`)
- `student_id` (`uuid`, M2O -> `directus_users.id`)
- `prelim` (`float`, nullable): Prelim weighted score (0-100).
- `midterm` (`float`, nullable): Midterm weighted score (0-100).
- `finals` (`float`, nullable): Finals weighted score (0-100).
- `overall` (`float`, nullable): Calculated overall grade (0-100).
- `remarks` (`string`, default: `Passed`): `Passed` | `Failed` | `Incomplete`
- `breakdown` (`json`, nullable): Itemized column scores and weights.

#### Collection: `course_grading_configs`
- `id` (`uuid`, primary key)
- `course_id` (`uuid`, M2O -> `courses.id`, unique)
- `prelim_columns` (`json`): Configured SPR columns for Prelims.
- `midterm_columns` (`json`): Configured SPR columns for Midterms.
- `final_columns` (`json`): Configured SPR columns for Finals.
- `weights` (`json`): Grading breakdown formula (Class standing %, Exam %).

### 2.5 Campus & Course Communication
#### Collection: `calendar_events`
- `id` (`uuid`, primary key)
- `course_id` (`uuid`, nullable, M2O -> `courses.id`): Null represents campus-wide event.
- `title` (`string`): Event title.
- `date` (`date`): Scheduled date.
- `start_time` (`string`, nullable): e.g. `09:00`.
- `end_time` (`string`, nullable): e.g. `11:00`.
- `description` (`text`, nullable)
- `type` (`string`, default: `academic`): `academic` | `course` | `holiday` | `deadline`

#### Collection: `announcements`
- `id` (`uuid`, primary key)
- `course_id` (`uuid`, nullable, M2O -> `courses.id`): Null represents system-wide.
- `title` (`string`): Announcement headline.
- `content` (`text`): Body text.
- `author_id` (`uuid`, M2O -> `directus_users.id`)
- `created_at` (`timestamp`, default: `now()`)
- `replies` (`json`, nullable): Threaded reply objects.

#### Collection: `messages`
- `id` (`uuid`, primary key)
- `sender_id` (`uuid`, M2O -> `directus_users.id`)
- `recipient_id` (`uuid`, M2O -> `directus_users.id`)
- `subject` (`string`)
- `body` (`text`)
- `read` (`boolean`, default: false)
- `created_at` (`timestamp`, default: `now()`)

#### Collection: `activity_logs`
- `id` (`uuid`, primary key)
- `user_id` (`uuid`, M2O -> `directus_users.id`)
- `action` (`string`): Event action identifier (e.g. `logged_in`, `submitted_assignment`).
- `details` (`json`, nullable): Context metadata.
- `timestamp` (`timestamp`, default: `now()`)

---

## 3. Security & Permission Matrix

Permissions configured via Directus Roles & Permissions API:
| Collection | Administrator | Faculty | Student |
|---|---|---|---|
| `directus_users` | Full CRUD | Read course students; Update self | Read course peers/instructors; Update self |
| `courses` | Full CRUD | Read all, Edit assigned courses | Read published enrolled courses |
| `course_modules` | Full CRUD | Read/Write assigned courses | Read published enrolled modules |
| `course_enrollments` | Full CRUD | Read/Write assigned courses | Read own enrollments |
| `assessments` | Full CRUD | Read/Write assigned courses | Read published enrolled assessments |
| `submissions` | Full CRUD | Read/Grade assigned courses | Create/Read own submissions |
| `grades` | Full CRUD | Read/Write assigned courses | Read own course grades |
| `calendar_events` | Full CRUD | Read all, Create course events | Read relevant events |
| `announcements` | Full CRUD | Read all, Create course announcements | Read relevant announcements |
| `messages` | Full CRUD | Read/Write own sent/received | Read/Write own sent/received |
| `activity_logs` | Full CRUD | Read/Create own logs | Read/Create own logs |

---

## 4. Frontend SDK Integration Architecture

### 4.1 Client Initialization (`src/services/core/likhaClient.ts`)
```typescript
import { createLikha, rest, authentication } from '@likha-erp/likha-sdk';
import type { LikhaSchema } from '@/services/core/types';

export const likha = createLikha<LikhaSchema>('https://gabay.zyberlab.com')
  .with(rest())
  .with(authentication('json'));
```

### 4.2 Auth State Flow
1. User logs in with `email` and `password` -> `likha.login(email, password)`.
2. Token is stored and refreshed automatically by the Likha SDK.
3. User profile data is fetched from `/users/me` with extended fields (`student_id`, `department`, `title`, `user_role`, `banner`).
4. User state hydrates `AuthContext` and `LMSContext`.

### 4.3 Graceful Offline / Fallback Strategy
If network connectivity is lost or Likha ERP API calls fail unexpectedly, cached data in `localStorage` or initial seed data acts as fallback, ensuring the application remains interactive and avoids runtime crashes.

---

## 5. Verification Plan
- **Schema Provisioning Script**: Verifies HTTP 200/204 on collection and field definitions on `https://gabay.zyberlab.com/`.
- **Frontend Compilation**: `npx tsc -b` exits 0 with zero type errors.
- **Vite Build**: `npm run build` succeeds cleanly.
- **Unit & Integration Tests**: `npx vitest run` passes all test suites.
- **Remote Git Sync**: Changes pushed to `https://github.com/Axxues/Gabay`.
