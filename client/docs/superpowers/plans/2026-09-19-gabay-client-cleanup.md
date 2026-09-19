# Gabay Client Clean-up & Architecture Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean the `Gabay\client` frontend codebase, remove mock data bloat and dead placeholder files, relocate misplaced domain components to features, fix TypeScript compiler errors (`tsc -b`), and decompose the monolithic `LMSContext` into domain-split contexts conforming to `ARCHITECTURE_LOGIC.md`.

**Architecture:** Feature-Based Domain-Driven vertical slices for UI + centralized horizontal layers for data/infra (conforming to `ARCHITECTURE_LOGIC.md`). Decompose `LMSContext` into `AuthContext`, `CourseContext`, and `NotificationContext` with a transitional facade.

**Tech Stack:** React 18/19, TypeScript, Vite, Vitest, Tailwind CSS, Lucide React.

**Spec:** `docs/superpowers/specs/2026-09-19-gabay-client-cleanup-design.md`

## Global Constraints
- Every file change must strictly maintain TypeScript build pass (`npx tsc -b` exits 0).
- All 48 vitest test suites (252+ tests) must pass continuously without regressions.
- No business domain components allowed in `src/components/shared` or `src/components/ui`.
- All imports must use absolute alias `@/*`. No relative `../../` imports.
- Zero DTO types in `src/types/`. All DTO interfaces stay in `src/services/<domain>/types/`.

---

### Task 1: Dead Code & Mock Data Removal

**Files:**
- Delete: `src/data/syllabusData.ts`
- Delete: `src/data/commonsTemplates.ts`
- Delete: `src/features/misc/pages/EmptyPage.tsx`
- Delete: `src/features/misc/`
- Delete: `src/hooks/useSimulatedUpload.ts`
- Modify: `src/app/router.tsx`
- Modify: `src/services/lms/types/lms.types.ts`

**Interfaces:**
- Consumes: None
- Produces: Cleaned bundle with zero references to deleted mock files.

- [ ] **Step 1: Prune references to `EmptyPage` in router**
  In `src/app/router.tsx`:
  - Remove `const Empty = lazyWithRetry(() => import('@/features/misc/pages/EmptyPage'));`
  - Remove route `{ path: 'empty', element: withSuspense(<Empty />) }`
- [ ] **Step 2: Prune references to `syllabusData.ts` in types**
  In `src/services/lms/types/lms.types.ts`:
  - Remove `import type { OfficialSyllabusData } from '@/data/syllabusData';`
  - Replace any usage with standard structural Course/Syllabus types if referenced.
- [ ] **Step 3: Delete dead files**
  Delete:
  - `src/data/syllabusData.ts`
  - `src/data/commonsTemplates.ts`
  - `src/features/misc/pages/EmptyPage.tsx` and folder `src/features/misc`
  - `src/hooks/useSimulatedUpload.ts`
- [ ] **Step 4: Verify no dangling imports**
  Run: `git grep "syllabusData" src/` and `git grep "commonsTemplates" src/`
  Expected: 0 matches.

---

### Task 2: Relocate Misplaced Domain Components (`SpeedGraderModal`)

**Files:**
- Create/Move: `src/features/grading/components/SpeedGraderModal.tsx`
- Delete: `src/components/grading/SpeedGraderModal.tsx`
- Delete: `src/components/grading/`
- Modify: Consumers of `SpeedGraderModal`

**Interfaces:**
- Consumes: `SpeedGraderModalProps`
- Produces: `@/features/grading/components/SpeedGraderModal`

- [ ] **Step 1: Move component file**
  Move `src/components/grading/SpeedGraderModal.tsx` to `src/features/grading/components/SpeedGraderModal.tsx`.
- [ ] **Step 2: Remove empty directory**
  Remove directory `src/components/grading/`.
- [ ] **Step 3: Update consumer imports**
  In all consumers (e.g. `src/features/grading/pages/...` or `ActivitiesView.tsx`):
  Update `import { SpeedGraderModal } from '@/components/grading/SpeedGraderModal';`
  to `import { SpeedGraderModal } from '@/features/grading/components/SpeedGraderModal';`.
- [ ] **Step 4: Run grading test suite to verify**
  Run: `npx vitest run src/features/grading`
  Expected: All grading tests pass.

---

### Task 3: Resolve TypeScript Compiler Errors (`User.banner` and `isSyncing`)

**Files:**
- Modify: `src/services/lms/types/lms.types.ts`
- Modify: `src/contexts/LMSContext.tsx`
- Modify: `src/features/accounts/pages/PendingRequestsPage.tsx`
- Modify: `src/features/accounts/pages/ProfilePage.tsx`
- Modify: `src/features/assessments/pages/ExamsView.tsx`
- Modify: `src/features/assessments/pages/QuizzesView.tsx`
- Modify: `src/features/calendar/pages/CalendarPage.tsx`
- Modify: `src/features/courses/pages/AnnouncementsView.tsx`
- Modify: `src/features/courses/pages/FilesView.tsx`
- Modify: `src/features/history/pages/HistoryPage.tsx`
- Modify: `src/features/inbox/pages/InboxPage.tsx`

