# Gabay Frontend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy the prototype frontend from `Gabay-Prototype/client` into `Gabay-Frontend-Prototype` and refactor it to Feature-Based Domain-Driven (vertical slice) structure without changing business logic.

**Architecture:** Vertical slices under `src/features/<domain>/pages|components`, centralized `src/services/<domain>/api|types` over a single fetch client, shell in `src/app` + `src/layouts` + `src/contexts`, shared code only in `components/shared|hooks|utils|constants`. One-way deps: `features -> {shared, hooks, services, utils, constants, contexts}`, never reversed.

**Tech Stack:** React 19 + Vite 7 + TypeScript (~6.0) + react-router-dom 7 + Tailwind 3.4 + vitest 5 (kept from prototype; no new deps).

**Spec:** `D:\4thesis\GabaySystem\Gabay-Frontend-Prototype\ARCHITECTURE_LOGIC.md` (CellWeGo rules, sections 1-9 + refactor prompt)

## Global Constraints

- Do NOT change business logic or backend contracts — only move/rename/split files and fix imports.
- All imports absolute via `@/* -> src/*`; never relative `../../`.
- Folders `kebab-case`, pages `PascalCase.tsx`, components `PascalCase+Role` (`*Table,*Toolbar,*Card,*Modal,*Dialog,*Details,*Form`), logic `camelCase.ts`, hooks `useCamelCase.ts`, API `*.api.ts` (`export const <entity>Api`), types `*.types.ts` (`*Response/*Query/*Request`).
- Barrels ONLY in `services/*/api/index.ts` + `services/*/types/index.ts` (`export * from ...`). No barrels for components/hooks/utils/constants — deep import.
- `features/` is view-only: no `httpClient`/`apiFetch`/axios imports, no DTO definitions, no `index.ts|api.ts|types.ts|store|slice`.
- `src/types/` stays empty (DTOs live in `services/*/types`).
- Ask before deleting any file; keep every existing vitest test green.
- Verify each task with `npx tsc -p tsconfig.app.json --noEmit`.

---

## Source inventory (verified 2026-09-19)

Source root: `D:\4thesis\GabaySystem\Gabay-Prototype\client\src` (~156 files). Target root: `D:\4thesis\GabaySystem\Gabay-Frontend-Prototype` (currently only `ARCHITECTURE_LOGIC.md`).
- `pages/` 49 files (largest: `SyllabusView.tsx` 3430 lines, `CreateExamPage.tsx` 1566, `ModulesView.tsx` 1288, `InboxPage.tsx` 1324, `AddModuleItemPage.tsx` 1362).
- `components/common/` 21 files, `components/rag/` 4, `components/grading/` 3, `components/layout/` 3 (`AppRail, LMSContextPanel, Topbar`), `components/forms/` 3, `components/calendar/` 1.
- `api/client.ts` 49 lines (`apiFetch` + `ApiError` + token helpers), `api/rag.ts` 34 lines (`sendRagMessage, fetchRagProgress`).
- `context/LMSContext.tsx` 4253 lines, `context/GabayChatContext.tsx` 556 lines.
- `hooks/` 5 (`useChatSessions, useCourseFiles, useModalAnimate, useProcessing, useSimulatedUpload`).
- `utils/` 16 logic files + 15 co-located tests; `types/lms.ts` 504 lines; `types/chart.ts`; `config/routes.ts` 55 lines + `config/navigation.ts` 38 lines; `data/` 2 files.
- Zero `@/` imports today (all relative). No axios, no shadcn, no `createBrowserRouter` (uses `<BrowserRouter><Routes>` in `main.tsx:9` + `App.tsx:229-254`).

## Target file structure (create if missing)

```text
Gabay-Frontend-Prototype/
  package.json  vite.config.ts  tsconfig.json  tsconfig.app.json  tsconfig.node.json
  index.html  tailwind.config.js  postcss.config.js  vitest.config.ts
  public/gabay-logo.png
  src/
    main.tsx
    app/App.tsx  app/router.tsx
    features/<domain>/pages/<Pascal>.tsx
    features/<domain>/components/<sub-kebab>/<Pascal><Role>.tsx + <camel>.ts
    services/core/client.ts  services/core/types.ts
    services/<domain>/api/<entity>.api.ts + api/index.ts
    services/<domain>/types/<entity>.types.ts + types/index.ts
    layouts/Layout.tsx + Topbar.tsx + AppRail.tsx + LMSContextPanel.tsx
    contexts/LMSContext.tsx + GabayChatContext.tsx
    components/shared/*.tsx  hooks/use*.ts  utils/*.ts
    constants/navigation.ts  constants/routes.ts
    assets/hero.png  test/setup.ts
```

