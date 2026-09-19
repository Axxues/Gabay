# CellWeGo Admin Frontend — Architecture Logic

> Source: `Frontend/Admin/src` — React 19 + Vite 7 + TypeScript + `react-router@7` + axios + SignalR + shadcn/radix + Tailwind.
> Alias: single `@/* -> src/*` (`vite.config.ts:11-13`, `tsconfig.app.json:11-14`). All imports are absolute (`@/features/...`, `@/services/...`), never relative `../../`.

## 1. Philosophy in one sentence

**Feature-Based Domain-Driven vertical slices for UI + centralized horizontal layers for data/infra.**
`ARCHITECTURE_COMPARISON.html` states this explicitly: old ERC-AMS was technical-layered (`src/pages/` flat + `src/components/` unified + `src/api/` centralized, low cohesion) → CellWeGo is `src/features/<domain>/pages|components` self-contained, high cohesion.

Rule of thumb:
- `features/` = **view-only**. Pages orchestrate, components render, co-located `*.ts` only does pure view-model transforms.
- `services/` = **data + backend contract**. The only place that talks HTTP.
- `app/ + layouts/ + contexts/` = **shell**. Routing, app frame, global state.
- `components/ + hooks/ + utils/ + constants/` = **shared**. Only if used by ≥2 features, pure/generic, or mirrors backend.

Dependency direction is strictly one-way:

```
features -> { components/shared, hooks, services, utils, constants, contexts }
utils -> services/core/types
services/<domain>/api -> { services/core/client, utils/auth, utils/api }
NEVER reverse (shared never imports from features)
```

## 2. Top-level `src/` map

| Folder | Purpose | What lives there |
|---|---|---|
| `app/App.tsx` | Global wiring | All providers + `RouterProvider` + `Toaster` + offline-queue bootstrap |
| `app/router.tsx` | Single route table | ~781 lines, ~100+ routes, `createBrowserRouter`. Only place routes are added |
| `features/` | 28 domain slices | `accounts-payable, accounts-receivable, after-sales, ai, asset-status, auth, basic-information, billing, calendar, company, customer, dashboard, expense, finance, inventory, inventory-assets, messaging, miscellaneous, permission, reports, resource-center, revenue, sales, scanner, system, users, work-order, workforce` |
| `services/` | 25 backend domains | Mirrors features 1:1 (`inventory, sales, work-order, ...`) + `core/, client/, uploader/, logs/, user/, vendor/` |
| `layouts/` | Authenticated shell | `Layout.tsx` (only layout), `Navbar.tsx`, `Sidebar.tsx`, `UniversalSearchUnitDialog.tsx` |
| `contexts/` | Global state (no Redux/Zustand) | `AuthContext, LanguageContext, SignalRContext, MessagingSignalRContext, CartContext, DashboardCurrencyContext` |
| `components/ui/` | Primitive design system | 45 shadcn/radix files, kebab-case (`button.tsx`, `input-otp.tsx`), `utils.ts` with `cn()` |
| `components/shared/` | Reused domain widgets | 10 files: `TablePagination, PermissionGuard (PermissionRoute), RouteErrorBoundary, AutoReloadErrorBoundary, ConfirmActionModal, DeleteConfirmationModal, SmartSearchInput, QrCodeScanner, ThermalQRDialog, ReceiptA4Template` |
| `components/navigation/` | Nav helpers |  |
| `hooks/` | 13 reusable hooks | `usePermission, useRealtime, useTableQueryState, useQueryState, useDebounce, useLiveExchangeRate, useHardwareScanner, ...` |
| `utils/` | 52 pure helpers, flat, no `index.ts` | `api.ts (buildPaginatedParams), auth.ts (getSessionParams), secureStorage.ts, date.ts, currency.ts, format*.ts, partSearch.ts, ...` |
| `constants/` | Frozen shared knowledge | `realtimeTopics.ts, inventory/part-types.ts, layout/menu/menu.tsx, translation/*, users/employee-country.ts, ai/chatbot/*` |
| `types/` | Almost empty | Only `jspdf.d.ts`. Canonical DTOs live in `services/*/types/`, NOT here |
| `assets/` | Binaries only | `fonts/malgun*.ttf` for jsPDF. No images/SVG (icons via `lucide-react`) |
| `xlsx_templates/` | Binary template | `cellwego_payslip.xlsx` imported as `?url`, patched via `JSZip` in `features/workforce/.../exportPayslipXlsx.ts:3` |

## 3. `features/<domain>/` — the vertical slice

Consistent template, **no barrels, no data layer**:

