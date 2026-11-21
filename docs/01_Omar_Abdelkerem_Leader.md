# Fast ID System: Frontend Work Package

**Owner:** Omar Ahmed Abdelkerem  
**Package:** Team Leader: frontend foundation and integration  
**Stack:** React 18 + Vite (JavaScript) · React Router · TanStack Query · Tailwind CSS · i18next (Arabic RTL + English) · MSW mocks  
**API contract:** `docs/Fast_ID_API_Contract.md` (version 1.0.3-mvp)

> **How to use this file:** give this entire file to your AI coding agent as its instructions (Claude, Copilot, Cursor, or similar) and keep it open yourself. Everything you need is inside it, so you never have to wait for a teammate: you build against the shared interface (section 4) and mock data (section 5), then merge through Git (section 6). Work through section 3 in order, one task per branch and pull request.

---

## 1. Agent instructions (read this first)

You are a senior React engineer pairing with **Omar Ahmed Abdelkerem**, a member of a 5-person student team building the **Fast ID System** (a government-services platform) for the DEPI graduation project. You work **only on the package in section 3**, in parallel with four teammates who each have their own package and their own agent. **Nobody waits for anybody:** you build against the shared interface (section 4) and mock data (section 5), then integrate through Git (section 6).

**Hard rules**

1. **The API contract is the law.** Every endpoint, field name, enum value, validation rule and error code comes from `docs/Fast_ID_API_Contract.md`. Never invent endpoints, fields, enum values or error codes. If something is missing or unclear, **stop and ask the human**; also list it under "Questions for Omar" in your PR. Never guess.
2. **Stay in your lane.** You own the foundation (section 3). Do **not** build feature pages or edit anything inside `src/features/<feature>/` that belongs to a teammate; if a teammate's feature has a problem, report it in the PR review instead of fixing it yourself.
3. **No hardcoded URLs, domains, ports or secrets.** Environment variables only. Sessions are httpOnly cookies, so never store tokens anywhere. Never use `dangerouslySetInnerHTML`. Never log personal data.
4. **Scaffold (tasks 1 to 3) may go straight to `main`** so teammates can start; after that use short-lived branches and pull requests even for your own work. Details in section 6.
5. **All user-visible text goes through i18n** (Arabic and English files with identical keys). Arabic is the default language and the layout is RTL, so use logical Tailwind classes (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`), never `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`, `text-right`.
6. **Every screen has loading, empty and error states**, plus success feedback after actions (toast).
7. **Branch on `error.code`, never on `error.message`**, and never show `error.message` to the user. Use `getErrorMessage` and `applyServerErrors` from `@/lib/errors`.
8. **Code style: match the course instructor's style.** Simple function components, plain descriptive camelCase names (like `initCart`, `existingProduct`, `qty`), short functions, a short comment where something is not obvious. No clever abstractions, no over-engineering.
9. **Approved libraries only:** react 18, react-router-dom 6, @tanstack/react-query 5, axios, react-hook-form, zod, @hookform/resolvers, i18next, react-i18next, tailwindcss 3, msw 2, qrcode.react 4, html5-qrcode 2. Ask before adding anything else.
10. **Work in priority order.** `P0` = must ship, `P1` = should ship, `P2` = stretch (only after all P0 and P1 are done and merged).
11. **Validate on the client to help the user, but the server is the authority.** Mirror the contract's constraints in the form (types, lengths, regex) and always display the server's field errors (`error.field`, `error.details`).
12. **Accessibility basics:** every input has a visible label, buttons are real `<button>` elements, focus outlines stay visible, dialogs trap focus and close on Escape, status is never shown by colour alone.

**How to work:** take one task at a time, in order. For each task: read the contract sections listed, build it exactly to the interface in section 4, test the happy path and the listed error cases, run `npm run lint` and `npm run build`, commit, push your branch and open a PR. Then report back to the human using the format in section 7.

---

## 2. Project context and sources of truth

- **Product:** a citizen applies online for a government document (national ID, driving license, birth certificate, ...). Staff review the application, the system issues a credential (number + QR code), and a delivery agent delivers it to the citizen's home with a one-time code. Every step is tracked, notified (in-app and email) and audited.
- **Roles:** `CITIZEN`, `ADMIN`, `AGENT`.
- **Frontend stack:** React 18 + Vite (JavaScript, JSX), React Router 6, TanStack Query 5, Axios, React Hook Form + Zod, i18next, Tailwind CSS 3, MSW 2 for mocks. Plain React with client-side routing (not Next.js).
- **API:** the REST API described by the contract is being built in parallel. Until it is ready you work against mocks (section 5); the leader switches mocks off and fixes integration mismatches.
- **Sources of truth, in this order:** (1) `docs/Fast_ID_API_Contract.md` for everything about the API; (2) this file for your tasks and the shared interface; (3) the human's instructions. If two of them disagree, stop and ask.
- **Contract sections you will use most:** §0 (conventions: envelope, errors, pagination, formats), §0.20 (object shapes), §0.19 (global error codes). The task list below names the exact sections for each task.

---

## 3. Your package: Frontend foundation and integration

**Branch name prefix:** `abdelkerem` (example: `feature/abdelkerem-foundation-api-layer`).
**Folders and files you own:** everything outside `src/features/`: `package.json`, config files, `index.html`, `public/`, `src/main.jsx`, `src/App.jsx`, `src/lib/`, `src/components/`, `src/layouts/`, `src/i18n/`, `src/mocks/` (except each feature's own `mocks.js`), `.github/`, `docs/`, `scripts/`, `README.md`, `CONTRIBUTING.md`.
**You do not build feature pages.** Feature folders under `src/features/` belong to your four teammates. Your only pages are the two tiny fallbacks in task 7.

Why this order matters: your teammates start from the interface in section 4. Pushing the scaffold early lets them rebase onto the real thing. **Do task 1 first and push it to `main` as soon as it builds**, then continue with the tasks in order. For tasks 1 to 3 you may push straight to `main` (it is your repository and the project is empty); from then on use branches and pull requests even for your own work.

### Task 1 (P0): scaffold, tooling and repository setup
- In the repository root create a **Vite 5** React (JavaScript) app (`npm create vite@5`, template `react`, **React 18**).
- Install: `react-router-dom@6`, `@tanstack/react-query@5`, `axios@1`, `react-hook-form@7`, `zod@3`, `@hookform/resolvers@3`, `i18next@24`, `react-i18next@15`, `qrcode.react@4`, `html5-qrcode@2`; dev: `tailwindcss@3`, `postcss`, `autoprefixer`, `msw@2`. Run `npx msw init public/ --save`.
- `vite.config.js`: alias `@` to `src`; dev proxy `/api` to `process.env.VITE_DEV_PROXY_TARGET` **only when it is set**.
- `tailwind.config.js`: `content` covers `index.html` and `src/**/*.{js,jsx}`; extend colors with the tokens in section 4.7 (plus the semantic tokens below); `fontFamily.sans` = Poppins, Cairo, system fallbacks; `fontFamily.serif` = Lora; Arabic text **and Arabic headings** (`.page-title`) use Cairo (apply with `[lang="ar"]` or `html[dir="rtl"]` in the base CSS, because Lora has no Arabic glyphs).
- Extra tokens: `terracotta-dark #A9532A` (button backgrounds with white text and small link text, because plain terracotta does not pass contrast for small text), `muted #6B5D45` (secondary readable text; `tan` is decorative only), `success-dark #466146` (readable green text on cream/white — plain `success #5C7A5C` on cream is 4.12:1 and fails WCAG AA; use white text on `bg-success` or `text-success-dark` on `bg-success-bg #E7F0E7`), `warning #9A5B13` / `warning-bg #FBF0DF`, `info #2B5B84` / `info-bg #E6F0F8`, and `danger-bg #FCE8E6` for accessible status badges.
- `index.html`: `<html lang="ar" dir="rtl">`, a title, and the Google Fonts links for Poppins (400, 500, 600), Cairo (400, 600, 700), Lora (400, 500).
- `.env.example` with `VITE_API_BASE_URL=` (empty), `VITE_USE_MOCKS=true`, `VITE_DEV_PROXY_TARGET=` (empty). `.gitignore` must exclude `node_modules`, `dist`, `.env` and `.env.*` but keep `.env.example`.
- `npm run lint` must pass on the empty scaffold.
- Add `docs/Fast_ID_API_Contract.md` (the contract file).
- Add `.github/pull_request_template.md` (the PR template from section 7) and `.github/workflows/ci.yml`: on pull requests and pushes to `main`: checkout (`actions/checkout@v4`), Node 20 (`actions/setup-node@v4` with npm cache), `npm ci`, `npm run lint`, `npm run build`, and (once task 10 exists) `npm run check:i18n`.
- Write `README.md` (setup, scripts, env variables, mock mode, folder ownership, how to add a feature) and `CONTRIBUTING.md` (the Git rules of section 6, written for the whole team).
- In GitHub settings protect `main`: require a pull request before merging and require the CI check to pass. Add your four teammates as collaborators with write access.

### Task 2 (P0): API layer, errors, formatting (`src/lib`)
Implement `src/lib/api.js`, `src/lib/errors.js`, `src/lib/format.js` with **exactly** the interface in section 4.2, 4.4 and 4.5.
- Axios instance: `baseURL` is `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`, `withCredentials: true`, timeout 30 seconds (120 seconds for `apiUpload`), `Accept: application/json`. Never retry non-GET requests. On JSON writes (`apiPost`, `apiPatch`, `apiDelete`), send `Content-Type: application/json` (for bodyless `POST` endpoints, sending `{}` or an empty body with `application/json` matches contract §0.2). On `apiUpload`, pass `FormData` **without** forcing `Content-Type: application/json` so the browser sets `multipart/form-data; boundary=...` automatically.
- Unwrap the envelope. A response without `success: true` (or an error without the envelope) becomes `ApiError` with code `INVALID_RESPONSE`; no response at all becomes `NETWORK_ERROR`. `ApiError` carries `code`, `message`, `field`, `details`, `status`, and `retryAfter` (seconds from the `Retry-After` header).
- Query params: arrays are joined with commas, booleans become `"true"`/`"false"`, `undefined`, `null` and empty strings are dropped.
- `apiDownload` requests a blob, returns `{ blob, filename }` with the filename parsed from `Content-Disposition` (supporting both `filename="..."` and RFC 5987 `filename*=UTF-8''...` for Arabic names; fall back to a generic name). Errors from a blob response must still be parsed from the JSON error envelope (read the blob as text and parse it).
- `registerApiHandlers({ onUnauthenticated, onPasswordChangeRequired, onAccountDisabled, onRateLimited })` lets the auth provider and toast provider react globally without circular imports. A request can pass `skipGlobalHandlers: true` (used by the `/auth/me` bootstrap call and by login). `401` with code `UNAUTHENTICATED` triggers `onUnauthenticated`; other 401 codes (`INVALID_CREDENTIALS`, `INVALID_CURRENT_PASSWORD`, ...) do **not**. `403 PASSWORD_CHANGE_REQUIRED`, `403 ACCOUNT_DISABLED` and `429 RATE_LIMITED` each trigger their handler.
- `getErrorMessage(error, t)`: `t("errors.<CODE>")`; fall back to `common:errors.UNKNOWN`. `applyServerErrors(error, setError, t, { fieldMap })`: if `error.details` exists set one field error per detail (message from `errors.<detail.code>` or the generic `common:errors.VALIDATION_ERROR` when the detail code has no translation); otherwise if `error.field` exists set that single field; apply `fieldMap` to rename server paths; return `true` if anything was set. Do not invent detail codes.
- `format.js`: `formatDate`, `formatDateTime` (time zone `Africa/Cairo`), `formatMoney` (`Intl.NumberFormat` with currency `EGP`, amount divided by 100, locale `ar-EG` or `en-EG` by language), `maskNationalId` (`29**********45`, 10 asterisks).

### Task 3 (P0): auth provider, route guards, role homes (`src/lib/auth.jsx`)
- `AuthProvider` + `useAuth()` with exactly the interface in section 4.3, plus two helpers: `getRoleHome(role)` (`CITIZEN` gives `/applications`, `ADMIN` gives `/admin`, `AGENT` gives `/agent/deliveries`) and `resolveRedirect(from, role)` (returns `from` only if it is an internal path starting with a single `/`, not `//`, and belongs to a layout the role may open; otherwise the role's home).
- On mount call `GET /auth/me` with `skipGlobalHandlers`: a 401 simply means "not signed in" (`user = null`). `isLoading` is true until this finishes; guards show a spinner meanwhile.
- `login`, `register`, `logout`, `refreshUser` call the endpoints in the contract §1 and keep `user` in React state (never in localStorage). `logout` also clears the React Query cache.
- Guards (used by the router): `RequireAuth` (not signed in redirects to `/login?from=<current path>`), `RequireRole` (wrong role shows the 403 page). If `user.mustChangePassword` is true, every route except `/change-password`, and the logout action, redirects to `/change-password`; layouts must also suppress `NotificationBell` and any background authenticated fetches/SSE until the password is changed.
- Register the global handlers: `onUnauthenticated` clears the user and cache and navigates to `/login?from=...`; `onPasswordChangeRequired` navigates to `/change-password`; `onAccountDisabled` signs out and shows an error toast; `onRateLimited` shows a toast with the wait time from `retryAfter` when present.

### Task 4 (P0): i18n (`src/i18n`)
- `i18next` + `react-i18next`; default language `ar`, fallback `en`; the choice is remembered in `localStorage` (the only thing stored there besides the mock role). On language change set `document.documentElement.lang` and `dir` (`rtl` for `ar`, `ltr` for `en`).
- Load `src/i18n/locales/{ar,en}/common.json` as the `common` namespace and **auto-load every** `src/features/*/locales/{ar,en}.json` using `import.meta.glob`, with the namespace equal to the feature folder name. Set `fallbackNS` to all loaded namespaces so `t("errors.<CODE>")` resolves across features.
- `common.json` (Arabic and English, identical keys) must include: buttons (save, cancel, back, next, submit, confirm, delete, edit, close, retry, search, reset filters, export), generic states (loading, empty, error, unsaved changes), role names, language names, **labels for every status enum** (`status.application.*`, `status.delivery.*`, `status.credential.*`, `status.payment.*`), the service category names, the nav group labels, **a translation for every global error code in contract §0.19** plus `NETWORK_ERROR`, `INVALID_RESPONSE`, `UNKNOWN`, `VALIDATION_ERROR`, **and the six field-validation detail codes** (`REQUIRED`, `INVALID_FORMAT`, `TOO_SHORT`, `TOO_LONG`, `OUT_OF_RANGE`, `INVALID_VALUE`) under `errors.<CODE>`. Messages are friendly and never expose technical detail.
- `useLocalized()` hook (section 4.6), defined in `src/i18n/useLocalized.js` and re-exported from `src/components/index.js` (to avoid circular imports).

### Task 5 (P0): shared components and global styles
- Global CSS (`src/index.css`): Tailwind layers, base styles (`espresso` text on `cream` background, visible focus rings in `terracotta-dark`), and `@layer components` for `.btn`, `.btn-primary` (background `terracotta-dark`, white text), `.btn-secondary` (outlined), `.btn-danger` (background `danger`, white text), `.btn-sm`, `.input`, `.select`, `.textarea` (white background, `line` border, focus ring), `.label`, `.field-error` (small `danger` text), `.card` (white, `line` border, rounded, padding), `.badge`, `.table` (header row `espresso` with `cream` text, zebra rows `beige`), `.page-title` (Lora in LTR; overridden to `Cairo` under `[dir="rtl"]` / `[lang="ar"]` since Lora has no Arabic glyphs), `.link` (`terracotta-dark`, underline on hover), and `.ltr-value` (`direction: ltr; unicode-bidi: isolate;` for national IDs, phones, application/credential numbers, delivery codes, and emails in RTL). Use logical properties only (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) and `rtl:rotate-180` on directional icons.
- Components exported from `src/components/index.js` with the props in section 4.7: `Spinner`, `PageHeader`, `EmptyState`, `ErrorState`, `Pagination` (previous/next plus a window of page numbers, disabled at the ends, `aria-current` on the active page), `StatusBadge` (colour **and** text; accessible WCAG AA mapping for all four kinds using `success-dark`/`success-bg` or white-on-`bg-success`, `warning`/`warning-bg`, `info`/`info-bg`, `danger`/`danger-bg`, and neutral `espresso`/`beige`), `Modal` (focus trap, Escape closes, overlay click closes, `aria-modal`, returns focus), `ConfirmDialog`, `FormField` (label tied to input via `htmlFor`, error text linked with `aria-describedby`), `LanguageSwitcher`, `useLocalized`, `ToastProvider` + `useToast` (stack, auto-dismiss after 5 seconds, `role="status"`, error toasts `role="alert"`).
- A short internal "UI kit" demo route `/dev/ui` shown only when `import.meta.env.DEV`, rendering each component once (useful for the team).

### Task 6 (P0): layouts and navigation (`src/layouts`)
- Collect navigation entries from every feature's `routes.jsx` (`nav` export, section 4.9), filter by layout, sort by `order`, label with `t(labelKey)`.
- `PublicLayout`: header (logo "Fast ID", links Services and Verify, `LanguageSwitcher`, and either Login/Register buttons or a "Go to my dashboard" button), an **announcement banner** loaded from `GET /settings` (shown when `announcement` is not null; localized; dismissible for the session), a footer with the support email and phone from the same settings.
- `CitizenLayout` and `AdminLayout`: top bar (logo, notification bell, `LanguageSwitcher`, user menu with Profile and Logout), a side navigation (collapses to a slide-over drawer on mobile). `AgentLayout`: mobile-first with a **bottom tab bar**. `SharedLayout` picks the layout of the signed-in user's role.
- The notification bell is loaded **optionally**: `import.meta.glob("/src/features/notifications/NotificationBell.jsx", { eager: true })`; render it **only when `user && !user.mustChangePassword`** (and hide sidebar/bottom navigation links while `user.mustChangePassword` is true, keeping only the change-password view and Logout so no protected endpoint or SSE stream fires and triggers a `403 PASSWORD_CHANGE_REQUIRED` loop). Render nothing if `NotificationBell.jsx` does not exist yet.
- In mock mode show the role switcher (section 5) in the layout footer. Respect `prefers-reduced-motion`.

### Task 7 (P0): app shell, router, fallbacks (`src/main.jsx`, `src/App.jsx`)
- `main.jsx`: in mock mode start the MSW worker **before** rendering (`onUnhandledRequest: "warn"`); render `QueryClientProvider` (defaults: `staleTime` 30 seconds, no retry on 4xx, `refetchOnWindowFocus` true), `ToastProvider`, i18n, `AuthProvider`, router.
- `App.jsx` builds the router from every feature's `routes.jsx` (`import.meta.glob("/src/features/*/routes.jsx", { eager: true })`, each exporting `routes` and optionally `nav`). Wrap each route in its layout and guards per section 4.9. Add a 404 page and a 403 page.
- **Fallbacks so the app works before teammates merge:** if no feature registered `/login`, register `DevLoginPage` there (a plain, working form calling `useAuth().login`); in development also always register it at `/dev/login`. If no feature registers `/` redirect it to `/login`.
- Error boundary at the root with a friendly message and a reload button.

### Task 8 (P0): mock infrastructure (`src/mocks`)
- `browser.js` (MSW `setupWorker`), `handlers.js` (collects `handlers` from every `src/features/*/mocks.js` via `import.meta.glob`; **feature handlers first, foundation handlers last**), `helpers.js` (`ok`, `fail`, `paginate`, exactly as in section 5), `store.js` (`db` with arrays `users`, `services`, `adminServices`, `applications`, `credentials`, `deliveries`, `notifications`, `auditLogs`, an object `settings`, and `nextId()` returning UUID-looking ids).
- `fixtures.js`: `mockUsers` (`{ CITIZEN, ADMIN, AGENT }`, fixed ids, full User shapes; the citizen has a valid-looking 14-digit national ID; the agent has a governorate), 27 governorates with Arabic and English names and the 27 codes from contract §2.1, `settings` (no announcement, a support email and phone), and **three published services** with realistic Arabic and English text:
  - `national-id`: IDENTITY, fee 5000 piastres, `slaDays` 3, `validityYears` 7; documents `personalPhoto` (jpeg/png, 2 MB, required) and `idProof` (pdf/jpeg, 5 MB, required); fields `reason` (SELECT: FIRST_ISSUE, REPLACEMENT, required) and `notes` (TEXTAREA, max 300, optional).
  - `driving-license`: LICENSE, fee 12000, `slaDays` 5, `validityYears` 10; documents `personalPhoto`, `medicalCertificate` (required); fields `licenseClass` (SELECT: PRIVATE, MOTORCYCLE, required), `hasPreviousLicense` (CHECKBOX), `previousLicenseNumber` (TEXT, pattern for digits only, optional).
  - `birth-certificate`: CIVIL_RECORD, fee 0, `slaDays` 2, `validityYears` null; document `parentIdProof` (required); fields `childName` (TEXT, 3 to 100, required), `childBirthDate` (DATE, required), `hospitalName` (TEXT, optional).
  Seed `db.services` (published definitions with `version: 1`) and `db.adminServices` (matching `AdminService` objects) from these.
- Foundation handlers (all following the contract exactly, same envelope, status codes and errors): every `/auth/*` endpoint (login: password `wrong` returns `INVALID_CREDENTIALS`, an identifier starting with `admin` signs in as the admin user, starting with `agent` as the agent, otherwise the citizen; register returns 201 with the citizen and validates the contract's field rules and duplicate errors for the fixture email and national ID; `me`, `PATCH me`, `logout`, `change-password`, `forgot-password`, `reset-password` with token `valid-token` working and others `INVALID_RESET_TOKEN`), `GET /reference/governorates`, `GET /settings`, `GET /services` (with `category`), `GET /services/:id` (`SERVICE_NOT_FOUND`), `GET /admin/services` (read-only), `GET /admin/staff` (read-only; includes the mock agent), `GET /health`.
- Session in mock mode: kept in memory plus `localStorage.mockRole`; role switcher component `DevRoleSwitcher` (visible only when `VITE_USE_MOCKS === "true"`).

### Task 9 (P0): smoke test of the foundation
Before announcing the foundation as ready: run `npm run lint` and `npm run build`; open the app in mock mode; check language switch and RTL; sign in as each role via `/dev/login` (or the role switcher), see the correct layout and navigation; check 404 and 403 pages; open `/dev/ui`. Then tell the team that the foundation is on `main`.

### Task 10 (P1): quality tooling
- `scripts/check-locales.mjs` and `npm run check:i18n`: for every namespace, verify `ar` and `en` files have identical key sets (nested keys flattened) and no empty values; exit with a non-zero code and a readable list of problems otherwise. Add it to the CI workflow.
- A short `docs/FRONTEND_GUIDE.md` for teammates: folder map, how routes, nav, mocks and locales are auto-registered, with one worked example.

## 3b. Your leadership duties (frontend integration and review)

- **Reviewing PRs:** check against the PR checklist and these points: only the owner's folders changed; contract names, enums and error codes are exact; no hardcoded text or URLs; RTL-safe classes; loading, empty, error and success states exist; locale files have identical keys; the PR works in mock mode for the right role; CI is green. Answer every item under "Questions for Omar". Merge with **squash**. After each merge pull `main` and click through the touched screens once.
- **Order of merging:** there are no hard dependencies between teammates because of the shared interface, so merge in the order PRs become ready. Keep `main` always building.
- **When a teammate is blocked:** the mock and stub rules should prevent it; if something in the foundation is missing, fix it quickly in a small PR and tell the team.
- **Contract questions:** if a question exposes a gap in `docs/Fast_ID_API_Contract.md`, decide, update the contract in a PR (bump the version line), and notify everyone.
- **Switching to the real API (when it is ready):** set `VITE_USE_MOCKS=false` and `VITE_DEV_PROXY_TARGET`, then walk the end-to-end scenario below and log every mismatch as a GitHub issue labelled `integration`. The contract wins; mismatches are fixed on whichever side deviates, agreed with the owner.
- **End-to-end scenario for the final demo and for integration testing:** (1) register a citizen, (2) browse services and apply for the national ID (fill the form, upload both documents, address, demo payment, submit), (3) as admin find the application in the queue, start review, approve, (4) as admin confirm a delivery exists and is assigned (or assign an agent), (5) as agent start the delivery, (6) as citizen see the delivery code on the tracking page, (7) as agent enter the code and complete the delivery, (8) verify the credential through its QR link, (9) check notifications for each role, (10) check the audit log and the dashboard numbers.

---

## 4. The foundation you build (the exact interface teammates rely on)

You build the foundation. It must export **exactly** the names, signatures and behaviours below, because four teammates are writing code against this interface right now. Do not rename anything and do not change a signature without telling the whole team. Teammates who start before your scaffold lands use local stubs and will rebase onto your real files.

### 4.1 Environment and aliases
- `VITE_API_BASE_URL`: API origin; **empty means same origin**. `VITE_USE_MOCKS`: `"true"` serves everything from MSW mocks. `VITE_DEV_PROXY_TARGET`: dev-server proxy target (leave unset when using mocks). Copy `.env.example` to `.env` (never commit `.env`).
- Path alias: `@` means `src`.

### 4.2 API client: `@/lib/api`
```js
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload, apiDownload, getApiUrl, ApiError } from "@/lib/api";

apiGet(path, { params })        // -> { data, meta }  (meta only on paginated lists)
apiPost(path, body)             // -> { data }
apiPatch(path, body)            // -> { data }
apiDelete(path)                 // -> { data }
apiUpload(path, formData, { onProgress })   // multipart, onProgress(percent 0-100) -> { data }
apiDownload(path, { params })   // -> { blob, filename }  (files and CSV; sends the session cookie)
getApiUrl(path)                 // full URL for EventSource
// Errors: every failed call throws ApiError { code, message, field, details, status, retryAfter }
```
- `path` is relative to `/api/v1` and starts with `/`, e.g. `apiGet("/services")`. Query strings go in `params`; **never put filters in the path string by hand**.
- The client unwraps the response envelope for you and always sends the session cookie. Empty or `undefined` params are dropped.
- Non-envelope failures become `ApiError` with code `NETWORK_ERROR` (no response) or `INVALID_RESPONSE`.
- Global behaviour (do **not** re-implement): `401 UNAUTHENTICATED` clears the session and redirects to `/login?from=<path>`; `403 PASSWORD_CHANGE_REQUIRED` redirects to `/change-password`; `403 ACCOUNT_DISABLED` ends the session; `429 RATE_LIMITED` shows a toast. Other 401s (for example `INVALID_CREDENTIALS`, `INVALID_CURRENT_PASSWORD`) are **not** session expiry and reach your code normally.

### 4.3 Auth: `@/lib/auth`
```js
import { useAuth } from "@/lib/auth";
const { user, isLoading, isAuthenticated, login, register, logout, refreshUser, hasRole } = useAuth();
// login(identifier, password) -> user      register(payload) -> user (also logs in)
// logout() -> void      refreshUser() -> user      hasRole("ADMIN") -> boolean
// All of them throw ApiError on failure. `user` has the exact shape of the contract's User object (§0.20).

import { getRoleHome, resolveRedirect } from "@/lib/auth";
getRoleHome(role)                 // "CITIZEN" -> "/applications", "ADMIN" -> "/admin", "AGENT" -> "/agent/deliveries"
resolveRedirect(from, role)       // returns `from` only if it is a safe internal path the role may open, else the role's home
```

### 4.4 Errors and forms: `@/lib/errors`
```js
import { getErrorMessage, applyServerErrors } from "@/lib/errors";
getErrorMessage(error, t)                    // translated string for error.code; falls back to a generic message
applyServerErrors(error, setError, t, opts)  // react-hook-form: maps error.field / error.details to field errors.
                                              // opts.fieldMap lets you rename server paths, e.g. { "data.reason": "reason" }.
                                              // returns true if at least one field error was set.
```
Error messages live in your feature's locale file under `"errors": { "<CODE>": "..." }`. All feature namespaces are searched automatically, so `t("errors.SOME_CODE")` works anywhere. The foundation already translates every **global** error code (contract §0.19).

### 4.5 Formatting: `@/lib/format`
`formatDate(iso, lang)`, `formatDateTime(iso, lang)` (time zone `Africa/Cairo`), `formatMoney(money, lang)` (takes the contract's `Money` object, piastres to EGP), `maskNationalId(id)` (`29**********45`, 10 asterisks).

### 4.6 i18n
- Use `const { t } = useTranslation("<yourFeatureName>")`. The namespace is your feature folder name. Your files `src/features/<feature>/locales/ar.json` and `en.json` are loaded automatically and must have identical keys. Shared words (Save, Cancel, Back, Loading, role names, every status label) are in the `common` namespace: `useTranslation("common")`.
- `const { localize } = useLocalized()` from `@/components` turns a contract `Localized` object `{ ar, en }` into the current language's text.
- Current language: `i18n.language` (`"ar"` or `"en"`). Direction is set on `<html dir>` by the foundation.

### 4.7 Shared components: `import { ... } from "@/components"`
| Component | Props |
|---|---|
| `Spinner` | `size?` |
| `PageHeader` | `title`, `subtitle?`, `actions?` |
| `EmptyState` | `title`, `text?`, `action?` |
| `ErrorState` | `error`, `onRetry?` |
| `Pagination` | `meta` (contract meta), `onPageChange(page)` |
| `StatusBadge` | `kind` (`"application"`, `"delivery"`, `"credential"`, `"payment"`), `value` (the enum string) |
| `Modal` | `open`, `onClose`, `title`, `children`, `footer?`, `size?` (`"sm"`, `"md"`, `"lg"`) |
| `ConfirmDialog` | `open`, `title`, `message`, `confirmText?`, `danger?`, `isLoading?`, `onConfirm`, `onCancel` |
| `FormField` | `label`, `htmlFor`, `error?`, `hint?`, `required?`, `children` |
| `LanguageSwitcher`, `useLocalized()`, `useToast()` | `useToast()` returns `{ success(msg), error(msg), info(msg) }` |

Tailwind classes available globally (do not redefine them): `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.input`, `.select`, `.textarea`, `.label`, `.field-error`, `.card`, `.badge`, `.table`, `.page-title`, `.link`, `.ltr-value`. Design tokens (use as `bg-cream`, `text-espresso`, ...): `espresso #1C1410`, `cream #F5EDE4`, `terracotta #C1622F`, `tan #8A7A5C`, `beige #EFE4D7`, `line #E3D6C6`, `success #5C7A5C`, `success-dark #466146`, `success-bg #E7F0E7`, `warning #9A5B13`, `warning-bg #FBF0DF`, `info #2B5B84`, `info-bg #E6F0F8`, `danger #B3261E`, `danger-bg #FCE8E6`, plus `terracotta-dark #A9532A` (use this, not plain `terracotta`, for button backgrounds with white text and for small link text, because it passes contrast) and `muted #6B5D45` (secondary readable text; `tan` is decorative only). Never place plain `text-success` (`#5C7A5C`) directly on `cream` (4.12:1 fails WCAG AA); use white text on `bg-success` or `text-success-dark` on `bg-success-bg`/white. Fonts: Poppins (Latin), Cairo (Arabic body **and** Arabic headings), Lora for English large headings. Use `terracotta-dark` for buttons and links and plain `terracotta` only for large accents and icons; body text is always `espresso` on `cream` or white.

### 4.8 Data fetching conventions (TanStack Query)
- Query keys start with your feature name. Cross-feature prefixes you must respect: citizen applications use `["applications", ...]`; notifications use `["notifications", ...]`; admin data uses `["admin", "<resource>", ...]` (for example `["admin", "applications", id]`).
- The notifications feature invalidates `["applications"]` and `["notifications"]` whenever a live notification arrives, so keep those prefixes.
- Paginated lists: put `page`, `pageSize` and every filter in the **URL query string** (use `useSearchParams`) so views are shareable and back-button friendly, and pass them to the API unchanged (contract §0.16).
- Mutations: after success invalidate the affected query keys and show a success toast; on failure show `getErrorMessage`.

### 4.9 Route registration (no shared file to edit)
Each feature registers its own routes and menu entries in `src/features/<feature>/routes.jsx`. The foundation collects every `routes.jsx` automatically.
```jsx
export const routes = [
  { path: "/apply/:serviceId", layout: "citizen", element: <ApplyPage /> },
];
export const nav = [
  { layout: "citizen", to: "/applications", labelKey: "applications:nav.title", order: 10 },
];
```
`layout` is `"public"` (no login), `"citizen"`, `"admin"`, `"agent"` (these require that role) or `"shared"` (any signed-in role, rendered inside the shell for the user's role). Optional `roles` array narrows a route further. `nav.labelKey` uses `namespace:key` format. Lower `order` appears first.

### 4.10 Canonical route map (link to these paths; you do not need the page to exist yet)
| Path | Layout | Owner feature |
|---|---|---|
| `/` landing, `/services`, `/services/:serviceId` | public | `catalog` |
| `/login`, `/register`, `/forgot-password`, `/reset-password?token=...` | public | `auth` |
| `/change-password`, `/profile` | shared | `auth` |
| `/verify`, `/verify/:qrToken` | public | `verify` |
| `/apply/:serviceId` | citizen | `apply` |
| `/applications`, `/applications/:applicationId` | citizen | `applications` |
| `/credentials` | citizen | `credentials` |
| `/notifications` | shared | `notifications` |
| `/admin` (dashboard), `/admin/settings` | admin | `admin-dashboard` |
| `/admin/applications`, `/admin/applications/:applicationId` | admin | `admin-review` |
| `/admin/services`, `/admin/services/new`, `/admin/services/:serviceId` | admin | `admin-services` |
| `/admin/deliveries` | admin | `admin-deliveries` |
| `/admin/staff`, `/admin/citizens` | admin | `admin-people` |
| `/admin/audit-logs` | admin | `audit-logs` |
| `/agent/deliveries`, `/agent/deliveries/:deliveryId` | agent | `agent` |

After login the user lands on `/applications` (citizen), `/admin` (admin) or `/agent/deliveries` (agent), unless a valid `from` path was given.

**Draft-resume handoff (`/applications` ↔ `/apply/:serviceId`):** when a citizen clicks "Continue draft" in `/applications` or `/applications/:applicationId`, navigate to `/apply/:serviceId`. On mount, `/apply/:serviceId` first queries `GET /applications?serviceId=<serviceId>&status=DRAFT`; if an existing draft is returned, it resumes editing that draft instead of calling `POST /applications` (which would return `409 ACTIVE_APPLICATION_EXISTS`). If no draft exists, it calls `POST /applications` to create one.

---

## 5. Mock data rules (so you never wait for the real API)

- Each feature has `src/features/<feature>/mocks.js` exporting `export const handlers = [ ... ]` written with MSW 2 (`import { http, HttpResponse } from "msw"`). The foundation collects every `mocks.js` automatically and starts the mock server when `VITE_USE_MOCKS=true`.
- Helpers from `@/mocks/helpers`:
  - `ok(data, { meta, status })` returns the success envelope (`status` defaults to 200; use 201 for creates).
  - `fail(code, message, status = 400, { field, details } = {})` returns the error envelope.
  - `paginate(request, items)` reads `page` and `pageSize` from the request URL and returns `{ data, meta }` for `ok(data, { meta })`.
- In-memory data: `import { db, nextId } from "@/mocks/store"`. `db` has arrays `users`, `services`, `adminServices`, `applications`, `credentials`, `deliveries`, `notifications`, `auditLogs` and an object `settings`. Seed your own sample data at the top of your `mocks.js` (push into `db`), covering every status your screens show. Because `import.meta.glob` loads feature mock files alphabetically, **each feature's `mocks.js` must be self-contained** and reference only `mockUsers` and the three foundation services (`national-id`, `driving-license`, `birth-certificate`), never records seeded by another teammate's `mocks.js`.
- Mock **only the endpoints your package owns** (listed in section 3). The foundation already mocks `/auth/*`, `GET /reference/governorates`, `GET /settings`, `GET /services`, `GET /services/:id`, `GET /admin/services` (read-only) and `GET /admin/staff` (read-only). Feature handlers take priority over the foundation's, so if you need a richer version, override it inside your own `mocks.js`.
- Mocks must follow the contract exactly: same paths under `/api/v1`, same status codes, same envelope, same field names and enums, and they must reproduce the main error cases listed in your tasks (at least the ones named in the acceptance criteria).
- Mock users: `import { mockUsers } from "@/mocks/fixtures"` gives `{ CITIZEN, ADMIN, AGENT }` (full User objects with fixed ids). Use their ids in your seed data (for example the agent's id for deliveries assigned to the agent, the citizen's id for applications).
- Mock sessions: the mock user's role comes from `localStorage.mockRole` (`CITIZEN`, `ADMIN` or `AGENT`). In mock mode a role switcher appears in the layout footer. Test your screens with the role they are built for.
- Live notifications (SSE) are disabled in mock mode; the app falls back to polling.
- Mocks are development tooling only and must never run in production builds.

---

## 6. Git workflow

The repository is `Fast-ID-web` on GitHub. You are the only person who merges.

0. **Repository rules:** `main` is protected (pull request + passing CI). Squash-merge PRs. Teammates are collaborators with write access to branches only.
1. **Start clean:** `git checkout main && git pull origin main`.
2. **One branch per task**, named `feature/<yourname>-<feature>-<short-task>`, for example `feature/ziad-apply-stepper`. Use `fix/<yourname>-<short-task>` for bug fixes. Your name prefix is given in section 3.
3. **Commit small and often** with clear messages: `feat(apply): add dynamic form renderer`, `fix(apply): show server errors on submit`, `style(apply): tidy spacing`.
4. **Before opening a PR:** `git fetch origin && git rebase origin/main`. Resolve conflicts **only in your own files**. If a conflict is in a file you do not own, stop and tell the human so the leader can decide. Then run `npm run lint` and `npm run build`; both must pass.
5. **Push** with `git push -u origin <your-branch>` and open a **Pull Request into `main`** using the PR template (section 7). Keep each PR focused on one task and reviewable (aim for under about 600 changed lines).
6. **Never** push to `main`, force-push to a branch someone else uses, commit `.env`, `node_modules`, build output or secrets, or edit files outside your ownership.
7. After merging, pull `main` and delete merged branches.
8. Tasks 1 to 3 may be committed straight to `main` (see section 3); everything after that goes through branches and PRs.

---

## 7. Definition of done, PR template and reporting

**A task is done when all of these are true**

- Every acceptance criterion for the task is met, including the listed error cases.
- Works in Arabic (RTL) and English, on a phone-sized screen and on desktop.
- Loading, empty, error and success states exist.
- No hardcoded text, URLs or secrets; no `console.log` left behind.
- Only files you own were changed.
- `npm run lint` and `npm run build` pass.
- Mock handlers exist for the endpoints you own, and the screen works with `VITE_USE_MOCKS=true`.
- A short manual test script (steps and expected result) is written in the PR description.

**PR template (copy into every PR)**
```
## What this PR does
(one or two sentences, name the task)

## Screens / routes
(paths added or changed)

## How to test (VITE_USE_MOCKS=true, role = ...)
1. ...
2. ...

## Contract sections used
(for example §4.7, §0.16)

## Checklist
- [ ] Only my own folders changed
- [ ] Arabic + English, RTL checked
- [ ] Loading / empty / error / success states
- [ ] npm run lint and npm run build pass
- [ ] Mock handlers added/updated

## Questions for Omar
(anything unclear in the contract or this file; write "none" if nothing)
```

**After each task, report back to the human in this format:**
1. What was done (one short paragraph).
2. Files created or changed (list).
3. How to test it (steps).
4. Open questions or risks.
5. Next task you will start.