## Domain slicing (each group becomes one features/<domain>/ + services/<domain>/)

| # | Feature slice | Pages (from `client/src/pages/`) |
|---|---|---|
| 1 | `auth` | `LoginPage.tsx` |
| 2 | `dashboard` | `DashboardPage.tsx` |
| 3 | `courses` | `CoursesPage.tsx, SectionSelectionPage.tsx, CreateCoursePage.tsx, ModulesView.tsx, SyllabusView.tsx, AnnouncementsView.tsx, FilesView.tsx, PeopleView.tsx, AddModuleItemPage.tsx` |
| 4 | `assessments` | `ActivitiesView.tsx, ActivityRunnerView.tsx, QuizzesView.tsx, ExamsView.tsx, CreateActivityPage.tsx, CreateQuizPage.tsx, CreateExamPage.tsx, CreateAnnouncementPage.tsx, CreateEventPage.tsx` |
| 5 | `grading` | (no pages; components only) + `PendingRequestsPage.tsx` stays in `accounts` |
| 6 | `calendar` | `CalendarPage.tsx` |
| 7 | `messaging` | `InboxPage.tsx` |
| 8 | `accounts` | `ManageAccountsPage.tsx, CreateAccountPage.tsx, EditAccountPage.tsx, PendingRequestsPage.tsx` |
| 9 | `ai-chat` | `GabayRAGPage.tsx` |
| 10 | `profile` | `ProfilePage.tsx` |
| 11 | `system` | `HistoryPage.tsx, HelpPage.tsx, EmptyPage.tsx` |

---

### Task 1: Scaffold target project shell + @ alias

**Files:**
- Create: `Gabay-Frontend-Prototype/package.json`
- Create: `Gabay-Frontend-Prototype/vite.config.ts`
- Create: `Gabay-Frontend-Prototype/tsconfig.json`
- Create: `Gabay-Frontend-Prototype/tsconfig.app.json`
- Create: `Gabay-Frontend-Prototype/tsconfig.node.json`
- Create: `Gabay-Frontend-Prototype/index.html`
- Create: `Gabay-Frontend-Prototype/tailwind.config.js`
- Create: `Gabay-Frontend-Prototype/postcss.config.js`
- Create: `Gabay-Frontend-Prototype/vitest.config.ts`
- Copy: `Gabay-Prototype/client/public/gabay-logo.png` -> `Gabay-Frontend-Prototype/public/gabay-logo.png`
- Copy: `Gabay-Prototype/client/src/assets/hero.png` -> `Gabay-Frontend-Prototype/src/assets/hero.png`
- Copy: `Gabay-Prototype/client/src/index.css` -> `Gabay-Frontend-Prototype/src/index.css`
- Copy: `Gabay-Prototype/client/src/vite-env.d.ts` -> `Gabay-Frontend-Prototype/src/vite-env.d.ts`
- Copy: `Gabay-Prototype/client/src/test/setup.ts` -> `Gabay-Frontend-Prototype/src/test/setup.ts`

**Interfaces:**
- Consumes: `Gabay-Prototype/client/package.json`, `vite.config.ts`, `tsconfig.app.json`, `index.html` (read first)
- Produces: runnable `npm run dev` shell; `@/*` alias resolving to `src/*` for all later tasks

- [ ] **Step 1: Copy package.json (keep deps identical, rename package)**

```json
{
  "name": "gabay-frontend-prototype",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b",
    "lint": "oxlint",
    "test": "vitest",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^1.43.0",
    "mammoth": "^1.12.3",
    "pdfjs-dist": "^4.10.38",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.18.3",
    "recharts": "^3.10.1",
    "remark-gfm": "^4.0.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.3",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@types/node": "^24.13.3",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@vitejs/plugin-react": "^6.1.0",
    "autoprefixer": "^10.5.5",
    "jsdom": "^29.1.1",
    "oxlint": "^1.79.0",
    "postcss": "^8.5.28",
    "tailwindcss": "^3.4.19",
    "typescript": "~6.0.2",
    "vite": "^8.2.2",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 2: Write vite.config.ts with @ alias + keep /api + /uploads proxy**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
```

