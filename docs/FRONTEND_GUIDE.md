# Fast ID Web — Teammate Frontend Guide

Welcome to `Fast-ID-web`. The shared foundation is ready on `main`, so every teammate can build, test, and open PRs independently inside their own `src/features/<feature>/` folder without editing shared files or waiting for the backend.

- **API Contract (highest authority):** [docs/Fast_ID_API_Contract.md](Fast_ID_API_Contract.md) (`v1.0.3-mvp`)
- **UI Kit Preview (dev only):** open `/dev/ui` while running `npm run dev`

---

## 1. Folder Map & Ownership

```text
Fast-ID-web/
├── docs/                        # Contract, package specs, and this guide (Foundation)
├── scripts/
│   └── check-locales.mjs        # npm run check:i18n (Foundation)
├── src/
│   ├── main.jsx                 # MSW dev boot + QueryClient + Toast + Router (Foundation)
│   ├── App.jsx                  # Auto-discovers src/features/*/routes.jsx (Foundation)
│   ├── index.css                # Global styles & Tailwind component classes (Foundation)
│   ├── lib/
│   │   ├── api.js               # apiGet/Post/Patch/Delete/Upload/Download, ApiError
│   │   ├── auth.jsx             # AuthProvider, useAuth, getRoleHome, resolveRedirect
│   │   ├── errors.js            # getErrorMessage, applyServerErrors
│   │   └── format.js            # formatDate, formatDateTime, formatMoney, maskNationalId
│   ├── i18n/                    # Arabic-first i18next + common.json + useLocalized
│   ├── components/              # Shared WCAG AA UI kit (@/components)
│   ├── layouts/                 # Public, Citizen, Admin, Agent, Shared layouts
│   ├── pages/                   # RootErrorBoundary, 403, 404, DevLoginPage
│   ├── mocks/                   # MSW 2 worker, fixtures, db store, helpers, DevRoleSwitcher
│   └── features/                # <-- TEAMMATES OWN THEIR FEATURE FOLDERS HERE
│       └── <feature>/
│           ├── routes.jsx       # Auto-discovered routes & sidebar/tab nav items
│           ├── mocks.js         # Auto-discovered MSW 2 handlers (priority over foundation)
│           ├── locales/
│           │   ├── ar.json      # Arabic translations (namespace = <feature>)
│           │   └── en.json      # English translations (identical key set to ar.json)
│           └── ...              # Pages, components, hooks, schemas for this feature
```

**Rule:** Edit only files inside your assigned `src/features/<feature>/` folders. Never modify foundation files (`src/lib/`, `src/components/`, `src/layouts/`, `src/i18n/`, `src/mocks/`, `src/App.jsx`, `src/main.jsx`). If something in the foundation is missing, report it to Omar.

---

## 2. Auto-Discovery Conventions (Zero Shared Files to Edit)

### A. Routes & Navigation (`src/features/<feature>/routes.jsx`)
Export `routes` (and optionally `nav`). `App.jsx` and the layouts pick them up automatically:

```jsx
import { MyPage } from "./MyPage";

export const routes = [
  {
    path: "/credentials",
    layout: "citizen", // "public" | "citizen" | "admin" | "agent" | "shared"
    element: <MyPage />,
    // roles: ["ADMIN"], // optional override
  },
];

export const nav = [
  {
    layout: "citizen",
    to: "/credentials",
    labelKey: "credentials:nav.title", // "<namespace>:<key>"
    order: 20, // lower numbers appear first
  },
];
```

- `layout: "citizen" | "admin" | "agent"` automatically wraps your route with `RequireRole` and renders inside the role's shell.
- `layout: "shared"` wraps with `RequireAuth` and picks the shell for the signed-in user's role.
- `NotificationBell.jsx` (if provided at `src/features/notifications/NotificationBell.jsx`) is auto-mounted in authenticated top bars **only when `user && !user.mustChangePassword`**. Never fire authenticated background queries or SSE while `mustChangePassword` is `true`.

