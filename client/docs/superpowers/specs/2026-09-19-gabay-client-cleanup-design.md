# Design Spec: Gabay Client Clean-up & Architecture Alignment

**Date**: 2026-09-19  
**Status**: Approved by User  
**Target Repository**: `D:\4thesis\GabaySystem\Gabay\client`  
**Reference Architecture**: `D:\4thesis\GabaySystem\Gabay\client\ARCHITECTURE_LOGIC.md`

---

## 1. Executive Summary & Goal
Clean and refactor the `Gabay\client` frontend codebase to eliminate mock data bloat, prune dead files and placeholder routes, resolve all TypeScript build errors (`tsc -b`), relocate misplaced domain components in strict adherence to `ARCHITECTURE_LOGIC.md`, and decompose the 180KB monolithic `LMSContext` into focused domain contexts (`AuthContext`, `CourseContext`, `NotificationContext`).

---

## 2. Scope of Changes

### 2.1 Dead Code & Mock Data Pruning
The following files and folders will be removed completely:
1. `src/data/syllabusData.ts`: 51KB of legacy mock curriculum JSON.
2. `src/data/commonsTemplates.ts`: Unused template mocks.
3. `src/features/misc/pages/EmptyPage.tsx` and the `src/features/misc/` folder.
4. `src/hooks/useSimulatedUpload.ts`: Dead simulated upload hook.
5. In `src/app/router.tsx`: Remove the `/empty` route entry and the `Empty` lazy import.

### 2.2 Component Relocation (Architecture Rule 6)
In `ARCHITECTURE_LOGIC.md`, `src/components/shared/` and `src/components/ui/` are reserved strictly for cross-domain primitives reused across ≥ 2 domains. Single-domain components must live within their respective feature slices:
1. Move `src/components/grading/SpeedGraderModal.tsx` to `src/features/grading/components/SpeedGraderModal.tsx`.
2. Delete the now-empty `src/components/grading/` directory.
3. Update all import statements referencing `@/components/grading/SpeedGraderModal` to `@/features/grading/components/SpeedGraderModal`.

### 2.3 TypeScript Build & Type Hygiene
Resolve all 8 compilation errors currently failing `tsc -b`:
1. **`User.banner` Error in `ProfilePage.tsx`**:
   - Update `User` interface in `src/services/lms/types/lms.types.ts` to include optional `banner?: string;`.
   - Remove stale import `import type { OfficialSyllabusData } from '@/data/syllabusData';` from `lms.types.ts`.
2. **`isSyncing` Errors Across 8 View Pages**:
   - Add `isSyncing: boolean` to `LMSContextType` in `src/contexts/LMSContext.tsx` with default value `false`.
   - In `PendingRequestsPage.tsx`, `ExamsView.tsx`, `QuizzesView.tsx`, `CalendarPage.tsx`, `AnnouncementsView.tsx`, `FilesView.tsx`, `HistoryPage.tsx`, and `InboxPage.tsx`, ensure `(isLoading || isSyncing)` checks are clean and type-safe.

### 2.4 Domain-Split Context Architecture
Decompose the 180KB monolithic `LMSContext.tsx` into single-responsibility domain contexts:
1. **`src/contexts/AuthContext.tsx` (`useAuth`)**:
   - Manages `user: User | null`, `token: string | null`, `role: UserRole | null`, `isAuthenticated: boolean`, `isLoading: boolean`, and `authReady: boolean`.
   - Exposes `login()`, `logout()`, `updateUser()`, and permission checks.
   - Integrates with `src/services/auth/api/auth.api.ts` and `src/services/core/client.ts`.
2. **`src/contexts/CourseContext.tsx` (`useCourse`)**:
   - Manages `activeCourseId: string | null`, `selectedSectionId: string | null`, `activeTerm: TermId`.
   - Exposes `setActiveCourseId()`, `setSelectedSectionId()`, `setActiveTerm()`, and term filtering.
3. **`src/contexts/NotificationContext.tsx` (`useNotifications`)**:
   - Manages badge counters and notifications (`unreadNotifications`, `unreadInboxCount`).
   - Exposes `markAsRead()`, `markAllAsRead()`, and `refreshUnreadCounts()`.
4. **`src/contexts/LMSContext.tsx` (Transitional Compatibility Facade)**:
   - Composes `useAuth()`, `useCourse()`, and `useNotifications()`.
   - Preserves `useLMS()` API compatibility so that existing consuming pages and all 48 test suites in vitest continue functioning without regressions during migration.
5. **Global Wiring in `src/app/App.tsx`**:
   - Mounts providers hierarchically:
     `ThemeProvider` -> `AuthProvider` -> `CourseProvider` -> `NotificationProvider` -> `LMSProvider` -> `RouterProvider`.

---

## 3. Verification & Acceptance Criteria
1. **Typecheck Verification**: `npx tsc -b` passes with **0 errors**.
2. **Production Build Verification**: `npm run build` succeeds and produces `dist/` cleanly.
3. **Unit Test Verification**: `npx vitest run` passes **100% of all 48 test suites (252+ tests)**.
4. **Architectural Verification**:
   - Zero mock files remain in `src/data/`.
   - No domain components outside `src/features/`.
   - No orphaned imports referencing deleted files.