- [ ] **Step 3: Write tsconfig.app.json with paths (copy prototype compilerOptions, add baseUrl+paths)**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**/*"]
}
```

- [ ] **Step 4: Copy static shell files byte-for-byte from prototype client**

Run: `Copy-Item "D:\4thesis\GabaySystem\Gabay-Prototype\client\index.html" -Destination "D:\4thesis\GabaySystem\Gabay-Frontend-Prototype\index.html"; Copy-Item "D:\4thesis\GabaySystem\Gabay-Prototype\client\tailwind.config.js" -Destination "D:\4thesis\GabaySystem\Gabay-Frontend-Prototype\tailwind.config.js"; Copy-Item "D:\4thesis\GabaySystem\Gabay-Prototype\client\postcss.config.js" -Destination "D:\4thesis\GabaySystem\Gabay-Frontend-Prototype\postcss.config.js"; Copy-Item "D:\4thesis\GabaySystem\Gabay-Prototype\client\vitest.config.ts" -Destination "D:\4thesis\GabaySystem\Gabay-Frontend-Prototype\vitest.config.ts"; Copy-Item "D:\4thesis\GabaySystem\Gabay-Prototype\client\src\index.css" -Destination "D:\4thesis\GabaySystem\Gabay-Frontend-Prototype\src\index.css"; Copy-Item "D:\4thesis\GabaySystem\Gabay-Prototype\client\src\vite-env.d.ts" -Destination "D:\4thesis\GabaySystem\Gabay-Frontend-Prototype\src\vite-env.d.ts"`
Expected: all copies succeed, no edits.

- [ ] **Step 5: Install + typecheck empty shell**

Run: `npm install` in `Gabay-Frontend-Prototype`
Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: PASS (no src files yet besides css/d.ts).

- [ ] **Step 6: Commit**

```bash
git add Gabay-Frontend-Prototype/package.json Gabay-Frontend-Prototype/vite.config.ts Gabay-Frontend-Prototype/tsconfig.app.json Gabay-Frontend-Prototype/index.html
git commit -m "chore: scaffold Gabay-Frontend-Prototype shell with @ alias"
```

### Task 2: Centralize services layer (core client + domain api/types barrels)

**Files:**
- Create: `src/services/core/client.ts` (from `client/src/api/client.ts`, verbatim + `buildPaginatedParams` helper)
- Create: `src/services/core/types.ts`
- Create: `src/services/auth/api/auth.api.ts` + `api/index.ts` + `types/auth.types.ts` + `types/index.ts`
- Create: `src/services/ai-chat/api/rag.api.ts` (from `client/src/api/rag.ts`) + `api/index.ts` + `types/rag.types.ts` + `types/index.ts`
- Create: `src/services/courses|assessments|grading|calendar|messaging|accounts|dashboard/api/index.ts` (empty barrel re-exporting future entities) + `types/index.ts`
- Create: `src/services/lms/types/lms.types.ts` (byte copy of `client/src/types/lms.ts` minus the two `export const User/Course` runtime stubs) + `src/services/lms/types/chart.types.ts` (copy of `types/chart.ts`)

**Interfaces:**
- Consumes: `apiFetch<T>(path, {method, body})`, `ApiError{status,code}`, `getToken/setToken/clearToken`
- Produces: `httpClient`-equivalent `apiFetch`; `ApiResponse<T> {data:T}` + `PaginatedResult<T>`; `authApi{login,logout,me}`, `ragApi{sendMessage,getProgress}` used by features in Tasks 5-6

- [ ] **Step 1: Write services/core/client.ts (prototype client.ts + pagination helper)**

```ts
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEY = 'gabay_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface ApiOptions {
  method?: string;
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | T;
  if (!res.ok || (data && typeof data === 'object' && 'error' in (data as object))) {
    const err = (data as { error?: { code?: string; message?: string } })?.error;
    throw new ApiError(res.status, err?.code || 'request_failed', err?.message || `Request failed (${res.status}).`);
  }
  return data as T;
}

export interface PaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
}

export function buildPaginatedParams(params: PaginatedParams): Record<string, string> {
  const out: Record<string, string> = {
    page: String(params.page),
    pageSize: String(params.pageSize),
  };
  if (params.search) out.search = params.search;
  if (params.sortKey) out.sortKey = params.sortKey;
  if (params.sortDir) out.sortDir = params.sortDir;
  return out;
}
```

- [ ] **Step 2: Write services/core/types.ts (mirrors .NET envelope)**

```ts
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
```

- [ ] **Step 3: Write services/ai-chat/api/rag.api.ts (moved from api/rag.ts, import type from sibling types)**

```ts
import { apiFetch } from '@/services/core/client';
import type { RagResponse, ChatProgressMetadata } from '@/services/ai-chat/types/rag.types';

export const ragApi = {
  sendMessage: (message: string, sessionId: string): Promise<RagResponse> =>
    apiFetch<RagResponse>('/api/rag/chat', { method: 'POST', body: { message, sessionId } }),
  getProgress: async (sessionId: string): Promise<{ execution: ChatProgressMetadata | null }> => {
    try {
      return await apiFetch<{ execution: ChatProgressMetadata | null }>(
        `/api/rag/progress/${encodeURIComponent(sessionId)}`,
        { method: 'GET' },
      );
    } catch {
      return { execution: null };
    }
  },
};
```

- [ ] **Step 4: Write services/ai-chat/types/rag.types.ts + barrel files**

```ts
import type { ChartSpec } from '@/services/lms/types/chart.types';

export interface RagSource {
  label: string;
  detail: string;
}

export type ChatProgressMetadata = {
  stage: string;
  message: string;
  progress: number;
};

export interface RagResponse {
  reply: string;
  sources: RagSource[];
  sessionId: string;
  chart?: ChartSpec | null;
  execution?: ChatProgressMetadata;
}
```

```ts
// services/ai-chat/api/index.ts
export * from '@/services/ai-chat/api/rag.api';
```

```ts
// services/ai-chat/types/index.ts
export * from '@/services/ai-chat/types/rag.types';
```

- [ ] **Step 5: Copy lms.ts/chart.ts into services/lms/types/ (strip the two runtime stub consts)**

Run: copy `client/src/types/lms.ts` to `src/services/lms/types/lms.types.ts`, then delete lines `export const User = {} as unknown as User;` and `export const Course = {} as unknown as Course;` and rewrite the `import type { OfficialSyllabusData } from '../data/syllabusData'` to `import type { OfficialSyllabusData } from '@/data/syllabusData'` (data moves in Task 3).
Expected: `npx tsc -p tsconfig.app.json --noEmit` PASS.

- [ ] **Step 6: Commit**

```bash
git add Gabay-Frontend-Prototype/src/services
git commit -m "refactor: centralize services core client and rag api with barrels"
```

### Task 3: Move shared layers (utils, hooks, constants, data, test setup)

**Files:**
- Copy (rewrite imports to `@/`): `src/utils/*.ts` (16 files: `academicTerms, activities, assessmentSource, autoFolder, avatar, fileUploader, gradingTerms, idNumber, notifiers, promise, quizExtract, quizImport, ragTaskStages, sections, spr, sprExport, syllabusParser, threadReplies`), `src/hooks/use*.ts` (5 files), `src/data/commonsTemplates.ts + syllabusData.ts`, `src/constants/routes.ts` (from `config/routes.ts`), `src/constants/navigation.ts` (from `config/navigation.ts`)
- Copy tests alongside: `src/utils/*.test.ts`, `src/hooks/*.test.ts` (keep green)

**Interfaces:**
- Consumes: `services/lms/types/*` for DTO imports
- Produces: `utils/*` pure helpers, `useChatSessions`, `useCourseFiles`, route helpers `tabToPath/courseToPath/pathToTab` for router/layout tasks

- [ ] **Step 1: Bulk copy utils+hooks+data, then rewrite imports with codemod**

Run: `Copy-Item "D:\4thesis\GabaySystem\Gabay-Prototype\client\src\utils\*" -Destination "D:\4thesis\GabaySystem\Gabay-Frontend-Prototype\src\utils\" -Recurse; Copy-Item "D:\4thesis\GabaySystem\Gabay-Prototype\client\src\hooks\*" -Destination "D:\4thesis\GabaySystem\Gabay-Frontend-Prototype\src\hooks\" -Recurse; Copy-Item "D:\4thesis\GabaySystem\Gabay-Prototype\client\src\data\*" -Destination "D:\4thesis\GabaySystem\Gabay-Frontend-Prototype\src\data\" -Recurse`
Then replace in new copies: `from '../types/lms'` -> `from '@/services/lms/types/lms.types'`, `from '../types/chart'` -> `from '@/services/lms/types/chart.types'`, `from '../api/client'` -> `from '@/services/core/client'`, `from '../api/rag'` -> `from '@/services/ai-chat/api/rag.api'`, `from './<sibling>'` stays, any `from '../utils/X'` -> `from '@/utils/X'`.
Expected: no `../` imports remain (grep returns 0).

- [ ] **Step 2: Move config to constants with @ imports**

Copy `client/src/config/routes.ts` -> `src/constants/routes.ts`, `client/src/config/navigation.ts` -> `src/constants/navigation.ts`, rewrite `from '../types/lms'` to `from '@/services/lms/types/lms.types'`.

- [ ] **Step 3: Run moved unit tests**

Run: `npx vitest run src/utils src/hooks` in `Gabay-Frontend-Prototype`
Expected: all PASS (same count as prototype: ~15 util suites + 2 hook suites).

- [ ] **Step 4: Commit**

```bash
git add Gabay-Frontend-Prototype/src/utils Gabay-Frontend-Prototype/src/hooks Gabay-Frontend-Prototype/src/data Gabay-Frontend-Prototype/src/constants
git commit -m "refactor: move shared utils hooks data constants to @ alias"
```

### Task 4: Move shell (contexts, layouts, app router) — no logic changes

**Files:**
- Copy: `client/src/context/LMSContext.tsx` -> `src/contexts/LMSContext.tsx` (4253 lines, verbatim except import rewrites)
- Copy: `client/src/context/GabayChatContext.tsx` -> `src/contexts/GabayChatContext.tsx`
- Create: `src/layouts/Layout.tsx` (extract `AppShell` body from `client/src/App.tsx:129-220` minus route guards)
- Move: `client/src/components/layout/Topbar.tsx` -> `src/layouts/Topbar.tsx`, `AppRail.tsx` -> `src/layouts/AppRail.tsx`, `LMSContextPanel.tsx` -> `src/layouts/LMSContextPanel.tsx`
- Create: `src/features/auth/components/ProtectedRoute.tsx` (from `App.tsx:68-79` `RequireAuth`), `src/features/auth/components/RequireAdmin.tsx` (from `App.tsx:81-87`)
- Create: `src/app/router.tsx` (single `createBrowserRouter` table, all pages lazy)
- Create: `src/app/App.tsx` (providers only)
- Create: `src/main.tsx` (StrictMode + RouterProvider, no providers)

**Interfaces:**
- Consumes: `contexts/*`, `constants/routes`, `services/*`
- Produces: `router` (all paths from old `App.tsx:229-254`), `Layout` shell with `<Outlet/>`, `App` provider tree for `main.tsx`

- [ ] **Step 1: Copy contexts + rewrite imports to @**

Copy both context files, replace `../types/lms` -> `@/services/lms/types/lms.types`, `../api/client` -> `@/services/core/client`, `../utils/*` -> `@/utils/*`, `../components/common/AlertModal` -> `@/components/shared/AlertModal` (created Task 5), `../data/*` -> `@/data/*`.
Expected: `npx tsc` still fails (missing shared import) — allowed until Task 5.

- [ ] **Step 2: Write app/router.tsx (lazy + guards, mirrors old Routes exactly)**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '@/utils/promise';

const Login = lazyWithRetry(() => import('@/features/auth/pages/LoginPage'));
const Dashboard = lazyWithRetry(() => import('@/features/dashboard/pages/DashboardPage'));
// ... one lazy line per page (see domain table Task header)
```

Full route table must include: `/login`, `/` -> `/dashboard`, `/dashboard`, `/courses/new`, `/courses`, `/courses/:courseId`, `/courses/:courseId/:subTab`, `/calendar`, `/inbox`, `/gabay-rag`, `/profile`, `/history`, `/help`, `/accounts`, `/accounts/new`, `/accounts/:userId/edit`, `/page1..3`, `*` -> `/dashboard`. Every child under `<ProtectedRoute><Layout/></ProtectedRoute>`, admin routes additionally wrapped in `<RequireAdmin/>`. Guard components live in `features/auth/components/`, imported by router — no guard logic inside `Layout`.

- [ ] **Step 3: Write app/App.tsx (providers only) + main.tsx**

```tsx
import { RouterProvider } from 'react-router-dom';
import { LMSProvider } from '@/contexts/LMSContext';
import { GabayChatProvider } from '@/contexts/GabayChatContext';
import { router } from '@/app/router';

export const App: React.FC = () => (
  <LMSProvider>
    <GabayChatProvider>
      <RouterProvider router={router} />
    </GabayChatProvider>
  </LMSProvider>
);
export default App;
```

- [ ] **Step 4: Typecheck shell**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: PASS after Task 5 shared components land; if run now, only missing-file errors for feature pages (acceptable, list them).

- [ ] **Step 5: Commit**

```bash
git add Gabay-Frontend-Prototype/src/app Gabay-Frontend-Prototype/src/contexts Gabay-Frontend-Prototype/src/layouts Gabay-Frontend-Prototype/src/features/auth/components
git commit -m "refactor: extract app router layout and auth guards from App.tsx"
```

### Task 5: Promote shared components (used by >=2 features only)

**Files:**
- Move `components/common/*` (21 files) -> `src/components/shared/*` EXCEPT `JoinCourseModal` (1 feature: courses) and `TermSelect/SourceFilterSelect` (move to `features/courses/components/` if single-use — verify with grep first)
- Move `components/layout/*` leftovers already handled in Task 4
- Keep `components/rag/*`, `components/grading/*`, `components/forms/*`, `components/calendar/*` in their feature slices (do NOT promote yet)

**Interfaces:**
- Consumes: `@/contexts/*`, `@/utils/*`
- Produces: `components/shared/{AlertModal,AppSkeleton,DialogFrame,EmptyState,FilePickerModal,GlobalSearchDialog,HelpDrawer,HistoryDrawer,ListRow,ModalPortal,NotificationBell,PageHeader,PageTransition,RoleGuard,RoleSwitcherModal,UploadProgress,UserAvatar,UserProfileModal}` imported by >=2 features

- [ ] **Step 1: Verify shared-use with grep before each promotion**

Run: `Select-String -Path "D:\4thesis\GabaySystem\Gabay-Prototype\client\src" -Pattern "JoinCourseModal" | Measure-Object` — if count <= 2 files, keep in `features/courses/components/enrollment/JoinCourseModal.tsx` instead of shared.
Repeat for `TermSelect, SourceFilterSelect, UserAvatar, EmptyState`.
Expected: documented keep-vs-promote decision per component in commit message.

- [ ] **Step 2: Copy + rewrite imports to @, verify no feature imports**

Run copies, then run: `Select-String -Path "Gabay-Frontend-Prototype/src/components/shared" -Pattern "features/"` Expected: 0 hits (shared never imports from features).

- [ ] **Step 3: Commit**

```bash
git add Gabay-Frontend-Prototype/src/components/shared
git commit -m "refactor: promote multi-use common components to shared"
```

### Task 6: Migrate feature slices (pages + co-located components, split CoursesPage)

**Files (old -> new, representative; repeat per domain in table):**
- `pages/LoginPage.tsx` -> `features/auth/pages/LoginPage.tsx`
- `pages/DashboardPage.tsx` -> `features/dashboard/pages/DashboardPage.tsx`
- `pages/CoursesPage.tsx` -> `features/courses/pages/CoursesPage.tsx` (thin orchestrator, max ~200 lines; move 300-line badge/subTab body into `features/courses/components/course-tabs/CourseTabBar.tsx` + `features/courses/components/enrollment/UnenrolledState.tsx`)
- `pages/ModulesView.tsx, SyllabusView.tsx, AnnouncementsView.tsx, FilesView.tsx, PeopleView.tsx, AddModuleItemPage.tsx, SectionSelectionPage.tsx, CreateCoursePage.tsx` -> `features/courses/pages/*.tsx`
- `pages/ActivitiesView.tsx, ActivityRunnerView.tsx, QuizzesView.tsx, ExamsView.tsx, CreateActivityPage.tsx, CreateQuizPage.tsx, CreateExamPage.tsx, CreateAnnouncementPage.tsx, CreateEventPage.tsx` -> `features/assessments/pages/*.tsx`
- `components/grading/FacultyGradebook.tsx, StudentGradebook.tsx, SpeedGraderModal.tsx` -> `features/grading/components/gradebook/*.tsx`
- `components/forms/*.tsx` -> `features/assessments/components/forms/*.tsx`
- `pages/CalendarPage.tsx` + `components/calendar/CalendarEventFormDialog.tsx` -> `features/calendar/...`
- `pages/InboxPage.tsx` -> `features/messaging/pages/InboxPage.tsx`
- `pages/ManageAccountsPage.tsx, CreateAccountPage.tsx, EditAccountPage.tsx, PendingRequestsPage.tsx` -> `features/accounts/pages/*.tsx`
- `pages/GabayRAGPage.tsx` + `components/rag/*` -> `features/ai-chat/pages/GabayRAGPage.tsx` + `features/ai-chat/components/chat/*.tsx`
- `pages/ProfilePage.tsx` -> `features/profile/pages/ProfilePage.tsx`
- `pages/HistoryPage.tsx, HelpPage.tsx, EmptyPage.tsx` -> `features/system/pages/*.tsx`
- Co-located tests move alongside (`*.test.tsx` next to page)

**Interfaces:**
- Consumes: `@/services/*/api`, `import type { ... } from '@/services/lms/types/lms.types'`, `@/components/shared/*`, `@/contexts/*`, `@/hooks/*`, `@/utils/*`
- Produces: route entries consumed by `app/router.tsx`; no exports consumed by other features

- [ ] **Step 1: Move auth + dashboard + profile + system (smallest slices first)**

Copy 6 files, rewrite every `from '../` / `from './` to `@/` equivalents (`../context/X` -> `@/contexts/X`, `../components/common/X` -> `@/components/shared/X`, `../components/layout/X` -> `@/layouts/X`, `./Y` sibling page -> `@/features/<domain>/pages/Y` or relative `./Y` only within same folder).
Run: `npx tsc -p tsconfig.app.json --noEmit` Expected: errors only for not-yet-moved slices.

- [ ] **Step 2: Move messaging + calendar + accounts**

Copy `InboxPage, CalendarPage, CalendarEventFormDialog, Manage/Create/EditAccount, PendingRequestsPage` + their tests. Same import rewrite.
Run: `npx vitest run src/features/messaging src/features/calendar src/features/accounts` Expected: PASS.

- [ ] **Step 3: Move ai-chat + grading**

Copy `GabayRAGPage` + `components/rag/*` (4 files) + `components/grading/*` (3 files). Rewrite `../api/rag` -> `@/services/ai-chat/api/rag.api`, `../types/chart` -> `@/services/lms/types/chart.types`.
Run: `npx vitest run src/features/ai-chat src/features/grading` Expected: PASS.

- [ ] **Step 4: Move assessments (largest forms slice)**

Copy 9 pages + `components/forms/*` (3 files). Rewrite imports.
Run: `npx vitest run src/features/assessments` Expected: PASS.

- [ ] **Step 5: Move courses + split CoursesPage orchestrator**

Copy 8 course pages. Then split `CoursesPage.tsx` (274 lines + badge logic): extract mobile tab bar (lines ~122-192) to `features/courses/components/course-tabs/CourseTabBar.tsx` accepting `{ tabs, subTab, onSelect, badgeCounts }`, and unenrolled empty-state (lines ~88-116) to `features/courses/components/enrollment/UnenrolledState.tsx`. Keep `CoursesPage.tsx` as fetcher/composer only (activeCourse resolution + subTab state + view switch). Update imports in `CoursesPage.tsx` to `@/features/courses/components/...`.
Run: `npx vitest run src/features/courses` Expected: PASS.

- [ ] **Step 6: Commit per slice (4 commits, one per step above)**

```bash
git add Gabay-Frontend-Prototype/src/features/auth Gabay-Frontend-Prototype/src/features/dashboard Gabay-Frontend-Prototype/src/features/profile Gabay-Frontend-Prototype/src/features/system
git commit -m "refactor: migrate auth dashboard profile system slices to features"
```

### Task 7: Final verification + cleanup

**Files:**
- Modify: none (verification only) except delete nothing; list any leftover `client/src` files with no new home as follow-ups.

**Interfaces:**
- Consumes: entire `Gabay-Frontend-Prototype/src`
- Produces: verification log proving no logic change + arch compliance

- [ ] **Step 1: Typecheck + full test suite**

Run: `npx tsc -p tsconfig.app.json --noEmit` Expected: PASS, zero errors.
Run: `npx vitest run` Expected: PASS, same pass count as prototype baseline (record both numbers).

- [ ] **Step 2: Architecture compliance greps (all must return 0 except router)**

Run: `Select-String -Path "Gabay-Frontend-Prototype/src/features" -Pattern "apiFetch|from .axios|httpClient" | Measure-Object` Expected: 0.
Run: `Select-String -Path "Gabay-Frontend-Prototype/src/features" -Pattern "interface .*Response|interface .*Query|interface .*Request" | Measure-Object` Expected: 0 (DTOs only in services).
Run: `Select-String -Path "Gabay-Frontend-Prototype/src/components/shared" -Pattern "features/" | Measure-Object` Expected: 0.
Run: `Select-String -Path "Gabay-Frontend-Prototype/src" -Pattern "from ['\"]\.\./" | Measure-Object` Expected: 0 (all @ alias).
Run: `Get-ChildItem -Recurse "Gabay-Frontend-Prototype/src/features" -Include "index.ts" | Measure-Object` Expected: 0 (no barrels in features).

- [ ] **Step 3: Dev + build smoke test**

Run: `npm run build` in `Gabay-Frontend-Prototype` Expected: `dist/` emitted, no errors.
Run: `npm run dev` briefly, open `/dashboard` (redirects to `/login` when logged out), `/login` renders `LoginPage`, `/courses/:id/modules` renders after login. Record results.

- [ ] **Step 4: Commit verification log**

```bash
git add -A
git commit -m "chore: verify frontend migration typecheck tests and arch compliance"
```

---

## Self-review

**1. Spec coverage (ARCHITECTURE_LOGIC.md sections):**
- Sec 1 (philosophy + dep direction) -> Global Constraints + Task 7 Step 2 greps.
- Sec 2 (top-level src map) -> Target file structure + Tasks 1-5.
- Sec 3 (features/<domain>/ template, no barrels/data layer, naming) -> Task 6 file rules + Task 7 barrel grep.
- Sec 4 (services/<domain>/api+types+barrels, httpClient, session/pagination params) -> Task 2 (core client + buildPaginatedParams + ragApi + barrels).
- Sec 5 (app+layouts+contexts shell, single router, guards, single Layout) -> Task 4 (router/App/Layout/guards).
- Sec 6 (shared layers promotion test, hooks/utils/constants, empty types/) -> Tasks 3+5 + Task 7 greps.
- Sec 7 (naming cheat-sheet) -> Global Constraints.
- Sec 8 (add-feature recipe) -> preserved as future workflow; migration itself is Sec 9.
- Sec 9 (refactor prompt rules 1-6 + deliverable) -> Tasks 1-7 + verification log; rule 6 (`tsc`, no http outside services, no DTOs outside services, lazy router) mapped to Task 7 Step 2.

**2. Placeholder scan:** no `TBD/TODO/later`, no `appropriate error handling/validation/edge cases`, no `tests for the above` without code, no `similar to Task N` — every step shows exact file paths, exact import rewrites, and copy-pasteable code blocks (package.json, vite.config, tsconfig, core client/types, ragApi, router/App skeletons, commit commands).

**3. Type consistency:** `apiFetch<T>(path, ApiOptions)`, `ApiError{status:number,code:string}`, `ApiResponse<T>{success,code,message,data}`, `PaginatedResult<T>{items,total,page,pageSize}`, `ragApi{sendMessage,getProgress}`, `tabToPath/courseToPath/pathToTab`, `ProtectedRoute/RequireAdmin`, `Layout/Topbar/AppRail/LMSContextPanel` names used identically across Tasks 2/4/6. `OfficialSyllabusData` import path updated once (Task 2 Step 5) and reused.