```
features/<domain-kebab>/
  pages/<PascalCase>.tsx          # route entry, owns fetching + state
  components/<subdomain-kebab>/   # presentational, props-driven
    <PascalCase><Role>.tsx        # *Table, *Toolbar, *Card, *Modal, *Dialog, *Details, *Header, *Sidebar
    <camelCase>.ts                # pure transform co-located: *Utils.ts, *Filters.ts, *Catalog.ts, *Styles.ts
    use<CamelCase>.ts             # rare (only 2 in whole features/): useLazyGroupLoader.ts
```

Observed sizes:
- Minimal: `auth/pages/Login.tsx, Unauthorized.tsx` + `components/LoginForm.tsx, LoginHeader.tsx, ProtectedRoute.tsx`; `billing/pages/Invoices.tsx` + `components/invoice/InvoicesTable.tsx, InvoicesToolbar.tsx`.
- Medium: `customer/pages/Reservation.tsx, Cart.tsx, Purchases.tsx` + `components/reservation/*` (8 cards + `reservationCatalog.ts`, `customerReservationUtils.ts`) + `components/purchases/*` + `details/*`.
- Large: `work-order/pages/Repair.tsx, QA.tsx, ReGlassRepair.tsx` + `components/repair/*, repair-details/* (16 files), qa/*, loss-settlement/*`; `inventory/pages/*.tsx (14 files)` + `components/<entity>/: warehouse/, parts/, models/, vendors/, issues/`; `dashboard/pages/Dashboard.tsx` + `components/~35 flat files`.

Rules:
1. `pages/*.tsx` orchestrates: `useState/useEffect`, calls `*Api` from `@/services/<domain>/api`, holds `useTableQueryState`, composes `components/*`. Example: `Reservation()` calls `salesReservationApi`.
2. `components/*.tsx` is dumb: receives `Response` types as props, no direct `httpClient` import.
3. Co-located `*.ts` is view-model only: `reservationCatalog.ts:buildReservationCatalog()`, `repairTechnicians.ts:getRepairTechnicians()`. Canonical DTOs stay in `@/services/*/types`.
4. Never in `features/`: `index.ts`, `api.ts`, `types.ts`, `hooks/`, `services/`, `store/`, `slice.ts` (verified 0 hits). Subdivision key is always `components/<entity-or-page-subject>/` with optional second level `<entity>-details/, details/, group/, batch-dialog/`.
5. Folders `kebab-case`, pages `PascalCase.tsx`, components suffixed by role (`*Table, *Toolbar, *FormDialog, *DetailModal, *ExportBanner, *Drawer`), logic `camelCase.ts`, hooks `useCamelCase.ts`.

## 4. `services/<domain>/` — backend contract

```
services/<domain>/
  api/<entity>.api.ts    # export const <entity>Api = { getPage, getDetail, create, delete, ... }
  api/index.ts           # barrel: export * from '@/services/<domain>/api/*.api'
  types/<entity>.types.ts # *Response, *Query, *Request, *PageResponse
  types/index.ts         # barrel
services/core/
  client.ts  # single axios instance httpClient + JWT + offline cache/queue + hard-logout
  types.ts   # ApiResponse<T> { success, code, message, data }, PaginatedResult<T>, PaginatedApiConfig
  queue.ts / offline.ts
```

Example (`services/inventory/api/part.api.ts:15-62`):
```ts
export const partApi = {
  getSummary: () => httpClient.get<ApiResponse<...>>(`/Inventory/part/stock-summary`, { params: getSessionParams() }),
  getPurchasesPage: (params) => httpClient.get<ApiResponse<...>>(`/Inventory/part/purchases`, { params: buildPaginatedParams(params) }),
  create: (data) => httpClient.post(`/Inventory/part/edit`, { ...data, ...getSessionParams() }),
}
```
- `BASE_URL = '/Inventory'` per domain file; `VITE_API_URL` from `.env.*` + `server.proxy /api` in `vite.config.ts`.
- Every call injects `getSessionParams()` (`actionBySystemUserId + sessionKey` from `utils/auth.ts`) and paginated calls use `buildPaginatedParams()` (`utils/api.ts`).
- `services/core/client.ts:47-134` owns: JWT injection, `401`/`ERR_TOKEN_EXPIRED` → `executeHardLogout()` (preserves chat + remember-me, clears storage/cookies, redirect `/login`), GET cache to `offlineStorage`, offline writes to `requestQueue`, `processOfflineQueue()` on `online/focus/5s interval`.
- `services/core/types.ts:4-9` mirrors .NET: `ApiResponse<T>`, `PaginatedResult<T>`.

Boundary: feature code never imports `httpClient` directly — always via `*Api` object + `import type { ... } from '@/services/<domain>/types'`.