### B. Translations (`src/features/<feature>/locales/{ar,en}.json`)
- Loaded automatically under namespace `<feature>`.
- Use `const { t } = useTranslation("<feature>")` for feature copy and `useTranslation("common")` for shared buttons, roles, categories, status labels, and global errors.
- Use `const { localize } = useLocalized()` (from `@/components`) for `{ ar, en }` objects returned by the API.
- Put endpoint-specific error translations under `"errors": { "<ERROR_CODE>": "..." }` in your feature's locale files; `fallbackNS` searches every namespace automatically so `getErrorMessage(error, t)` works everywhere.
- **Before every PR:** run `npm run check:i18n`. Both `ar.json` and `en.json` must have identical flattened keys and no empty values.

### C. Mocks (`src/features/<feature>/mocks.js`)
Export `handlers` using MSW 2 (`http` from `"msw"`). Feature handlers are registered **before** foundation handlers, so you can override a foundation mock if your feature needs richer behavior.

**Self-contained mock seeding rule (critical):**
Because `import.meta.glob` loads feature mock files alphabetically, **each feature's `mocks.js` must be completely self-contained**:
- Import `db, nextId` from `@/mocks/store`, `ok, fail, paginate` from `@/mocks/helpers`, and `mockUsers` from `@/mocks/fixtures`.
- Reference **only** `mockUsers` (`CITIZEN`, `ADMIN`, `AGENT`) and the three foundation services (`national-id`, `driving-license`, `birth-certificate`) when seeding your sample records.
- **Never** assume records seeded by another teammate's `mocks.js` already exist in `db`.
- Mock only the endpoints your package owns, matching Contract `1.0.3-mvp` envelopes, status codes, enums, and error codes.
- In mock mode (`VITE_USE_MOCKS=true`), switch roles using the footer `DevRoleSwitcher` (which updates `localStorage.mockRole`). SSE is disabled in mock mode; fall back to polling.

---

## 3. Data Fetching & Draft-Resume Conventions

### TanStack Query Key Prefixes
Keep these shared prefixes intact so cross-feature invalidations work seamlessly:
- Citizen applications: `["applications", ...]`
- Notifications: `["notifications", ...]` (the notifications feature invalidates both `["applications"]` and `["notifications"]` on live events)
- Admin resources: `["admin", "<resource>", ...]` (e.g. `["admin", "applications", id]`)
- Paginated lists: keep `page`, `pageSize`, and filters in URL search params (`useSearchParams`) and pass them via `apiGet(path, { params })` — never concatenate query strings into `path`.

### Draft-Resume Handoff (`/applications` ↔ `/apply/:serviceId`)
1. When a citizen clicks **"Continue draft"** on `/applications` or `/applications/:applicationId`, navigate to `/apply/:serviceId`.
2. On mount, `/apply/:serviceId` **first** queries `GET /applications?serviceId=<serviceId>&status=DRAFT`.
3. If an existing `DRAFT` is returned, resume editing that draft directly instead of calling `POST /applications` (which would return `409 ACTIVE_APPLICATION_EXISTS`).
4. Only if no existing draft is found, call `POST /applications` with `{ serviceId }` to create a new draft.

---

## 4. Design System, RTL & Accessibility Rules

The foundation implements the **Fast ID Navy & Royal Blue** design system:

| Token | Hex | Usage |
|---|---|---|
| `navy` *(alias: `espresso`)* | `#232963` | Headings, primary text, dark sidebar, delivered badge |
| `blue` / `blue-dark` *(aliases: `terracotta`, `terracotta-dark`)* | `#4966F0` / `#3A54D8` | Primary buttons, active nav pill, links |
| `sky` *(alias: `beige`)* | `#E8F0FE` | Table headers, soft highlights, info tints |
| `page` *(alias: `cream`)* | `#F4F5FA` | Main page canvas |
| `muted` *(alias: `tan`)* | `#6F7391` | Secondary text |
| `line` | `#E2E6F3` | Card & input borders |
| `success` / `success-dark` / `success-bg` | `#2F7D5B` / `#236347` / `#E6F4EE` | Approved, active, paid |
| `warning` / `warning-dark` / `warning-bg` | `#A9710F` / `#8B5B09` / `#FEF6E4` | Pending, under review, unpaid |
| `danger` / `danger-bg` | `#B3372F` / `#FDECEB` | Errors, rejected, revoked, destructive actions |

