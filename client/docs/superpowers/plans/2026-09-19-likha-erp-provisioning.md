# Likha ERP Backend Provisioning & Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision the Likha ERP backend at `https://gabay.zyberlab.com/` with all necessary schemas, collections, custom user fields, and permissions, then integrate `@likha-erp/likha-sdk` directly into the Gabay client application.

**Architecture:** Automated TypeScript provisioning script configures Directus collections and fields on `https://gabay.zyberlab.com/`. The client web application connects directly to Likha ERP via `@likha-erp/likha-sdk` (`rest()` + `authentication()`), eliminating intermediate backend daemons while strictly isolating from RAG/n8n services.

**Tech Stack:** React 19, TypeScript, Vite, `@likha-erp/likha-sdk@^1.0.7`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-likha-erp-backend-design.md`

## Global Constraints
- Target backend: `https://gabay.zyberlab.com/`
- Directus admin credentials: `jayveegenetareyes@gmail.com` / `qwerty12345`
- Zero external Node.js backend daemon (Direct client-to-Likha communication only).
- Completely ignore and exclude RAG / n8n files and services.
- Keep repository `https://github.com/Axxues/Gabay` updated upon completion.

---

### Task 1: Install `@likha-erp/likha-sdk` and Scaffold Core Likha Client

**Files:**
- Modify: `package.json`
- Create: `src/services/core/likhaClient.ts`
- Modify: `src/services/core/types.ts`
- Create: `src/services/core/likhaClient.test.ts`

**Interfaces:**
- Produces: `likha` client instance, `LikhaSchema` type definition.

- [ ] **Step 1: Install `@likha-erp/likha-sdk` dependency**
Run: `npm install @likha-erp/likha-sdk` in `D:\4thesis\GabaySystem\Gabay\client`
Verify: `package.json` contains `@likha-erp/likha-sdk`

- [ ] **Step 2: Write failing unit test for `likhaClient.ts`**
Create `src/services/core/likhaClient.test.ts` to verify `likha` export and initialization.

- [ ] **Step 3: Implement `src/services/core/likhaClient.ts` and `types.ts`**
Define collections interface in `types.ts` and export configured client in `likhaClient.ts`.

- [ ] **Step 4: Run unit test and verify pass**
Run: `npx vitest run src/services/core/likhaClient.test.ts`

- [ ] **Step 5: Commit**
`git add package.json package-lock.json src/services/core/`
`git commit -m "feat(core): install @likha-erp/likha-sdk and setup core likha client"`

---

### Task 2: Automated Likha ERP Schema Provisioning Script

**Files:**
- Create: `scripts/provision-likha-schema.ts`

**Interfaces:**
- Consumes: Admin credentials `jayveegenetareyes@gmail.com` / `qwerty12345`, Likha REST API (`/auth/login`, `/collections`, `/fields`).
- Produces: 11 collections (`courses`, `course_modules`, `course_enrollments`, `assessments`, `submissions`, `grades`, `course_grading_configs`, `calendar_events`, `announcements`, `messages`, `activity_logs`) and custom `directus_users` fields.

- [ ] **Step 1: Write `scripts/provision-likha-schema.ts`**
Create provisioning script that authenticates via Directus JWT, iterates through collection definitions, creates missing collections and fields via `POST /collections` and `POST /fields/:collection`, and seeds initial course records.

- [ ] **Step 2: Run provisioning script against `https://gabay.zyberlab.com/`**
Run: `npx tsx scripts/provision-likha-schema.ts`
Expected: HTTP 200/204 creation responses, exiting with "Provisioning completed successfully".

- [ ] **Step 3: Verify collections in Likha ERP**
Execute query or curl against `https://gabay.zyberlab.com/collections` with token to confirm all collections are active.

- [ ] **Step 4: Commit**
`git add scripts/provision-likha-schema.ts`
`git commit -m "feat(backend): add automated Likha ERP schema provisioning script"`

---

### Task 3: Implement Domain API Services with Likha SDK

**Files:**
- Modify: `src/services/auth/api/auth.api.ts`
- Modify: `src/services/courses/api/index.ts`
- Modify: `src/services/assessments/api/index.ts`
- Modify: `src/services/grading/api/index.ts`
- Modify: `src/services/calendar/api/index.ts`
- Modify: `src/services/inbox/api/index.ts`
- Create: `src/services/courses/api/courses.api.test.ts`

**Interfaces:**
- Produces: `coursesApi.listCourses()`, `coursesApi.getCourseById()`, `assessmentsApi.listForCourse()`, `gradingApi.getStudentGrades()`, `calendarApi.listEvents()`, `inboxApi.listMessages()`.

- [ ] **Step 1: Write failing test for `courses.api.ts`**
Verify `coursesApi` functions return typed course records.

- [ ] **Step 2: Implement domain API methods using `@likha-erp/likha-sdk` composables (`readItems`, `createItem`, `updateItem`)**
Wrap SDK calls with error handling and fallback behavior.

- [ ] **Step 3: Update `auth.api.ts` with Likha login and profile fetching**
Use `likha.login()` and `likha.request(readMe())`.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run src/services/courses/api/courses.api.test.ts`

- [ ] **Step 5: Commit**
`git add src/services/`
`git commit -m "feat(services): implement domain API services with Likha SDK"`

---

### Task 4: Connect Frontend Contexts to Likha API Services

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/contexts/LMSContext.tsx`
- Modify: `src/contexts/CourseContext.tsx`

**Interfaces:**
- Consumes: `authApi`, `coursesApi`, `assessmentsApi`, `gradingApi`.
- Produces: Reactive state loaded from Likha ERP with offline resilience.

- [ ] **Step 1: Wire `AuthContext` to Likha Auth**
Replace stub with `authApi.login` and profile hydration.

- [ ] **Step 2: Wire `LMSContext` initial load to Likha Collections**
Fetch courses, announcements, calendar events on mount, falling back to cached state if network fails.

- [ ] **Step 3: Wire submissions and grade updates to Likha**
Dispatch creates/updates to `submissions` and `grades` collections.

- [ ] **Step 4: Verify application tests**
Run: `npx vitest run`

- [ ] **Step 5: Commit**
`git add src/contexts/`
`git commit -m "feat(contexts): connect AuthContext and LMSContext to Likha ERP services"`

---

### Task 5: End-to-End Build Verification & Git Sync

**Files:**
- All modified files

- [ ] **Step 1: Type check**
Run: `npx tsc -b` in `Gabay/client` (must output 0 errors).

- [ ] **Step 2: Run full test suite**
Run: `npx vitest run` (all 51+ test suites must pass).

- [ ] **Step 3: Build production bundle**
Run: `npm run build` (must succeed with 0 errors).

- [ ] **Step 4: Git push to remote**
Run: `git push origin main` to `https://github.com/Axxues/Gabay`.