## 5. `app/ + layouts/ + contexts/` — shell

Boot: `main.tsx` does **no providers/routing** — only PWA `registerSW`, dev SW cleanup, `removeChild` interceptor, then `<StrictMode><App/></StrictMode>`.

`app/App.tsx` mounts (outer→inner): `ThemeProvider (next-themes, class) > AuthProvider > SignalRProvider > MessagingSignalRProvider > LanguageProvider > AutoReloadErrorBoundary > Suspense<PremiumLoader> > RouterProvider > Toaster (sonner)`.

`app/router.tsx` 3-level nesting:
```
/login, /unauthorized (public)
 / (errorElement=<RouteErrorBoundary/>, element=<ProtectedRoute/>)
   └─ element=<Layout/>  # the ONLY layout
      ├─ index -> Navigate /dashboard
      └─ ~100 children, ALL lazy: lazyWithRetry(()=>import('@/features/.../pages/...'))
```
- Reuse page with props/keys for tabs instead of new pages: `<Repair isAfterSales={true}/>`, `<WarehouseUnits key="warehouse-philippines"/>`. Normalize with `<Navigate replace>` + optional `:status?` params.
- Guard two layers (in router, not Layout): `ProtectedRoute (features/auth/...: isAuthenticated ? Outlet : Navigate /login)` → `PermissionRoute ({module, children}: usePermission().canAccess(module) ? children : Navigate /unauthorized)`. Every child wrapped: `module="repair-management:repair:active"`, `basic-information:inventory-lookups:models`, etc. `usePermission.ts` decodes `secureStorage (user_roleId base64, user_permissions base64 JSON)`; `CEO/DEVELOPER` bypass except customer scopes.
- `layouts/Layout.tsx` = data-fetching frame (`Navbar + Sidebar + <main><Outlet/></main> + Chatbot`), owns `sidebarOpen/Collapsed/expandedMenu`, `refreshPermissions()` on mount, badge counts via one-shot `useEffect` + `useRealtime(topic, refetch)` subscriptions. `Sidebar.tsx`/`Navbar.tsx` are presentational (props in). Menu tree from `constants/layout/menu/menu.tsx:useMenuItems()`, filtered by `canAccess()`, badges injected via `badgeByPath`.

Contexts: `Auth (token/role/permissions, 24h login_time expiry, login/logout/refreshPermissions)`, `SignalR (/hubs/notification, ref-counted subscribeTopics)`, `MessagingSignalR (/hubs/messaging, unread/presence)`, `Language (en|ko, t(key)))`, `Cart (route-scoped ONLY for customer/reservations)`, `DashboardCurrency (page-scoped ONLY in Dashboard.tsx)`. Rule: new global state = new file in `contexts/` mounted in `App.tsx`; route/page state = route-scoped provider or feature hook — no Redux/Zustand `store` under `app/`.

## 6. Shared layers — what goes where

- `components/ui/*` = dumb primitives, never import domain code.
- `components/shared/*` = reused domain widgets (`TablePagination, PermissionGuard, SmartSearchInput`). If used once → keep in `features/<domain>/components/`.
- `hooks/use*.ts` = cross-feature React logic (`useTableQueryState` syncs `page/search/sortKey/sortDir` to URLSearchParams via `replace:true`; `useRealtime(topic, cb)` wraps SignalR; `usePermission`, `useDebounce`, `useLiveExchangeRate`). Feature-local hook stays co-located in `features/.../components/`.
- `utils/*.ts` = stateless pure helpers, deep-import `@/utils/date`, never React components. Single-domain formatting stays in feature (`payslipFormat.ts`, `brandModelFilters.ts`).
- `constants/[domain]/*.ts` = shared enums/topics/nav/i18n mirroring backend (`realtimeTopics.ts`, `inventory/part-types.ts:INVENTORY_PART_TYPE_IDS`, `layout/menu/menu.tsx`, `translation/*`). Feature strings stay local.
- `types/` intentionally empty — do NOT create global DTOs there.

Barrels: **only** `services/*/api/index.ts` + `services/*/types/index.ts` (`export * from ...`). No barrels for `components, hooks, utils, constants` — always deep import.

## 7. Naming cheat-sheet

- Folders: `kebab-case` (`re-glass-repair/`, `loss-settlement/`, `part-purchases/`).
- Pages: `PascalCase.tsx` singular (`Repair.tsx`, `Reservation.tsx`).
- Components: `PascalCase + Role` (`RepairTable, RepairToolbar, AddEditFormDialog, CustomerOrderSummaryCard, SelectedInvoicesExportBanner`).
- API: `<entity>.api.ts` → `export const <entity>Api`; types: `<entity>.types.ts` → `*Response/*Query/*Request/*PageResponse`.
- Utils/logic: `camelCase.ts`; hooks: `useCamelCase.ts`.

