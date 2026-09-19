# Frontend Migration — Verification Log (Task 7)

Work dir: `D:\4thesis\GabaySystem\Gabay-Frontend-Prototype` (master, base `de0da9c`).
Source prototype (READ-ONLY): `D:\4thesis\GabaySystem\Gabay-Prototype\client`.
Gate per binding ruling: tsc = NO-NEW-ERRORS vs the 13-error pre-existing baseline, NOT zero errors.

## 1. AppErrorBoundary restoration (binding ruling 2)

- Ported old `client/src/App.tsx:257-338` (`ErrorBoundaryProps`, `ErrorBoundaryState`,
  `AppErrorBoundary` + recovery UI) verbatim into `src/app/App.tsx`; only change is the
  added `import React from 'react'` (old file already imported React default) — all other
  imports were already `@/` in the new file.
- Choice: wrapped `RouterProvider` in `src/app/App.tsx` (NOT main.tsx), outermost —
  mirrors the old nesting (`AppErrorBoundary` > `LMSProvider` > `GabayChatProvider` > content).
  `src/main.tsx` untouched (StrictMode + `<App/>`).
- tsc after restore: still exactly the 13 baseline errors; zero errors in `src/app/App.tsx`.

## 2. Typecheck — baseline diff (PASS, no regressions)

- Prototype `npx tsc -p tsconfig.app.json --noEmit`: **13 errors** — `isSyncing` ×8
  (AnnouncementsView, CalendarPage, ExamsView, FilesView, HistoryPage, InboxPage,
  PendingRequestsPage + QuizzesView) and `User.banner` ×5 (all in ProfilePage).
- New tree, same command: **13 errors**, same properties, same line/col numbers;
  only file paths differ (`src/pages/*` → `src/features/*/pages/*`, verified line-by-line).
- Any error NOT in the baseline: **none**. No `TS2307 cannot find module` — all `@/`
  imports and router lazy paths resolve.

## 3. Vitest totals (PASS — full parity after fix round)

- New tree `npx vitest run`: **48 files / 252 tests, all pass** — exact parity with prototype.
- Prototype `npx vitest run`: **48 files / 252 tests, all pass**.
- Fix round (commit `test: migrate remaining 8 suites to new tree`): the 8 suites missing
  from all prior briefs were migrated with import-rewrites only, zero assertion changes —
  `src/services/core/client.test.ts`, `src/services/ai-chat/api/rag.test.ts`
  (`sendRagMessage` → `ragApi.sendMessage`, verified same endpoint/signature per Task 4;
  `describe` label renamed to match, no `expect` touched), `src/layouts/AppRail.test.tsx`,
  and 5× `src/contexts/LMSContext.*.test.tsx`. All `vi.mock` paths rewritten to the exact
  `@/` specifiers the new sources import (`@/services/core/client`,
  `@/contexts/LMSContext`), so mocks intercept; new `LMSContext` confirmed to import
  `@/services/core/client` (line 47).

## 4. Architecture-compliance greps (PowerShell 5.1 has no `Select-String -Recurse`,
all runs below use the equivalent `Get-ChildItem -Recurse | Select-String`)

| Check | Result |
|---|---|
| `apiFetch\|axios\|httpClient` in `src/features` | **0** |
| `interface .*(Response\|Query\|Request)` in `src/features` | **1 — false positive**: `PendingRequestsPageProps` in `PendingRequestsPage.tsx:8`, a props interface byte-identical to prototype `src/pages/PendingRequestsPage.tsx:8`, not a DTO |
| `features/` in `src/components/shared` | **0** |
| relative `from '../` in `src/**/*.ts(x)` (both quote styles) | **0** |
| `index.ts` barrels under `src/features` | **0** |

## 5. Build + dev smoke

- `npm run build` (`tsc -b && vite build`): **FAILS at `tsc -b` on the 13 pre-existing
  baseline errors** (isSyncing/banner). This is the amended-gate consequence: no build
  script can pass until that contract debt is fixed (out of scope — would change
  logic/contracts). Escalated, not worked around.
- `npx vite build` alone: **PASS, `dist/` emitted in 5.31s** (only a chunk-size warning:
  CoursesPage 1.7MB / GabayRAGPage 598KB — code-splitting is a future concern).
- `npm run dev` (port 5199, then stopped): HTTP 200 + SPA `index.html`
  (title `GABAY System - LMS Module (DMMMSU-SLUC)`, `#root` present) for
  `/dashboard`, `/login`, `/courses/abc123/modules`. `/src/app/App.tsx` serves
  transformed with `AppErrorBoundary` + `Application Recovery` present, so the
  restored boundary ships. Client-side render assertions (LoginPage content,
  `/dashboard`→`/login` redirect, post-login modules view) need a browser and were
  NOT executed — recommend a manual click-through.
- Incidental: vite listens on IPv6 `[::1]` only (probe via `localhost`, not `127.0.0.1`);
  port 5173 was already occupied by an unrelated process; `__dirname`
  native-config warning still present (matches `vite.config.ts` pattern, cosmetic).

## 6. Leftover prototype files with no new home (listed, NOT deleted)

- `src/App.css` — dead file, zero references in prototype `src` (Vite template leftover).
- `src/assets/react.svg`, `src/assets/vite.svg` — zero references (template assets).
- The 8 unmigrated test files from §3 (sources all migrated; only the tests lack a home).
- Everything else mapped: `App.tsx` homed by split (router/layouts/contexts/app +
  boundary restored here); `api/client.ts` is line-identical to `services/core/client.ts`
  (hash differs on line-endings only); `api/rag.ts` homed by split into
  `services/ai-chat/api/rag.api.ts` + `services/ai-chat/types/rag.types.ts`
  (DTOs live in services per architecture).
- New-tree-only files by design (no prototype counterpart expected): auth guards,
  `Layout.tsx`, `CourseTabBar`, `UnenrolledState`, service barrels/placeholder indexes.

## 7. Deferred-minor list (from prior reports + this task)

1. `tsconfig.app.json` `ignoreDeprecations` flag needs an in-repo comment (Task 1).
2. Vitest/vite `__dirname` native-loader warning — cosmetic, consistent pattern (Tasks 1/3/7).
3. `CoursesPage.tsx` is 273 lines, not ~200 — remainder is the brief-assigned badge-count + view switch (Task 6).
4. Router domain names won over brief names (`inbox`, ProfilePage→accounts, history/help/misc) (Task 6).
5. `academicTerms` mojibake is PRE-EXISTING (SHA256-identical) — not this migration (Task 3).
6. 13 tsc baseline errors (`isSyncing` ×8, `User.banner` ×5) — contract owners' debt (Task 6/7).
7. 8 unmigrated test files + `npm run build` blocked by `tsc -b` on baseline debt (this task, §3/§5).
8. Dev smoke was HTTP-only; browser render check still open (this task, §5).

## 8. Hygiene

- Prototype repo untouched by this task (only reads; its dirty tree is pre-existing
  third-party work). New repo `git status` before commit: only `M src/app/App.tsx` + this log.