**Interfaces:**
- Consumes: `User`, `LMSContextType`
- Produces: Full type-check compliance (`tsc -b` exits 0).

- [ ] **Step 1: Add `banner?: string;` to `User` interface**
  In `src/services/lms/types/lms.types.ts`:
  Add `banner?: string;` to `export interface User`.
- [ ] **Step 2: Add `isSyncing: boolean;` to `LMSContextType`**
  In `src/contexts/LMSContext.tsx`:
  Add `isSyncing: boolean;` to `LMSContextType` and initialize default `isSyncing: false` in context value.
- [ ] **Step 3: Verify clean destructuring in affected view pages**
  Ensure each of the 8 view pages destructures `isSyncing` safely and type-checks cleanly without error.
- [ ] **Step 4: Run typecheck**
  Run: `npx tsc -b`
  Expected: Exits with code 0 (0 errors).

---

### Task 4: Domain-Split Context Extraction — `AuthContext`

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/contexts/AuthContext.test.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `src/services/auth/api/auth.api.ts`, `src/services/core/client.ts`
- Produces: `AuthProvider`, `useAuth()` hook with `{ user, role, token, isAuthenticated, isLoading, authReady, login, logout, updateUser, canAccess }`.

- [ ] **Step 1: Write failing unit test for AuthContext**
  Create `src/contexts/AuthContext.test.tsx` testing initial state, token restoration, login, logout, and permission check.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/contexts/AuthContext.test.tsx`
  Expected: FAIL (module does not exist).
- [ ] **Step 3: Implement `AuthContext.tsx`**
  Implement `AuthProvider` and `useAuth()` with clean token storage and session management.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/contexts/AuthContext.test.tsx`
  Expected: PASS.
- [ ] **Step 5: Mount `AuthProvider` in `src/app/App.tsx`**
  Wrap inside `<ThemeProvider>` in `src/app/App.tsx`.

---

### Task 5: Domain-Split Context Extraction — `CourseContext` & `NotificationContext`

**Files:**
- Create: `src/contexts/CourseContext.tsx`
- Create: `src/contexts/CourseContext.test.tsx`
- Create: `src/contexts/NotificationContext.tsx`
- Create: `src/contexts/NotificationContext.test.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `TermId`, `Course`
- Produces:
  - `CourseProvider`, `useCourse()` (`{ activeCourseId, setActiveCourseId, selectedSectionId, setSelectedSectionId, activeTerm, setActiveTerm }`).
  - `NotificationProvider`, `useNotifications()` (`{ unreadNotifications, unreadInboxCount, markAsRead, markAllAsRead, refreshUnreadCounts }`).

- [ ] **Step 1: Write failing unit tests for CourseContext & NotificationContext**
  Test active course selection and notification count management.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/contexts/CourseContext.test.tsx src/contexts/NotificationContext.test.tsx`
  Expected: FAIL.
- [ ] **Step 3: Implement `CourseContext.tsx` and `NotificationContext.tsx`**
  Implement providers and custom hooks.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/contexts/CourseContext.test.tsx src/contexts/NotificationContext.test.tsx`
  Expected: PASS.
- [ ] **Step 5: Mount providers in `src/app/App.tsx`**
  Mount `<CourseProvider>` and `<NotificationProvider>` under `<AuthProvider>`.

---

### Task 6: Connect Contexts to Transitional `LMSContext` Facade

**Files:**
- Modify: `src/contexts/LMSContext.tsx`
- Test: Existing `src/contexts/LMSContext*.test.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useCourse()`, `useNotifications()`
- Produces: Synchronized `LMSContextType` fulfilling backwards compatibility for all existing pages.

- [ ] **Step 1: Delegate auth, course, and notification calls in LMSContext**
  In `LMSContext.tsx`:
  Consume `useAuth()`, `useCourse()`, and `useNotifications()`, delegating active course, user auth, and notification counters.
- [ ] **Step 2: Run all LMSContext tests**
  Run: `npx vitest run src/contexts/LMSContext*.test.tsx`
  Expected: All LMSContext tests pass.

---

### Task 7: Full Suite Verification & Build Audit

**Files:**
- None (verification only)

- [ ] **Step 1: Run TypeScript compiler**
  Run: `npx tsc -b`
  Expected: 0 errors, exit code 0.
- [ ] **Step 2: Run full unit test suite**
  Run: `npx vitest run`
  Expected: All 48 test suites pass (252+ tests).
- [ ] **Step 3: Run production build**
  Run: `npm run build`
  Expected: Clean build generation in `dist/`.