## 8. Add-feature recipe (from ARCHITECTURE_COMPARISON.html + router/menu)

1. `services/<new-domain>/api/*.api.ts + types/*.types.ts + api/index.ts + types/index.ts` (wrap `httpClient`, use `getSessionParams`/`buildPaginatedParams`, return `ApiResponse<T>`).
2. `features/<new-domain>/pages/<Thing>.tsx` (orchestrate) + `components/<thing>/*Table.tsx, *Toolbar.tsx, *FormDialog.tsx`.
3. Route in `app/router.tsx` via `lazyWithRetry`, wrapped in `<PermissionRoute module="...">`, add `<Navigate>` for default tab if needed.
4. Menu + permission in `constants/layout/menu/menu.tsx` (`{ name, path, permission, icon, children }`).
5. Shared only if reused: promote to `components/shared, hooks, utils, constants`.

---

## 9. Copy-paste refactor prompt for your vibecoded system

> Use this prompt with an AI agent to migrate your messy frontend to the CellWeGo structure above. Replace `[YOUR_SRC]` and `[DOMAINS]`.

```text
Refactor my frontend at [YOUR_SRC] to adopt the CellWeGo Admin architecture defined below. Do NOT change business logic or backend contracts — only move/rename/split files and fix imports to @/* absolute paths.

TARGET STRUCTURE (create if missing):
src/app/App.tsx (providers only) + src/app/router.tsx (single createBrowserRouter table, all pages lazy)
src/features/<domain-kebab>/pages/<PascalCase>.tsx (route entry, owns fetching+state)
src/features/<domain-kebab>/components/<subdomain-kebab>/<PascalCase><Role>.tsx (*Table,*Toolbar,*Card,*Modal,*FormDialog,*Details)
src/features/<domain-kebab>/components/<subdomain-kebab>/<camelCase>.ts (pure view-model transforms only)
src/services/<domain-kebab>/api/<entity>.api.ts (export const <entity>Api = { ... }, uses shared httpClient)
src/services/<domain-kebab>/api/index.ts + types/index.ts (barrel export * ONLY here)
src/services/<domain-kebab>/types/<entity>.types.ts (*Response,*Query,*Request)
src/services/core/client.ts (single axios instance, JWT, error handling) + types.ts (ApiResponse<T>, PaginatedResult<T>)
src/layouts/Layout.tsx (single authenticated shell + Outlet) + Navbar.tsx + Sidebar.tsx
src/contexts/*.tsx (global state only, no redux)
src/components/ui/* (primitives) + src/components/shared/* (used by >=2 features only)
src/hooks/use*.ts (cross-feature only) + src/utils/*.ts (pure, flat, deep-import) + src/constants/[domain]/* (enums/topics/menu/i18n)
src/types/ LEAVE EMPTY (DTOs live in services/*/types)

MIGRATION RULES:
1. Inventory [YOUR_SRC]: list every page/screen grouped by business domain [DOMAINS, e.g. inventory,sales,work-order]. Each group becomes one features/<domain>/ + services/<domain>/.
2. For each screen: split into pages/<Thing>.tsx (data-fetch + composition, max ~200 lines) + components/<thing>/* (dumb, props-driven, no http imports). Move data-fetch to services/<domain>/api/*.api.ts returning ApiResponse<T>. Move DTO interfaces to services/<domain>/types/*.types.ts.
3. Shared promotion test: code used by >=2 features OR pure/generic OR mirrors backend contract -> promote to components/shared|hooks|utils|constants. Else keep/return to features/<domain>/components/. Shared must NEVER import from features/.
4. Routing: consolidate ALL routes into app/router.tsx with lazy(()=>import('@/features/...')) + auth guard (ProtectedRoute) + permission guard (PermissionRoute module="domain:sub:action"). Single Layout with Outlet. No per-page layouts.
5. Imports: rewrite all relative ../../ to @/ alias (@ -> ./src). No barrels except services/*/api/index.ts + types/index.ts. Folders kebab-case, pages/components PascalCase, logic camelCase, hooks useCamelCase, API files *.api.ts, type files *.types.ts.
6. Verify: `tsc --noEmit` (or `npx tsc -p tsconfig.app.json`) passes, no httpClient/axios imports outside services/, no DTO types outside services/*/types, no duplicate components across features, router has no eager page imports.

DELIVERABLE: phased file-move plan + executed moves + import rewrites + new app/router.tsx + layouts/Layout.tsx if missing + verification log. Ask before deleting any file.
```