- **Typography:** `Readex Pro` (headings) + `Cairo` (body & labels).
- **Reusable classes:** `.btn`, `.btn-primary`, `.btn-navy`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.input`, `.select`, `.textarea`, `.label`, `.field-error`, `.card`, `.badge`, `.table`, `.page-title`, `.link`, `.ltr-value`, `.brand-gradient`.
- **RTL-first Tailwind:** always use logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`), never `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`, `text-right`. Add `rtl:rotate-180` to directional chevrons/arrows and `.ltr-value` around national IDs, phones, emails, application/credential numbers, and delivery codes.
- **Errors:** branch strictly on `error.code`, never `error.message`; never render raw `error.message` to users. Use `getErrorMessage` and `applyServerErrors` from `@/lib/errors`.
- **States:** every screen must handle loading (`Spinner`), empty (`EmptyState`), error (`ErrorState`), and action feedback (`useToast`).

---

## 5. Worked Example: Minimal Feature Module (`credentials`)

### `src/features/credentials/locales/ar.json`
```json
{
  "nav": { "title": "وثائقي" },
  "title": "الوثائق الرقمية",
  "emptyTitle": "لا توجد وثائق صادرة بعد",
  "emptyText": "ستظهر وثائقك الرقمية هنا بمجرد الموافقة على طلباتك."
}
```

### `src/features/credentials/locales/en.json`
```json
{
  "nav": { "title": "My Credentials" },
  "title": "Digital Credentials",
  "emptyTitle": "No issued credentials yet",
  "emptyText": "Your digital credentials will appear here once an application is approved."
}
```

### `src/features/credentials/mocks.js`
```js
import { http } from "msw";
import { db, nextId } from "@/mocks/store";
import { mockUsers } from "@/mocks/fixtures";
import { ok } from "@/mocks/helpers";

// Self-contained seed using only mockUsers + foundation service slugs
if (!db.credentials.some((item) => item.applicationId === "seed-cred-app-1")) {
  db.credentials.push({
    id: nextId(),
    number: "CRD-AB12CD34EF",
    status: "ACTIVE",
    issuedAt: "2026-11-10T10:00:00.000Z",
    expiresAt: "2033-11-10T10:00:00.000Z",
    service: {
      id: "national-id",
      name: { ar: "بطاقة الرقم القومي", en: "National ID Card" },
    },
    holderName: mockUsers.CITIZEN.fullName,
    qrToken: "mock-qr-token-0123456789abcdefghijklmnopqrstuvwxyz",
    applicationId: "seed-cred-app-1",
  });
}

export const handlers = [
  http.get("/api/v1/credentials", () => ok(db.credentials)),
];
```

### `src/features/credentials/CredentialsPage.jsx`
```jsx
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  StatusBadge,
  useLocalized,
} from "@/components";

export function CredentialsPage() {
  const { t, i18n } = useTranslation("credentials");
  const { localize } = useLocalized();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["credentials"],
    queryFn: () => apiGet("/credentials").then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      {!data || data.length === 0 ? (
        <EmptyState title={t("emptyTitle")} text={t("emptyText")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((credential) => (
            <article key={credential.id} className="card space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading text-base font-bold text-navy">
                  {localize(credential.service.name)}
                </h2>
                <StatusBadge kind="credential" value={credential.status} />
              </div>
              <p className="ltr-value text-sm font-mono text-muted">
                {credential.number}
              </p>
              <p className="text-xs text-muted">
                {formatDate(credential.issuedAt, i18n.language)}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
```

### `src/features/credentials/routes.jsx`
```jsx
import { CredentialsPage } from "./CredentialsPage";

export const routes = [
  { path: "/credentials", layout: "citizen", element: <CredentialsPage /> },
];

export const nav = [
  {
    layout: "citizen",
    to: "/credentials",
    labelKey: "credentials:nav.title",
    order: 20,
  },
];
```

---

## 6. Pre-PR Checklist

Before opening a Pull Request into `main`:
1. `git fetch origin && git rebase origin/main`
2. `npm run lint` passes with 0 errors
3. `npm run check:i18n` passes with 0 missing or empty keys
4. `npm run build` passes
5. Tested in Arabic (RTL) and English (LTR), mobile and desktop, with `VITE_USE_MOCKS=true`
