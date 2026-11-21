# Fast ID System — Web Frontend (`Fast-ID-web`)

React 18 + Vite 5 (JavaScript) single-page application for the **Fast ID System** DEPI graduation project.

- **API Contract:** [docs/Fast_ID_API_Contract.md](docs/Fast_ID_API_Contract.md) (`v1.0.3-mvp`)
- **Stack:** React 18 · Vite 5 · React Router 6 · TanStack Query 5 · Axios · React Hook Form + Zod · Tailwind CSS 3 · i18next (Arabic RTL default + English LTR) · MSW 2

## Setup

1. Install Node.js 20+ and install dependencies:
   ```bash
   npm ci
   ```
2. Create your local environment file from `.env.example` (never commit `.env`):
   ```bash
   cp .env.example .env
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the repository |
| `npm run check:i18n` | Verify Arabic/English locale key parity and non-empty values |

## Environment Variables

All origins, URLs, and runtime modes come from environment variables (never hardcode URLs or ports):

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | API origin. Leave empty for same-origin or when using the Vite dev proxy / MSW mocks. |
| `VITE_USE_MOCKS` | Set to `"true"` in local development to serve all endpoints from MSW 2 mocks. Mocks never run in production builds. |
| `VITE_DEV_PROXY_TARGET` | Optional backend origin used by the Vite dev server proxy for `/api` requests when `VITE_USE_MOCKS=false`. Leave empty in mock mode. |

## Mock Mode

When `VITE_USE_MOCKS=true` during development, MSW intercepts `/api/v1/*` requests using foundation handlers plus auto-discovered feature handlers (`src/features/*/mocks.js`). Switch active mock roles (`CITIZEN`, `ADMIN`, `AGENT`) using the development role switcher in the layout footer.

## Folder Ownership

- **Foundation (Team Leader):** everything outside `src/features/` (`src/lib/`, `src/components/`, `src/layouts/`, `src/i18n/`, `src/mocks/`, `src/main.jsx`, `src/App.jsx`, config files, `.github/`, `docs/`, `scripts/`).
- **Features (Teammates):** each feature lives in its own folder under `src/features/<feature>/`. Never edit files outside your assigned folders.

## How to Add a Feature

Inside `src/features/<feature>/`:

1. **Routes & Navigation (`routes.jsx`):** export `routes` (with `path`, `layout`, `element`, and optional `roles`) and optionally `nav` (with `layout`, `to`, `labelKey`, `order`). The router and layouts auto-discover every `src/features/*/routes.jsx`.
2. **Translations (`locales/ar.json`, `locales/en.json`):** keep identical key sets in both files. Loaded automatically under the `<feature>` namespace via `useTranslation("<feature>")`.
3. **Mocks (`mocks.js`):** export `handlers` (MSW 2). Auto-loaded ahead of foundation handlers. Use `@/mocks/helpers`, `@/mocks/store`, and `@/mocks/fixtures`, and keep seed data self-contained.
4. **Shared Interface:** import API helpers from `@/lib/api`, auth from `@/lib/auth`, error helpers from `@/lib/errors`, formatters from `@/lib/format`, and UI primitives from `@/components`.
