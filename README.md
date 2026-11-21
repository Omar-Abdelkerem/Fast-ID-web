# # Fast ID System

## 📎 Project Name
Fast ID System (My_ID System)

## 📌 Project Overview
Fast ID is a web platform that digitally manages the issuance, tracking, and delivery of National ID and Bank Cards for citizens. Citizens apply once online with their documents, admins review and approve with a full audit trail, and every step from approval to delivery is logged and visible in real time. The goal is to replace paper forms, long queues, and untracked applications with a transparent digital workflow.

**Team Leader:** Omar Ahmed Abdelkerem
**Tech Stack:** React.js (frontend, QR generation, camera scanning) + Supabase (PostgreSQL, Auth, Storage, Realtime)

## 👥 Team Members
| # | Name | Role |
|---|------|------|
| 1 | Omar Ahmed Abdelkerem | Team Leader |
| 2 | Ziad Abdelhalim | Member |
| 3 | Hassan Marwan | Member |
| 4 | Omar Ahmed Ismail | Member |
| 5 | Amr Ali Samir | Member |

## 📎🎓 Instructor
Hesham Mohamed

## 🎯 Project Objectives
- Let citizens submit ID / bank card applications online with supporting documents.
- Give admins a review, approve, and reject workflow with a full audit trail.
- Provide real-time application tracking for citizens.
- Generate ID cards automatically after approval and queue them for delivery.
- Let delivery agents update delivery status until the card reaches its owner.
- Notify users about approvals, rejections, and delivery updates.
- Reduce processing time and eliminate lost or untracked applications.

## 📦 Project Scope
**In scope:**
- Citizen registration, login, and profile management
- Application submission with document and photo upload
- Admin dashboard: review, approve, reject, audit log
- Real-time status tracking page
- Digital card generation with QR code, and QR scanning via camera for verification
- Delivery management and status updates by delivery agents
- In-app notifications

**Out of scope:**
- Integration with real government databases
- Native mobile apps
- Online payment processing

## 📅 Project Plan (5 Weeks)
| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Planning & Design | Requirements, user roles, database schema, UI wireframes, GitHub repo and Supabase setup |
| 2 | Authentication & Applications | Auth (citizen / admin / delivery agent), citizen dashboard, application form, document and photo upload |
| 3 | Admin Review & Card Issuance | Admin dashboard, approve/reject flow, audit trail, card generation with QR code |
| 4 | Tracking, Delivery & Notifications | Real-time tracking page, delivery agent module, notifications, QR scanning and verification |
| 5 | Testing & Final Delivery | Bug fixes, UI polish, testing, documentation, final presentation |

## Getting started (frontend)

Requirements: Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the address Vite prints (http://localhost:5173). In development the app runs on **mock data** (MSW), so it works without a backend. The mock session role (Admin, Agent or Citizen) is chosen in the footer of the layout, and the language and theme switches are at the bottom of the sidebar.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with mocks (`.env.development` sets `VITE_USE_MOCKS=true`) |
| `npm run build` | Production build into `dist/` (mocks are never included) |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | ESLint |

Using the real API: copy `.env.example` to `.env.local`, set `VITE_USE_MOCKS=false` and `VITE_DEV_PROXY_TARGET=<api origin>` (or `VITE_API_BASE_URL` if the API allows your origin). Never commit `.env` files with secrets.

Structure: `src/lib` (API client, auth, errors, formatting), `src/components` (shared UI and the language/theme switches), `src/layouts` (admin, agent, citizen and public shells), `src/i18n` (Arabic and English), `src/mocks` (shared mocks), and `src/features/<feature>` (each feature owns its `routes.jsx`, pages, `api.js`, `mocks.js` and `locales`). Features are picked up automatically.
