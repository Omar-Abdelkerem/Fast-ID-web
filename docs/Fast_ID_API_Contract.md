# Fast ID System — API Contract

**Version:** 1.0.3-mvp  **Date:** 2026-11-21  **Status:** Final for MVP build
**Backend:** NestJS + PostgreSQL  **Frontend:** React (SPA)  **Audience:** Frontend and backend engineers (single source of truth)

> This document contains no secrets, credentials, real domains, or internal hostnames. Every base URL, origin and secret comes from an environment variable. Hardcoding a domain, port or secret in code, examples or configuration is a contract violation.

---

## Table of contents

0. Conventions
1. Auth
2. Reference data, settings and health (public)
3. Services catalog (public)
4. Applications (citizen)
5. Credentials and public verification
6. Notifications
7. Admin: application review
8. Admin: services management (draft / publish)
9. Deliveries: admin and agent
10. Admin: staff, citizens, audit log, stats, settings
11. Side-effects matrix (emails, notifications, audit)
- Appendix A: Backend-only notes (remove from any public copy)
- Section 12: Open questions and deferred items

---

# 0. Conventions

## 0.1 Base URL and versioning
- Every path in this document is relative to `<API_BASE_URL>` and starts with `/api/v1`.
- `<API_BASE_URL>` is an environment variable on the client (for Vite: `VITE_API_BASE_URL`). It must never be hardcoded.
- A breaking change ships as `/api/v2`. Additive changes (new optional response fields, new endpoints, new enum values on responses) are allowed inside `v1`. **Clients must ignore unknown response fields and must tolerate unknown enum values on read.**

## 0.2 Content types
| Case | Request | Response |
|---|---|---|
| Normal endpoints | `application/json; charset=utf-8` | `application/json; charset=utf-8` |
| File upload (§4.9) | `multipart/form-data` | JSON |
| File download (§4.10) | none | the file's own MIME type |
| CSV export (§7.2) | none | `text/csv; charset=utf-8` |
| SSE stream (§6.6) | none | `text/event-stream` |

Write requests (`POST`/`PATCH`/`DELETE`) with a body must use `application/json` (or `multipart/form-data` on the upload endpoint §4.9). Any other `Content-Type` (such as `text/plain` or `application/x-www-form-urlencoded`) on a write request is rejected with `415 UNSUPPORTED_MEDIA_TYPE` even if the body is empty. Bodyless write endpoints (`Body: none`, e.g. logout, submit, publish, delete, start) accept either no body with no `Content-Type`, an empty body with `application/json`, or `{}` with `application/json`. Maximum JSON body size: **100 KB** (`413 PAYLOAD_TOO_LARGE`).

## 0.3 Response envelope (every endpoint, no exceptions)

**Success (single object):**
```json
{ "success": true, "data": { "id": "..." } }
```

**Success (list):**
```json
{
  "success": true,
  "data": [ { "id": "..." } ],
  "meta": { "page": 1, "pageSize": 20, "total": 134, "totalPages": 7 }
}
```

**Success (delete):**
```json
{ "success": true, "data": { "id": "...", "deleted": true } }
```

**Error:**
```json
{
  "success": false,
  "error": { "code": "APPLICATION_NOT_FOUND", "message": "Application not found." }
}
```

**Error with a field (single-field problem):**
```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "phone must be a valid Egyptian mobile number.", "field": "phone" }
}
```

**Validation error with several problems** (only `VALIDATION_ERROR`, `INVALID_FORM_SCHEMA`, `MISSING_REQUIRED_FIELDS`, and `MISSING_REQUIRED_DOCUMENTS` carry `details`; the first problem is mirrored in `message`/`field`):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "fullName is required.",
    "field": "fullName",
    "details": [
      { "field": "fullName", "code": "REQUIRED", "message": "fullName is required." },
      { "field": "phone", "code": "INVALID_FORMAT", "message": "phone must be a valid Egyptian mobile number." }
    ]
  }
}
```

Rules:
- `message` is human-readable English for developers and logs. **Frontends must branch on `code`, never on `message`, and must not display `message` directly to end users** (translate from `code`).
- `field` uses dot/bracket paths for nested input (`deliveryAddress.city`, `data.purpose`, `formSchema.fields[2].key`).
- The request id is returned in the `X-Request-Id` response header (and logged). It is not part of the body.
- Exceptions to the JSON envelope on **success** only: the CSV export (§7.2), the file download (§4.10), and the SSE stream (§6.6). Their **errors** still use the JSON error envelope.

## 0.4 HTTP methods and status codes
- `POST` creates a resource (**201**) or triggers an action (**200**).
- `PATCH` performs a partial update (**200**). **`PUT` is never used anywhere in this API.**
- `DELETE` removes a resource and returns **200** with the delete envelope (never `204`, so the envelope stays uniform).
- `GET` reads (**200**).

| Status | Meaning in this API |
|---|---|
| 200 / 201 | Success |
| 400 | Validation or malformed request |
| 401 | Not authenticated |
| 403 | Authenticated but not allowed |
| 404 | Not found (also used when a resource exists but belongs to someone else) |
| 409 | State or uniqueness conflict |
| 413 | Payload too large |
| 415 | Unsupported media type or file type |
| 429 | Rate limited |
| 500 | Unexpected server error |
| 503 | Service unavailable (database unreachable on health check) |

## 0.5 Identifiers
| Entity | ID format |
|---|---|
| Services | **Slug-as-id**, e.g. `national-id`. Admin-curated, small set, immutable after creation. Regex `^[a-z0-9]+(-[a-z0-9]+)*$`, length 3–60. |
| Users (citizens, admins, agents), applications, attachments, credentials, deliveries, notifications, audit logs | **UUID v4** (lowercase, hyphenated). These are user-generated, grow without bound, and are never renamed. |
| Settings | Singleton, fixed id `"singleton"`. |
| `applicationNumber` | Human-readable, server-generated, unique: `APP-<YYYY>-<6 digits>` (e.g. `APP-2026-000123`). Shown to users and searched by staff. **Never used as a URL identifier.** |
| Credential `number` | Human-readable, server-generated, unique: `CRD-<10 uppercase alphanumeric>`. |
| `qrToken` | Opaque, unguessable, URL-safe string (≥ 43 chars), server-generated. |

## 0.6 Timestamps and dates (server authority)
- **Every timestamp field is generated by the server. Clients can never send** `createdAt`, `updatedAt`, `submittedAt`, `decidedAt`, `paidAt`, `issuedAt`, `deliveredAt`, `dueAt`, `readAt`, or any similar field. Sending one is rejected as `UNKNOWN_FIELD`.
- Format: ISO 8601 in UTC with milliseconds and `Z`: `2026-11-09T10:15:30.123Z`.
- Date-only values (`birthDate`, date form fields) are `YYYY-MM-DD` with no time zone.
- Business-day boundaries used by statistics and CSV exports use the `Africa/Cairo` time zone (stated explicitly wherever it matters).
- Client-supplied *filter* parameters (`from`, `to`, `submittedFrom`, `submittedTo`) are ISO 8601 and are query inputs only, never stored.

## 0.7 Naming
- JSON keys: `camelCase`. Enum values: `UPPER_SNAKE_CASE`. Paths: `kebab-case`, plural nouns.
- Unset optional values are returned as `null` (the key is always present), never omitted and never `""`.

## 0.8 Localized text
Any human-facing text managed by staff or the system is a `Localized` object:
```json
{ "ar": "بطاقة الرقم القومي", "en": "National ID Card" }
```
Both keys are required and each is 1–200 characters unless a field says otherwise. Supported languages: `ar`, `en`. `preferredLanguage` on a user is `"ar"` (default) or `"en"`.

## 0.9 Authentication and sessions
- **Mechanism:** a signed JWT delivered in an **httpOnly cookie**. There is **no** `Authorization` header, and tokens never appear in any response body.
- **Cookie:** name `fid_session`; `HttpOnly`; `Secure` (always on outside local development); `Path=/`; `SameSite` and `Domain` are set from environment configuration (default `SameSite=Lax`); `Max-Age=43200` (12 hours).
- **Client requirement:** every request must be sent with credentials (`fetch(..., { credentials: "include" })` or Axios `withCredentials: true`).
- **Lifetime:** one token per login, fixed 12-hour lifetime, no refresh token in the MVP. After expiry any protected endpoint returns `401 UNAUTHENTICATED`; the client sends the user to login.
- **Invalidation:** changing the password, resetting the password, or deactivating an account invalidates all existing tokens for that account immediately.
- **Scope:** this API serves the web frontend only. Native mobile clients are out of scope for v1 (they would need a Bearer scheme and a new version).
- **CSRF defense (all required together):** cookie `SameSite`; strict CORS allow-list (§0.14); `Origin` header must match the allow-list on every state-changing request (`403 ORIGIN_NOT_ALLOWED` otherwise; a missing `Origin` header counts as not allowed, so API test tools must send one); state-changing requests must follow §0.2 (JSON, the single multipart upload endpoint, or a bodyless write with no disallowed `Content-Type`).
- **Forced password change:** an account with `mustChangePassword: true` can call only `GET /auth/me`, `POST /auth/logout`, and `POST /auth/change-password`. Every other **authenticated** endpoint returns `403 PASSWORD_CHANGE_REQUIRED`. Public endpoints (§2, §3, §5.3) ignore cookies (§0.15) and remain accessible.
- **No per-account lockout.** Brute force is limited by IP-and-identifier rate limits (§0.13). A third party who knows an account identifier cannot lock the real owner out.

## 0.10 Roles and permissions
Roles: `CITIZEN`, `ADMIN`, `AGENT`.

| Capability | Public | CITIZEN | AGENT | ADMIN |
|---|---|---|---|---|
| Browse services, reference data, settings, verify a credential | ✔ | ✔ | ✔ | ✔ |
| Register / login | ✔ | | | |
| Own profile and password | | ✔ | ✔ | ✔ |
| Create, edit, submit, cancel own applications; view own credentials | | ✔ | | |
| Own notifications | | ✔ | ✔ | ✔ |
| View and act on own assigned deliveries (`/agent/*`) | | | ✔ | |
| Review applications, manage services, deliveries, staff, citizens, audit, stats, settings (`/admin/*`) | | | | ✔ |

A role mismatch returns `403 FORBIDDEN`. Accessing another user's resource (e.g. a citizen requesting someone else's application, an agent requesting someone else's delivery) returns **`404` with the resource's `*_NOT_FOUND` code**, so existence is never revealed.

## 0.11 Validation strictness
- Every write endpoint uses **whitelist validation**: any field not listed in that endpoint's table is rejected with `400 UNKNOWN_FIELD` (with `field` set to the first unknown key). Unknown fields are never silently ignored or stored. This also applies inside `data`, `deliveryAddress`, `formSchema` and other nested objects.
- Strings are trimmed before validation. Empty string after trimming counts as missing.
- `null` is accepted only where a field explicitly says "nullable".
- Optional client metadata that the server cannot verify is never validated against a fixed list and never discarded for a minor format deviation; it is normalized (e.g. phone normalization in §0.12).

## 0.12 Common value formats
| Type | Rule |
|---|---|
| `email` | Valid address, max 254 chars, normalized to lowercase. |
| `phone` | Egyptian mobile. Accepts `01012345678`, `+201012345678`, `201012345678`. Normalized and returned as `01XXXXXXXXX` (regex after normalization `^01[0125][0-9]{8}$`). |
| `nationalId` | Exactly 14 digits. Structure checked (see §1.1). Format validation only. |
| `fullName` | 3–100 characters, at least 2 words, Unicode letters (Arabic or Latin), spaces, `'`, `-`, `.` only. Internal whitespace collapsed. |
| `password` | 8–128 characters, at least one letter and one digit, must not contain the account's email local part (when that local part is at least 3 characters long, case-insensitive) or national ID. |
| `uuid` | UUID v4. |
| `Money` | `{ "amount": <integer, piastres, >= 0>, "currency": "EGP" }`. 1 EGP = 100 piastres. Never floats. |
| `governorate` | One of the 27 codes in §2.1. |

## 0.13 Rate limiting
Limits return `429 RATE_LIMITED` with a `Retry-After` header (seconds). Counters are per IP unless stated.

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 10 per 15 min per IP; **and** 5 failed attempts per 15 min per (IP + identifier) pair |
| `POST /auth/register` | 5 per hour |
| `POST /auth/forgot-password` | 3 per hour per IP; **and** 3 per hour per email |
| `POST /auth/reset-password` | 10 per hour |
| `POST /auth/change-password` | 5 per 15 min per user |
| `GET /verify/:qrToken` | 30 per minute |
| `POST /applications/:id/attachments` | 30 per 10 min per user |
| `POST /agent/deliveries/:id/deliver` | 20 per minute per user (plus the per-delivery code lock in §9.7) |
| `GET /admin/applications/export` | 5 per minute per user |
| All other endpoints (default) | 120 per minute per IP |

## 0.14 CORS
- Allowed origins: an explicit allow-list from the `CORS_ORIGINS` environment variable, per environment (development, staging, production). **Never `*`.** Exact string match only.
- `Access-Control-Allow-Credentials: true`.
- Allowed methods: `GET, POST, PATCH, DELETE, OPTIONS`. Allowed request headers: `Content-Type`, `Accept`. Exposed response headers: `Retry-After`, `X-Request-Id`, `Content-Disposition`. Preflight cache: 600 seconds.
- The real origin for each environment is configuration, not part of this document.

## 0.15 Caching
- Default for **every** endpoint: `Cache-Control: no-store`.
- Exceptions (identical for all callers, never personalized, safe for a CDN or browser to cache):

| Endpoint | `Cache-Control` |
|---|---|
| `GET /reference/governorates` | `public, max-age=86400` |
| `GET /settings` | `public, max-age=60` |
| `GET /services` and `GET /services/:id` | `public, max-age=60, stale-while-revalidate=300` |

- All responses carry `Vary: Origin`. Public endpoints above ignore cookies, so anonymous and authenticated callers receive the same body.
- Admin endpoints (including draft services) are **never** under the public paths, so drafts cannot leak through a shared cache.

## 0.16 Pagination, sorting, filtering
- Paginated endpoints (the only ones): `GET /applications`, `GET /notifications`, `GET /admin/applications`, `GET /admin/deliveries`, `GET /admin/staff`, `GET /admin/citizens`, `GET /admin/audit-logs`, `GET /agent/deliveries`.
- Query: `page` (integer ≥ 1, default 1), `pageSize` (integer 1–100, default 20). Out-of-range values are `400 VALIDATION_ERROR` (not silently clamped).
- Response `meta`: `{ page, pageSize, total, totalPages }`. A page beyond the last returns an empty `data` array with correct `meta`.
- Non-paginated lists (small, bounded): `GET /services`, `GET /reference/governorates`, `GET /admin/services`.
- `sort`: a single field, prefix `-` for descending (e.g. `-submittedAt`). The allowed fields are listed per endpoint; others are `400 VALIDATION_ERROR`.
- Multi-value filters are comma-separated (`status=SUBMITTED,UNDER_REVIEW`).
- Boolean query values are the literal strings `true` / `false`.

## 0.17 Security headers and request tracing
Responses include standard hardening headers (`X-Content-Type-Options: nosniff`, `Strict-Transport-Security` in non-local environments, `Referrer-Policy: no-referrer`). Every response has `X-Request-Id`; a client-supplied `X-Request-Id` is ignored.

## 0.18 Environment rule
Every base URL, origin, domain, port, secret, key, and mode flag is read from an environment variable. See Appendix A for the variable names. This rule applies to all code, configuration, examples and documentation. (Email addresses in examples use reserved example values and are sample data only.)

## 0.19 Standard error codes

**Global errors (any endpoint may return these; they are not repeated per endpoint):**

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Any field fails its constraint, malformed JSON, bad query parameter |
| 400 | `UNKNOWN_FIELD` | A field not allowed on this endpoint was sent |
| 401 | `UNAUTHENTICATED` | Missing, invalid or expired session cookie |
| 403 | `FORBIDDEN` | Role not allowed for this endpoint |
| 403 | `ORIGIN_NOT_ALLOWED` | State-changing request whose `Origin` is not in the allow-list |
| 403 | `PASSWORD_CHANGE_REQUIRED` | Account has `mustChangePassword: true` |
| 403 | `ACCOUNT_DISABLED` | Session belongs to a deactivated account |
| 413 | `PAYLOAD_TOO_LARGE` | JSON body over 100 KB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Write request with a disallowed `Content-Type` |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected failure (details are logged, never returned) |

Each endpoint below lists only its **endpoint-specific** error cases.

## 0.20 Shared object schemas

### Localized
`{ "ar": string, "en": string }`

### Money
`{ "amount": integer, "currency": "EGP" }`

### User (returned by `/auth/*`)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `role` | `CITIZEN` \| `ADMIN` \| `AGENT` | |
| `fullName` | string | |
| `email` | string | |
| `phone` | string | |
| `preferredLanguage` | `ar` \| `en` | |
| `nationalId` | string \| null | CITIZEN only |
| `birthDate` | `YYYY-MM-DD` \| null | CITIZEN only (derived from national ID) |
| `gender` | `MALE` \| `FEMALE` \| null | CITIZEN only (derived from national ID) |
| `governorate` | governorate code \| null | AGENT only |
| `isActive` | boolean | |
| `mustChangePassword` | boolean | |
| `createdAt`, `updatedAt` | timestamp | |

### Service (public, published definition)
| Field | Type | Notes |
|---|---|---|
| `id` | string | slug |
| `name`, `description` | Localized | |
| `category` | `IDENTITY` \| `LICENSE` \| `CIVIL_RECORD` \| `OTHER` | |
| `fee` | Money | amount `0` means free |
| `slaDays` | integer | calendar days from submission to decision target |
| `validityYears` | integer \| null | null = credential never expires |
| `requiredDocuments` | RequiredDocument[] | |
| `formSchema` | `{ "fields": FormField[] }` | |
| `version` | integer | published version number, starts at 1 |
| `publishedAt` | timestamp | |

`ServiceSummary` (list item) = `id, name, description, category, fee, slaDays, validityYears, version`.

### RequiredDocument
| Field | Type | Notes |
|---|---|---|
| `key` | string | camelCase, unique within the service (e.g. `personalPhoto`) |
| `label` | Localized | |
| `required` | boolean | |
| `allowedMimeTypes` | string[] | subset of `image/jpeg`, `image/png`, `application/pdf` |
| `maxSizeBytes` | integer | 1 – 10,485,760 |

### FormField
| Field | Type | Notes |
|---|---|---|
| `key` | string | `^[a-z][a-zA-Z0-9]{0,39}$`, unique within the service |
| `label` | Localized | |
| `helpText` | Localized \| null | |
| `type` | `TEXT` \| `TEXTAREA` \| `NUMBER` \| `DATE` \| `SELECT` \| `CHECKBOX` | |
| `required` | boolean | |
| `options` | `{ value: string, label: Localized }[]` \| null | required (2–50 items, unique `value`) for `SELECT`, `null` otherwise |
| `validation` | object | see below; may be `{}` |

`validation` keys, each optional, only allowed for the listed types:

| Key | Types | Constraint |
|---|---|---|
| `minLength`, `maxLength` | TEXT, TEXTAREA | integers 0–2000, `minLength ≤ maxLength` |
| `min`, `max` | NUMBER | numbers, `min ≤ max` |
| `minDate`, `maxDate` | DATE | `YYYY-MM-DD`, `minDate ≤ maxDate` |
| `pattern` | TEXT | regex string, max 200 chars, must compile and pass a safety check |

Submitted value types in `Application.data`: `TEXT`/`TEXTAREA` string, `NUMBER` number, `DATE` `YYYY-MM-DD` string, `SELECT` one of the option `value` strings, `CHECKBOX` boolean. For a `CHECKBOX`, `required: true` means the value must be `true` (an acceptance box).

### Attachment
`{ id, requirementKey, originalName, mimeType, sizeBytes, uploadedAt }`

### Application (citizen view)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `applicationNumber` | string | |
| `service` | `{ id: string, name: Localized }` | |
| `serviceVersion` | integer | for a `DRAFT` this is the current published version; pinned at submit |
| `status` | ApplicationStatus | see below |
| `data` | object | form answers keyed by `FormField.key` |
| `deliveryAddress` | DeliveryAddress \| null | |
| `payment` | `{ status, amount: Money, paidAt: timestamp \| null, reference: string \| null }` | `status`: `NOT_REQUIRED`, `UNPAID`, `PAID` |
| `attachments` | Attachment[] | |
| `submittedAt` | timestamp \| null | |
| `dueAt` | timestamp \| null | `submittedAt + slaDays` |
| `isOverdue` | boolean | true when `dueAt` has passed and status is `SUBMITTED` or `UNDER_REVIEW` |
| `decision` | `{ decidedAt, outcome: "APPROVED" \| "REJECTED", reasonCode: string \| null, reason: string \| null }` \| null | |
| `credential` | CredentialSummary \| null | set after approval |
| `delivery` | DeliveryTracking \| null | set after approval |
| `statusHistory` | `{ status, at, note: string \| null }[]` | oldest first; `note` is the citizen-visible reason only |
| `createdAt`, `updatedAt` | timestamp | |

**ApplicationStatus:** `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`.

**DeliveryAddress:**
| Field | Type | Constraint |
|---|---|---|
| `governorate` | governorate code | one of §2.1 |
| `city` | string | 2–60 chars |
| `addressLine` | string | 5–200 chars |
| `phone` | phone | §0.12 |
| `notes` | string \| null | 0–300 chars |

**DeliveryTracking** (citizen-facing):
| Field | Type | Notes |
|---|---|---|
| `status` | DeliveryStatus | |
| `attempts` | integer | failed attempts so far |
| `agent` | `{ fullName, phone } \| null` | only while `OUT_FOR_DELIVERY` |
| `deliveryCode` | string \| null | 6 digits, only while `OUT_FOR_DELIVERY`; the citizen gives it to the agent |
| `lastFailure` | `{ reasonCode, reason: string \| null, at } \| null` | |

**DeliveryStatus:** `PENDING_ASSIGNMENT`, `ASSIGNED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED_ATTEMPT`.

### CredentialSummary
`{ id, number, status: "ACTIVE" | "REVOKED" | "EXPIRED", issuedAt, expiresAt: timestamp | null }`

### Credential
CredentialSummary plus `{ service: { id, name: Localized }, holderName, qrToken, applicationId }`.

### Notification
| Field | Type |
|---|---|
| `id` | uuid |
| `type` | NotificationType (§11) |
| `title`, `body` | Localized |
| `entity` | `{ type: "APPLICATION" \| "DELIVERY", id: uuid }` |
| `isRead` | boolean |
| `readAt` | timestamp \| null |
| `createdAt` | timestamp |

**Entity rule:** a notification addressed to a **citizen** always references the `APPLICATION` (including delivery events such as `DELIVERY_OUT_FOR_DELIVERY`), so the citizen can open `/applications/:id`. The `DELIVERY` entity type is used only for notifications addressed to **agents** (`DELIVERY_ASSIGNED`).

### AdminApplicationListItem
`{ id, applicationNumber, service: { id, name }, status, citizen: { id, fullName, nationalIdMasked }, governorate, submittedAt, dueAt, isOverdue, paymentStatus, deliveryStatus: DeliveryStatus | null }`

`nationalIdMasked` shows the first and last 2 digits only: `29**********45`.

### AdminApplication (admin detail)
Everything in **Application** **except `delivery`** (omitted so `deliveryCode` is never exposed to admins), plus:
| Field | Type |
|---|---|
| `citizen` | `{ id, fullName, nationalId, birthDate, gender, email, phone }` |
| `statusHistory` | `{ status, at, note, by: { id, fullName, role } \| null }[]` (`by: null` = system) |
| `decision` | adds `decidedBy: { id, fullName } \| null` |
| `deliveryRecord` | AdminDelivery \| null |
| `credential` | Credential \| null (includes `qrToken`) |

`AdminApplication` never includes `delivery` or `deliveryCode`; admins use `deliveryRecord` only.

### AdminDelivery (admin and agent views)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `applicationId` | uuid | |
| `applicationNumber` | string | |
| `service` | `{ id, name }` | |
| `status` | DeliveryStatus | |
| `attempts` | integer | |
| `recipientName` | string | citizen's full name |
| `address` | DeliveryAddress | |
| `agent` | `{ id, fullName } \| null` | |
| `assignedAt`, `outForDeliveryAt`, `deliveredAt` | timestamp \| null | |
| `lastFailure` | `{ reasonCode, reason, at } \| null` | |
| `createdAt`, `updatedAt` | timestamp | |

The agent view **never** includes the national ID, attachments, email, or the delivery code.

### AuditLog
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `actor` | `{ id, fullName, role } \| null` | `null` = system |
| `action` | AuditAction (§11) | |
| `entityType` | `APPLICATION` \| `SERVICE` \| `CREDENTIAL` \| `DELIVERY` \| `USER` \| `SETTINGS` | |
| `entityId` | string | uuid, or slug for services, or `singleton` |
| `metadata` | object | small allow-listed key/value context (e.g. `fromStatus`, `toStatus`, `reasonCode`), never personal data |
| `createdAt` | timestamp | |

Audit logs are append-only. There is no endpoint to create, edit, or delete them.

### Settings
`{ id: "singleton", supportEmail: string | null, supportPhone: string | null, announcement: Localized | null, updatedAt }`

---

# 1. Auth

## 1.1 `POST /api/v1/auth/register`
**Auth:** public. **Success:** `201`, sets the `fid_session` cookie (the citizen is logged in), body `data` = **User**.

| Field | Type | Required | Validation |
|---|---|---|---|
| `fullName` | string | yes | §0.12 |
| `nationalId` | string | yes | 14 digits; digit 1 is `2` (born 1900–1999) or `3` (2000–2099); digits 2–7 form a valid calendar date `YYMMDD` not in the future; digits 8–9 form a valid birth-governorate code (`01–04`, `11–19`, `21–29`, `31–35`, `88`); digit 13 odd = `MALE`, even = `FEMALE`. No external verification (see §12). |
| `email` | string | yes | §0.12 |
| `phone` | string | yes | §0.12 |
| `password` | string | yes | §0.12 |
| `preferredLanguage` | string | no | `ar` or `en`, default `ar` |
| `acceptTerms` | boolean | yes | must be `true` |

`birthDate` and `gender` are derived by the server from `nationalId`; clients never send them.

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 400 | `INVALID_NATIONAL_ID` | Fails the structural checks above (`field: "nationalId"`) |
| 400 | `TERMS_NOT_ACCEPTED` | `acceptTerms` is not `true` (`field: "acceptTerms"`) |
| 409 | `NATIONAL_ID_ALREADY_REGISTERED` | An account with this national ID exists |
| 409 | `EMAIL_ALREADY_REGISTERED` | An account with this email exists |

## 1.2 `POST /api/v1/auth/login`
**Auth:** public. **Success:** `200`, sets cookie, `data` = **User**.

| Field | Type | Required | Validation |
|---|---|---|---|
| `identifier` | string | yes | an email (any role) **or** a 14-digit national ID (citizens), max 254 chars |
| `password` | string | yes | 1–128 chars |

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Unknown identifier or wrong password (identical response for both) |
| 403 | `ACCOUNT_DISABLED` | Credentials are correct but the account is deactivated |

Example error:
```json
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Identifier or password is incorrect." } }
```

## 1.3 `GET /api/v1/auth/me`
**Auth:** any authenticated role. **Success:** `200`, `data` = **User**. Call on app start to restore the session.

## 1.4 `PATCH /api/v1/auth/me`
**Auth:** any authenticated role. **Success:** `200`, `data` = **User**. Identity fields (`fullName`, `nationalId`, `email`) are immutable here.

| Field | Type | Required | Validation |
|---|---|---|---|
| `phone` | string | no | §0.12 |
| `preferredLanguage` | string | no | `ar` or `en` |

At least one field must be present, otherwise `400 VALIDATION_ERROR`.

## 1.5 `POST /api/v1/auth/logout`
**Auth:** public (skips authentication and forced-password-change checks; still enforces the `Origin` check from §0.9). **Body:** none (an empty body or `{}`). **Success:** `200`, `data`: `{ "loggedOut": true }`, and the cookie is cleared. Works identically for active, expired, invalid, or missing sessions.

## 1.6 `POST /api/v1/auth/change-password`
**Auth:** any authenticated role. **Success:** `200`, `data`: `{ "changed": true }`. All other sessions of the account are invalidated and a fresh cookie is issued for the current session. Clears `mustChangePassword`.

| Field | Type | Required | Validation |
|---|---|---|---|
| `currentPassword` | string | yes | 1–128 chars |
| `newPassword` | string | yes | §0.12; must differ from `currentPassword` |

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 400 | `PASSWORD_UNCHANGED` | New password equals the current password |
| 401 | `INVALID_CURRENT_PASSWORD` | `currentPassword` is wrong |

## 1.7 `POST /api/v1/auth/forgot-password`
**Auth:** public. **Success:** `200`, `data`: `{ "requested": true }` — **always**, whether or not the email exists (no account enumeration). If an active account exists, a reset email with a single-use link (valid 30 minutes) is sent.

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | yes | §0.12 |

## 1.8 `POST /api/v1/auth/reset-password`
**Auth:** public. **Success:** `200`, `data`: `{ "reset": true }`. The user is **not** logged in automatically; the client sends them to login. All existing sessions are invalidated.

| Field | Type | Required | Validation |
|---|---|---|---|
| `token` | string | yes | 20–200 chars, from the emailed link |
| `newPassword` | string | yes | §0.12 |

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 400 | `INVALID_RESET_TOKEN` | Token unknown, already used, or expired |

---

# 2. Reference data, settings and health (public)

## 2.1 `GET /api/v1/reference/governorates`
**Auth:** public. **Cache:** §0.15. `data`: array of `{ code, name: Localized }`, ordered alphabetically by English name. The 27 valid codes:

`CAIRO, GIZA, ALEXANDRIA, QALYUBIA, PORT_SAID, SUEZ, DAKAHLIA, SHARQIA, GHARBIA, MONUFIA, BEHEIRA, KAFR_EL_SHEIKH, DAMIETTA, ISMAILIA, FAIYUM, BENI_SUEF, MINYA, ASSIUT, SOHAG, QENA, LUXOR, ASWAN, RED_SEA, NEW_VALLEY, MATROUH, NORTH_SINAI, SOUTH_SINAI`

## 2.2 `GET /api/v1/settings`
**Auth:** public. **Cache:** §0.15. `data` = **Settings** (a singleton created automatically on first boot, so this never returns 404).

## 2.3 `GET /api/v1/health`
**Auth:** public. `data`: `{ "status": "ok" }`. Returns `503 SERVICE_UNAVAILABLE` (with the error envelope) if the database is unreachable.

---

# 3. Services catalog (public)

Only services whose availability is `PUBLISHED` are visible here. Drafts and unpublished services are never exposed on these endpoints.

## 3.1 `GET /api/v1/services`
**Auth:** public. **Cache:** §0.15. **Query:** `category` (optional, one of the category values). **Success:** `data`: **ServiceSummary[]** (not paginated), ordered by English name.

## 3.2 `GET /api/v1/services/:id`
**Auth:** public. **Cache:** §0.15. **Success:** `data` = **Service** (includes `formSchema` and `requiredDocuments`).

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `SERVICE_NOT_FOUND` | Unknown id, or the service is not published |

Example (abridged):
```json
{
  "success": true,
  "data": {
    "id": "national-id",
    "name": { "ar": "بطاقة الرقم القومي", "en": "National ID Card" },
    "description": { "ar": "...", "en": "..." },
    "category": "IDENTITY",
    "fee": { "amount": 5000, "currency": "EGP" },
    "slaDays": 3,
    "validityYears": 7,
    "requiredDocuments": [
      {
        "key": "personalPhoto",
        "label": { "ar": "صورة شخصية", "en": "Personal photo" },
        "required": true,
        "allowedMimeTypes": ["image/jpeg", "image/png"],
        "maxSizeBytes": 2097152
      }
    ],
    "formSchema": {
      "fields": [
        {
          "key": "reason",
          "label": { "ar": "سبب الطلب", "en": "Reason" },
          "helpText": null,
          "type": "SELECT",
          "required": true,
          "options": [
            { "value": "FIRST_ISSUE", "label": { "ar": "إصدار لأول مرة", "en": "First issue" } },
            { "value": "REPLACEMENT", "label": { "ar": "بدل فاقد", "en": "Replacement" } }
          ],
          "validation": {}
        }
      ]
    },
    "version": 2,
    "publishedAt": "2026-11-01T09:00:00.000Z"
  }
}
```

---

# 4. Applications (citizen)

All endpoints in this section require role `CITIZEN` and operate only on the caller's own applications.

**Lifecycle (citizen side):**
`DRAFT` → (submit) `SUBMITTED` → (staff) `UNDER_REVIEW` → `APPROVED` or `REJECTED`. A citizen can `cancel` only while `SUBMITTED`. After approval the delivery flow moves the application `APPROVED` → `OUT_FOR_DELIVERY` → `DELIVERED` (a failed delivery attempt moves it back to `APPROVED`).

**One active application per service:** a citizen can have at most one application per service whose status is `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, or `OUT_FOR_DELIVERY`. `REJECTED`, `DELIVERED`, and `CANCELLED` are final and do not block a new application.

## 4.1 `POST /api/v1/applications`
Creates an empty draft. **Success:** `201`, `data` = **Application** (`status: "DRAFT"`, `data: {}`, `deliveryAddress: null`, `statusHistory: []`, `payment` initialized from the service fee). A draft writes no status history entry; the first entry is recorded on submit (§4.7).

| Field | Type | Required | Validation |
|---|---|---|---|
| `serviceId` | string | yes | slug format §0.5; must be a published service |

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `SERVICE_NOT_FOUND` | Unknown service id |
| 409 | `SERVICE_NOT_AVAILABLE` | Service exists but is not currently published |
| 409 | `ACTIVE_APPLICATION_EXISTS` | The citizen already has an active application for this service |

## 4.2 `GET /api/v1/applications`
Lists the caller's applications. **Paginated.**

| Query | Type | Validation |
|---|---|---|
| `status` | comma list | valid ApplicationStatus values |
| `serviceId` | string | slug |
| `sort` | string | `createdAt` or `-createdAt` (default `-createdAt`), `updatedAt`, `-updatedAt` |
| `page`, `pageSize` | integers | §0.16 |

`data`: Application[] (same shape as §4.3 but `statusHistory` and `attachments` are omitted from list items: they are `[]`).

## 4.3 `GET /api/v1/applications/:id`
`data` = **Application**.

**Errors:** `404 APPLICATION_NOT_FOUND`.

## 4.4 `PATCH /api/v1/applications/:id`
Fills or edits a draft. Only while `status` is `DRAFT`. Partial validation applies: values present are checked for type and constraints now; "required" completeness is enforced at submit (§4.7).

| Field | Type | Required | Validation |
|---|---|---|---|
| `data` | object | no | Keys must be field keys from the service's current published `formSchema`; any other key is `UNKNOWN_FIELD` (`field: "data.<key>"`). **Merge semantics per key:** a key present replaces that answer; a key set to `null` clears it; omitted keys are untouched. Each value must satisfy its field's type and `validation`. |
| `deliveryAddress` | object | no | Subfields in §0.20 DeliveryAddress. **Merge semantics per subfield** (same rule: present replaces, `null` clears for `notes` only; other subfields cannot be `null`). |

At least one of `data` / `deliveryAddress` must be present. Success: `200`, `data` = **Application**.

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `APPLICATION_NOT_FOUND` | |
| 409 | `APPLICATION_NOT_EDITABLE` | Status is not `DRAFT` |
| 409 | `SERVICE_NOT_AVAILABLE` | The service has been unpublished |

## 4.5 `DELETE /api/v1/applications/:id`
Deletes a draft and its attachments. Only while `DRAFT`. Success: `200`, delete envelope.

**Errors:** `404 APPLICATION_NOT_FOUND`; `409 APPLICATION_NOT_EDITABLE`.

## 4.6 `POST /api/v1/applications/:id/payment/mock`
**Placeholder payment** for the MVP (no real gateway). Available only when the server runs with the mock payment mode enabled. Body: none. Marks the draft's payment `PAID` with `reference` `MOCK-<random>` and a server-generated `paidAt`. Success: `200`, `data` = **Application**.

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `APPLICATION_NOT_FOUND` | |
| 404 | `PAYMENT_NOT_ENABLED` | Mock payment mode is off in this environment |
| 409 | `APPLICATION_NOT_EDITABLE` | Status is not `DRAFT` |
| 409 | `PAYMENT_NOT_REQUIRED` | The service fee is 0 |
| 409 | `PAYMENT_ALREADY_COMPLETED` | Already `PAID` |

While a draft is not `PAID` (`UNPAID` or `NOT_REQUIRED`), `payment.amount` and `payment.status` always follow the service's current published fee (`0` → `NOT_REQUIRED`, `> 0` → `UNPAID`) and are re-synced on read, on mock payment, and on submit; once `PAID` the amount is locked.

## 4.7 `POST /api/v1/applications/:id/submit`
Validates everything and submits. Body: none. On success: status `SUBMITTED`, `submittedAt` and `dueAt` set by the server, `serviceVersion` pinned. Success: `200`, `data` = **Application**.

Checks, in this order (first failure wins):
1. Application exists and belongs to the caller.
2. Status is `DRAFT`.
3. Service is currently published.
4. All required form fields (`data.<key>`) and required `deliveryAddress` subfields (`deliveryAddress.governorate`, `deliveryAddress.city`, `deliveryAddress.addressLine`, `deliveryAddress.phone` — listed individually when `deliveryAddress` is `null` or partial) are present and valid: if any required field or address subfield is missing, return `400 MISSING_REQUIRED_FIELDS` with all missing (and any invalid) fields in `details`. If all required fields are present but any value fails format/constraint validation, return `400 VALIDATION_ERROR` with `details`.
5. Every required document has an attachment → else `MISSING_REQUIRED_DOCUMENTS`.
6. Payment is `PAID` or `NOT_REQUIRED` (after re-syncing unpaid/not-required drafts against the service's current published fee).

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `APPLICATION_NOT_FOUND` | |
| 409 | `APPLICATION_NOT_EDITABLE` | Status is not `DRAFT` |
| 409 | `SERVICE_NOT_AVAILABLE` | Service no longer published |
| 400 | `MISSING_REQUIRED_FIELDS` | `details` lists each missing/invalid `data.<key>` or `deliveryAddress.<sub>` |
| 400 | `MISSING_REQUIRED_DOCUMENTS` | `details` lists each missing document `key` (`field: "attachments.<key>"`) |
| 409 | `PAYMENT_NOT_COMPLETED` | Fee is due and payment is `UNPAID` |

## 4.8 `POST /api/v1/applications/:id/cancel`
Cancels a submitted application that staff have not started reviewing. Body:

| Field | Type | Required | Validation |
|---|---|---|---|
| `reason` | string | no | 0–300 chars |

Success: `200`, `data` = **Application** with `status: "CANCELLED"`.

**Errors:** `404 APPLICATION_NOT_FOUND`; `409 INVALID_STATUS_TRANSITION` (status is not `SUBMITTED`).

## 4.9 `POST /api/v1/applications/:id/attachments`
Uploads one file for one required document. Only while `DRAFT`. **Content-Type:** `multipart/form-data`. Success: `201`, `data` = **Attachment**.

| Part | Type | Required | Validation |
|---|---|---|---|
| `requirementKey` | text | yes | must equal a `requiredDocuments[].key` of the service |
| `file` | file | yes | exactly one file; size ≤ that requirement's `maxSizeBytes`; MIME type in that requirement's `allowedMimeTypes` |

Validation uses the file's **actual content** (magic bytes), not the client-declared `Content-Type` or file extension. A file whose real type is not in the allowed list, or whose real type disagrees with the declared type, is rejected. Uploading to a `requirementKey` that already has a file **replaces** the previous file. The server stores files under server-generated names; `originalName` is the sanitized client name for display only.

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 400 | `FILE_REQUIRED` | No `file` part |
| 400 | `UNKNOWN_REQUIREMENT_KEY` | `requirementKey` not defined by the service (`field: "requirementKey"`) |
| 404 | `APPLICATION_NOT_FOUND` | |
| 409 | `APPLICATION_NOT_EDITABLE` | Status is not `DRAFT` |
| 409 | `SERVICE_NOT_AVAILABLE` | The service has been unpublished |
| 413 | `FILE_TOO_LARGE` | Exceeds `maxSizeBytes` |
| 415 | `UNSUPPORTED_FILE_TYPE` | Detected type not allowed for this requirement |
| 415 | `FILE_CONTENT_MISMATCH` | Detected type differs from the declared type |

## 4.10 `GET /api/v1/applications/:id/attachments/:attachmentId/file`
Streams the file. **Auth:** the owning `CITIZEN`, or any `ADMIN`. Not a public URL; the session cookie is required. Headers: the file's MIME type, `Content-Disposition: inline; filename="<ascii-safe>"; filename*=UTF-8''<rfc5987-encoded>`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, `Cache-Control: no-store`.

**Errors:** `404 APPLICATION_NOT_FOUND`; `404 ATTACHMENT_NOT_FOUND`.

## 4.11 `DELETE /api/v1/applications/:id/attachments/:attachmentId`
Only while `DRAFT`. Success: `200`, delete envelope.

**Errors:** `404 APPLICATION_NOT_FOUND`; `404 ATTACHMENT_NOT_FOUND`; `409 APPLICATION_NOT_EDITABLE`.

---

# 5. Credentials and public verification

A **credential** is the issued document record (ID card, license, certificate) created automatically when an application is approved. The citizen's physical item is delivered; the credential carries the number and the QR token used for verification. Frontends render the QR code from the verification URL `<FRONTEND_BASE_URL>/verify/<qrToken>` (frontend route; the frontend reads `qrToken` from the credential).

## 5.1 `GET /api/v1/credentials`
**Auth:** `CITIZEN`. Not paginated beyond a hard cap of 100 (a citizen holds few). `data`: **Credential[]**, newest first.

## 5.2 `GET /api/v1/credentials/:id`
**Auth:** `CITIZEN` (owner). `data` = **Credential**. **Errors:** `404 CREDENTIAL_NOT_FOUND`.

## 5.3 `GET /api/v1/verify/:qrToken`
**Auth:** public (for the QR / scanning screen). Returns a minimal, privacy-safe result. **Rate limit:** §0.13. **Cache:** `no-store`.

`data`:
| Field | Type | Notes |
|---|---|---|
| `valid` | boolean | true only when `status` is `ACTIVE` |
| `status` | `ACTIVE` \| `REVOKED` \| `EXPIRED` | |
| `credential` | object | `{ number, service: { id, name: Localized }, holderName, issuedAt, expiresAt }` |

`holderName` is masked: the first word in full, every other word reduced to its first letter and a period (e.g. `Ahmed M. K.`). The national ID is never returned.

**Errors:** `404 CREDENTIAL_NOT_FOUND` (unknown token).

---

# 6. Notifications

Roles: all authenticated roles, own notifications only.

## 6.1 `GET /api/v1/notifications`
**Paginated.**

| Query | Type | Validation |
|---|---|---|
| `isRead` | boolean | `true` / `false` |
| `page`, `pageSize` | integers | §0.16 |

Sorted newest first (fixed). `data`: **Notification[]**.

## 6.2 `GET /api/v1/notifications/unread-count`
`data`: `{ "count": integer }`.

## 6.3 `POST /api/v1/notifications/:id/read`
Body: none. Marks one notification read (idempotent: already-read returns success unchanged). Success: `200`, `data` = **Notification**.

**Errors:** `404 NOTIFICATION_NOT_FOUND`.

## 6.4 `POST /api/v1/notifications/read-all`
Body: none. Success: `200`, `data`: `{ "updated": integer }`.

## 6.5 Notification generation
Notifications are created by the server only (§11). There is no endpoint to create or delete them.

## 6.6 `GET /api/v1/notifications/stream` (Server-Sent Events)
Live push of new notifications for the signed-in user. Use `new EventSource(url, { withCredentials: true })`.

- Response: `200`, `Content-Type: text/event-stream`, `Cache-Control: no-store`. If not authenticated the server answers `401` with the normal JSON error envelope **before** opening the stream.
- Events:
  - `event: notification` — `data:` is one **Notification** as JSON.
  - `event: ping` — `data: {}` every 25 seconds (keep-alive).
- No replay: after a reconnect, the client must refetch `GET /notifications/unread-count` and the first page of `GET /notifications`. `Last-Event-ID` is not supported.
- Clients that cannot use SSE may poll `GET /notifications/unread-count` every 30 seconds.
- Each user may hold up to 3 concurrent streams; additional ones receive `429 RATE_LIMITED`.

---

# 7. Admin: application review

All endpoints require role `ADMIN`.

## 7.1 `GET /api/v1/admin/applications`
**Paginated.** `data`: **AdminApplicationListItem[]**. Drafts are never listed.

| Query | Type | Validation |
|---|---|---|
| `status` | comma list | valid ApplicationStatus values except `DRAFT` |
| `serviceId` | string | slug |
| `governorate` | string | governorate code (matches the delivery address) |
| `overdue` | boolean | `true` = only overdue |
| `q` | string | 3–100 chars; matches `applicationNumber` (prefix), national ID (exact, 14 digits), or citizen name (contains, case-insensitive) |
| `submittedFrom`, `submittedTo` | ISO 8601 | `from ≤ to` |
| `sort` | string | `submittedAt`, `-submittedAt` (default), `dueAt`, `-dueAt` |
| `page`, `pageSize` | integers | §0.16 |

## 7.2 `GET /api/v1/admin/applications/export`
Downloads a CSV of the same filtered set (same query parameters as §7.1, except `page`, `pageSize`; `sort` still applies). Maximum **10,000** rows; more rows return `400 EXPORT_TOO_LARGE`.

Response: `200`, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="applications-<YYYYMMDD>.csv"` (date in `Africa/Cairo`), `Cache-Control: no-store`. The file starts with a UTF-8 BOM so Excel renders Arabic correctly.

Columns (human-friendly transformation, not raw stored values):

| Column header | Content |
|---|---|
| `Application No.` | `applicationNumber` |
| `Service` | English service name |
| `Citizen` | full name |
| `National ID` | masked (`29**********45`) |
| `Governorate` | English governorate name |
| `Status` | English label (e.g. `Under review`, `Out for delivery`) |
| `Submitted At` | `YYYY-MM-DD HH:mm` in `Africa/Cairo` |
| `Due At` | same format |
| `Overdue` | `Yes` / `No` |
| `Fee (EGP)` | amount ÷ 100 with two decimals (e.g. `50.00`) |
| `Payment` | `Paid` / `Unpaid` / `Not required` |
| `Delivery` | English label or empty |

Cells beginning with `=`, `+`, `-`, `@`, tab (`\t`), or carriage return (`\r`) are prefixed with a single quote to prevent spreadsheet formula injection.

**Errors:** `400 EXPORT_TOO_LARGE`.

## 7.3 `GET /api/v1/admin/applications/:id`
`data` = **AdminApplication**. **Errors:** `404 APPLICATION_NOT_FOUND` (also for drafts).

## 7.4 `POST /api/v1/admin/applications/:id/start-review`
Moves `SUBMITTED` → `UNDER_REVIEW`. Body: none. Success: `200`, `data` = **AdminApplication**.

**Errors:** `404 APPLICATION_NOT_FOUND`; `409 INVALID_STATUS_TRANSITION` (not `SUBMITTED`).

## 7.5 `POST /api/v1/admin/applications/:id/approve`
Moves `UNDER_REVIEW` → `APPROVED`. In **one transaction** the server also: issues the credential (number, QR token, expiry from the service's `validityYears`), creates the delivery record, and attempts automatic agent assignment (Appendix A). Notifications and emails are triggered after commit (§11). Success: `200`, `data` = **AdminApplication**.

| Field | Type | Required | Validation |
|---|---|---|---|
| `note` | string | no | 0–500 chars; internal, visible to staff in `statusHistory` only |

**Errors:** `404 APPLICATION_NOT_FOUND`; `409 INVALID_STATUS_TRANSITION` (not `UNDER_REVIEW`).

## 7.6 `POST /api/v1/admin/applications/:id/reject`
Moves `UNDER_REVIEW` → `REJECTED`. Success: `200`, `data` = **AdminApplication**.

| Field | Type | Required | Validation |
|---|---|---|---|
| `reasonCode` | string | yes | `INCOMPLETE_DOCUMENTS`, `UNCLEAR_DOCUMENTS`, `INVALID_DATA`, `DUPLICATE_REQUEST`, `OTHER` |
| `reason` | string | yes | 10–500 chars; **shown to the citizen** |

**Errors:** `404 APPLICATION_NOT_FOUND`; `409 INVALID_STATUS_TRANSITION` (not `UNDER_REVIEW`).

## 7.7 `POST /api/v1/admin/credentials/:id/revoke`
Revokes an `ACTIVE` credential (e.g. fraud, issuance error). Success: `200`, `data` = **Credential**. The holder is notified.

| Field | Type | Required | Validation |
|---|---|---|---|
| `reason` | string | yes | 10–500 chars (internal; stored in the audit log) |

**Errors:** `404 CREDENTIAL_NOT_FOUND`; `409 CREDENTIAL_NOT_ACTIVE` (already revoked or expired).

---

# 8. Admin: services management (draft / publish)

All endpoints require role `ADMIN`.

**Model:** every service has an editable **draft definition** and, once published, an immutable **published version** (version 1, 2, 3, ...). Edits touch only the draft; the public catalog changes only when the admin publishes. A draft is always a fully valid definition (it is validated on every save); "draft" means "not yet public", not "incomplete". Existing applications keep working: a submitted application is pinned to the version it was submitted under.

**Availability** (`availability`): `DRAFT` (never published), `PUBLISHED`, `UNPUBLISHED` (was published, hidden from the catalog).

**ServiceDefinition** (the editable body): `{ name, description, category, fee, slaDays, validityYears, requiredDocuments, formSchema }` with the shapes in §0.20.

**AdminService:** `{ id, availability, draft: ServiceDefinition, publishedVersion: integer | null, publishedAt: timestamp | null, hasUnpublishedChanges: boolean, createdAt, updatedAt }`.

## 8.1 `GET /api/v1/admin/services`
Not paginated. `data`: **AdminService[]** (all services, including drafts and unpublished).

## 8.2 `GET /api/v1/admin/services/:id`
`data` = **AdminService**. **Errors:** `404 SERVICE_NOT_FOUND`.

## 8.3 `GET /api/v1/admin/services/:id/versions/:version`
Returns the frozen published definition of version `:version` (used when reviewing an application submitted under an older version). `data`: `{ version, publishedAt, definition: ServiceDefinition }`.

**Errors:** `404 SERVICE_NOT_FOUND`; `404 SERVICE_VERSION_NOT_FOUND`.

## 8.4 `POST /api/v1/admin/services`
Creates a service in `DRAFT`. Success: `201`, `data` = **AdminService**.

| Field | Type | Required | Validation |
|---|---|---|---|
| `id` | string | yes | slug §0.5; immutable afterwards |
| `name` | Localized | yes | each language 1–100 chars |
| `description` | Localized | yes | each language 1–500 chars |
| `category` | string | yes | `IDENTITY`, `LICENSE`, `CIVIL_RECORD`, `OTHER` |
| `fee` | Money | yes | `amount` integer 0–10,000,000 (piastres); `currency` must be `EGP` |
| `slaDays` | integer | yes | 1–90 |
| `validityYears` | integer \| null | yes | null or 1–30 |
| `requiredDocuments` | RequiredDocument[] | yes | 0–10 items; `key` unique per service; `allowedMimeTypes` non-empty subset of the three allowed types; `maxSizeBytes` 1–10,485,760 |
| `formSchema` | object | yes | `{ "fields": FormField[] }`, 0–30 fields; `key` unique; per-type rules from §0.20 |

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 409 | `SERVICE_ALREADY_EXISTS` | `id` is taken |
| 400 | `INVALID_FORM_SCHEMA` | Any `formSchema` / `requiredDocuments` rule is broken; `details` lists each problem with a path such as `formSchema.fields[2].options` |

## 8.5 `PATCH /api/v1/admin/services/:id`
Edits the **draft** only. Success: `200`, `data` = **AdminService** (`hasUnpublishedChanges` becomes true when applicable).

Fields: any subset of `name`, `description`, `category`, `fee`, `slaDays`, `validityYears`, `requiredDocuments`, `formSchema` with the same constraints as §8.4. `id` cannot be changed (`UNKNOWN_FIELD` if sent). **Array and object fields are replaced wholesale** (e.g. sending `formSchema` replaces the whole schema). At least one field is required.

**Errors:** `404 SERVICE_NOT_FOUND`; `400 INVALID_FORM_SCHEMA`.

## 8.6 `POST /api/v1/admin/services/:id/publish`
Freezes the current draft as the next version and makes the service `PUBLISHED`. If the service is `UNPUBLISHED` and the draft is identical to its latest published version, publishing simply makes it `PUBLISHED` again **without creating a new version**. Body: none. Success: `200`, `data` = **AdminService**.

**Errors:** `404 SERVICE_NOT_FOUND`; `409 NO_CHANGES_TO_PUBLISH` (draft is identical to the latest published version and the service is already `PUBLISHED`).

## 8.7 `POST /api/v1/admin/services/:id/unpublish`
Hides the service from the public catalog. Existing applications continue through their workflow; citizens cannot start or submit new ones (`SERVICE_NOT_AVAILABLE`). Body: none. Success: `200`, `data` = **AdminService**.

**Errors:** `404 SERVICE_NOT_FOUND`; `409 SERVICE_NOT_PUBLISHED` (availability is not `PUBLISHED`).

## 8.8 `DELETE /api/v1/admin/services/:id`
Allowed only for a service that was **never published** and has no applications. Success: `200`, delete envelope (`id` is the slug).

**Errors:** `404 SERVICE_NOT_FOUND`; `409 SERVICE_CANNOT_BE_DELETED`.

---

# 9. Deliveries: admin and agent

**Delivery state machine**

| From | Action (who) | To | Application status |
|---|---|---|---|
| *(created on approval)* | system | `PENDING_ASSIGNMENT` or `ASSIGNED` | `APPROVED` |
| `PENDING_ASSIGNMENT`, `ASSIGNED`, `FAILED_ATTEMPT` | assign (admin) | `ASSIGNED` | `APPROVED` |
| `ASSIGNED` | start (agent) | `OUT_FOR_DELIVERY` | `OUT_FOR_DELIVERY` |
| `OUT_FOR_DELIVERY` | deliver with code (agent) | `DELIVERED` | `DELIVERED` |
| `OUT_FOR_DELIVERY` | fail (agent) | `FAILED_ATTEMPT` | `APPROVED` |

Any other transition returns `409 INVALID_STATUS_TRANSITION`.

**Delivery code:** when an agent starts delivery the server generates a fresh 6-digit code and shows it to the citizen (`DeliveryTracking.deliveryCode`). On handover the citizen tells the agent the code and the agent submits it. This proves the right person received the item. The code is never sent to the agent by the API.

## 9.1 `GET /api/v1/admin/deliveries` (ADMIN)
**Paginated.** `data`: **AdminDelivery[]**.

| Query | Type | Validation |
|---|---|---|
| `status` | comma list | valid DeliveryStatus values |
| `governorate` | string | governorate code (delivery address) |
| `agentId` | uuid | |
| `unassigned` | boolean | `true` = only `PENDING_ASSIGNMENT` |
| `sort` | string | `createdAt`, `-createdAt` (default) |
| `page`, `pageSize` | integers | §0.16 |

## 9.2 `GET /api/v1/admin/deliveries/:id` (ADMIN)
`data` = **AdminDelivery**. **Errors:** `404 DELIVERY_NOT_FOUND`.

## 9.3 `POST /api/v1/admin/deliveries/:id/assign` (ADMIN)
Assigns or reassigns an agent. Success: `200`, `data` = **AdminDelivery** (`status: "ASSIGNED"`). The agent is notified.

| Field | Type | Required | Validation |
|---|---|---|---|
| `agentId` | uuid | yes | must be an active user with role `AGENT` |

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `DELIVERY_NOT_FOUND` | |
| 404 | `AGENT_NOT_FOUND` | No active agent with this id |
| 409 | `INVALID_STATUS_TRANSITION` | Delivery is `OUT_FOR_DELIVERY` or `DELIVERED` |

## 9.4 `GET /api/v1/agent/deliveries` (AGENT)
Lists only deliveries assigned to the caller. **Paginated.** `data`: **AdminDelivery[]** (agent view: no national ID, attachments, email, or code).

| Query | Type | Validation |
|---|---|---|
| `status` | comma list | valid DeliveryStatus values; default `ASSIGNED,OUT_FOR_DELIVERY` |
| `sort` | string | `assignedAt`, `-assignedAt` (default `assignedAt`, oldest first) |
| `page`, `pageSize` | integers | §0.16 |

## 9.5 `GET /api/v1/agent/deliveries/:id` (AGENT)
`data` = **AdminDelivery** (agent view). **Errors:** `404 DELIVERY_NOT_FOUND` (also for another agent's delivery).

## 9.6 `POST /api/v1/agent/deliveries/:id/start` (AGENT)
Moves `ASSIGNED` → `OUT_FOR_DELIVERY` and generates the delivery code. Body: none. Success: `200`, `data` = **AdminDelivery**. The citizen is notified and sees the code and the agent's name and phone.

**Errors:** `404 DELIVERY_NOT_FOUND`; `409 INVALID_STATUS_TRANSITION`.

## 9.7 `POST /api/v1/agent/deliveries/:id/deliver` (AGENT)
Completes the delivery. Success: `200`, `data` = **AdminDelivery** (`status: "DELIVERED"`).

| Field | Type | Required | Validation |
|---|---|---|---|
| `code` | string | yes | exactly 6 digits |

After **5** wrong codes on the same delivery attempt, the code is locked: only `fail` (§9.8) is possible for that attempt.

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `DELIVERY_NOT_FOUND` | |
| 409 | `INVALID_STATUS_TRANSITION` | Not `OUT_FOR_DELIVERY` |
| 400 | `INVALID_DELIVERY_CODE` | Wrong code |
| 409 | `DELIVERY_CODE_LOCKED` | 5 wrong attempts reached |

## 9.8 `POST /api/v1/agent/deliveries/:id/fail` (AGENT)
Records a failed attempt. `OUT_FOR_DELIVERY` → `FAILED_ATTEMPT`; `attempts` increases by 1; the application returns to `APPROVED`; the delivery code is discarded. The citizen is notified; an admin reassigns or re-dispatches via §9.3. Success: `200`, `data` = **AdminDelivery**.

| Field | Type | Required | Validation |
|---|---|---|---|
| `reasonCode` | string | yes | `CITIZEN_UNAVAILABLE`, `WRONG_ADDRESS`, `CITIZEN_REFUSED`, `OTHER` |
| `reason` | string | conditional | required when `reasonCode` is `OTHER` (5–300 chars); optional otherwise (0–300 chars) |

**Errors:** `404 DELIVERY_NOT_FOUND`; `409 INVALID_STATUS_TRANSITION`.

---

# 10. Admin: staff, citizens, audit log, stats, settings

All endpoints require role `ADMIN`.

## 10.1 `POST /api/v1/admin/staff`
Creates an `ADMIN` or `AGENT` account. Success: `201`, `data` = **User** with `mustChangePassword: true`.

| Field | Type | Required | Validation |
|---|---|---|---|
| `fullName` | string | yes | §0.12 |
| `email` | string | yes | §0.12 |
| `phone` | string | yes | §0.12 |
| `role` | string | yes | `ADMIN` or `AGENT` |
| `governorate` | string | conditional | required for `AGENT`, forbidden for `ADMIN`; one of §2.1 |
| `temporaryPassword` | string | yes | §0.12; the admin shares it out of band; the user must change it at first login |

**Errors:** `409 EMAIL_ALREADY_REGISTERED`.

## 10.2 `GET /api/v1/admin/staff`
**Paginated.** `data`: **User[]**.

| Query | Type | Validation |
|---|---|---|
| `role` | string | `ADMIN` or `AGENT` |
| `isActive` | boolean | |
| `q` | string | 2–100 chars, name or email contains |
| `sort` | string | `createdAt`, `-createdAt` (default), `fullName`, `-fullName` |
| `page`, `pageSize` | integers | §0.16 |

## 10.3 `PATCH /api/v1/admin/staff/:id`
Success: `200`, `data` = **User**. Role is immutable.

| Field | Type | Required | Validation |
|---|---|---|---|
| `fullName` | string | no | §0.12 |
| `phone` | string | no | §0.12 |
| `governorate` | string | no | one of §2.1, `AGENT` only |
| `isActive` | boolean | no | deactivating invalidates the user's sessions |

At least one field is required.

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `USER_NOT_FOUND` | Unknown id or not a staff account |
| 409 | `CANNOT_MODIFY_SELF` | An admin tries to change their own `isActive` |
| 409 | `LAST_ADMIN` | Deactivating the only active admin |
| 409 | `AGENT_HAS_ACTIVE_DELIVERIES` | Deactivating an agent with `ASSIGNED` or `OUT_FOR_DELIVERY` deliveries |
| 400 | `GOVERNORATE_NOT_ALLOWED` | `governorate` sent for an `ADMIN` account |

## 10.4 `GET /api/v1/admin/citizens`
**Paginated.** `data`: `{ id, fullName, nationalIdMasked, email, phone, isActive, createdAt }[]`.

| Query | Type | Validation |
|---|---|---|
| `q` | string | 3–100 chars; national ID (exact 14 digits), email, or name contains |
| `isActive` | boolean | |
| `sort` | string | `createdAt`, `-createdAt` (default) |
| `page`, `pageSize` | integers | §0.16 |

## 10.5 `PATCH /api/v1/admin/citizens/:id`
Success: `200`, `data` = the same object shape as §10.4 items.

| Field | Type | Required | Validation |
|---|---|---|---|
| `isActive` | boolean | yes | deactivating invalidates the citizen's sessions; their applications are unaffected |

**Errors:** `404 USER_NOT_FOUND`.

## 10.6 `GET /api/v1/admin/audit-logs`
**Paginated.** `data`: **AuditLog[]**, newest first.

| Query | Type | Validation |
|---|---|---|
| `action` | comma list | valid AuditAction values |
| `entityType` | string | valid entity type |
| `entityId` | string | uuid or slug or `singleton` |
| `actorId` | uuid | |
| `from`, `to` | ISO 8601 | `from ≤ to` |
| `page`, `pageSize` | integers | §0.16 |

## 10.7 `GET /api/v1/admin/stats`
`data`:
```json
{
  "applicationsByStatus": { "SUBMITTED": 12, "UNDER_REVIEW": 4, "APPROVED": 3, "REJECTED": 2, "OUT_FOR_DELIVERY": 5, "DELIVERED": 40, "CANCELLED": 1 },
  "overdueApplications": 2,
  "deliveriesByStatus": { "PENDING_ASSIGNMENT": 1, "ASSIGNED": 2, "OUT_FOR_DELIVERY": 5, "DELIVERED": 40, "FAILED_ATTEMPT": 1 },
  "unassignedDeliveries": 1,
  "averageDecisionHours30d": 18.5
}
```
Every status key is always present (value `0` when none). `DRAFT` is excluded. `averageDecisionHours30d` is the mean time from submission to decision over the last 30 days, `null` when there were no decisions.

## 10.8 `PATCH /api/v1/admin/settings`
Updates the singleton (there is no create or delete). Success: `200`, `data` = **Settings**.

| Field | Type | Required | Validation |
|---|---|---|---|
| `supportEmail` | string \| null | no | §0.12 or null |
| `supportPhone` | string \| null | no | §0.12 or null |
| `announcement` | Localized \| null | no | each language 1–300 chars, or null to clear |

At least one field is required.

---

# 11. Side-effects matrix (emails, notifications, audit)

Notifications, emails and audit entries are produced by the server as a consequence of the actions below. Email is sent through a transactional email provider asynchronously after the database commit; **an email failure never fails or rolls back the API request** (failures are retried and logged server-side). Emails are sent to citizens in their `preferredLanguage`. Staff receive in-app notifications only (no email), except the password reset email.

| Trigger | Notification type (recipient) | Email | Audit action |
|---|---|---|---|
| Citizen submits (§4.7) | `APPLICATION_SUBMITTED` (citizen) | Yes: "We received your application" | `APPLICATION_SUBMITTED` |
| Citizen cancels (§4.8) | `APPLICATION_CANCELLED` (citizen) | No | `APPLICATION_CANCELLED` |
| Admin starts review (§7.4) | `APPLICATION_UNDER_REVIEW` (citizen) | No | `APPLICATION_REVIEW_STARTED` |
| Admin approves (§7.5) | `APPLICATION_APPROVED` (citizen) | Yes: approved, credential number | `APPLICATION_APPROVED`, `CREDENTIAL_ISSUED`, `DELIVERY_CREATED` |
| Admin rejects (§7.6) | `APPLICATION_REJECTED` (citizen) | Yes: includes the reason | `APPLICATION_REJECTED` |
| Credential revoked (§7.7) | `CREDENTIAL_REVOKED` (citizen) | Yes | `CREDENTIAL_REVOKED` |
| Delivery assigned (auto or §9.3) | `DELIVERY_ASSIGNED` (agent) | No | `DELIVERY_ASSIGNED` |
| Agent starts (§9.6) | `DELIVERY_OUT_FOR_DELIVERY` (citizen) | Yes: includes agent name and that the code is in the app | `DELIVERY_OUT_FOR_DELIVERY` |
| Agent fails (§9.8) | `DELIVERY_FAILED_ATTEMPT` (citizen) | Yes | `DELIVERY_FAILED` |
| Agent delivers (§9.7) | `DELIVERY_COMPLETED` (citizen) | Yes | `DELIVERY_COMPLETED` |
| Change password (§1.6) | none | Yes: "password changed" confirmation | none |
| Forgot password (§1.7) | none | Yes: reset link | none |
| Reset password done (§1.8) | none | Yes: "password changed" confirmation | `PASSWORD_RESET_COMPLETED` |
| Service created / edited / published / unpublished / deleted (§8) | none | No | `SERVICE_CREATED`, `SERVICE_UPDATED`, `SERVICE_PUBLISHED`, `SERVICE_UNPUBLISHED`, `SERVICE_DELETED` |
| Staff created / updated (§10.1, §10.3) | none | No | `STAFF_CREATED`, `STAFF_UPDATED` |
| Citizen deactivated / reactivated (§10.5) | none | No | `CITIZEN_DEACTIVATED`, `CITIZEN_REACTIVATED` |
| Mock payment (§4.6) | none | No | `PAYMENT_MARKED_PAID_MOCK` |
| Settings updated (§10.8) | none | No | `SETTINGS_UPDATED` |

**NotificationType values:** `APPLICATION_SUBMITTED`, `APPLICATION_CANCELLED`, `APPLICATION_UNDER_REVIEW`, `APPLICATION_APPROVED`, `APPLICATION_REJECTED`, `CREDENTIAL_REVOKED`, `DELIVERY_ASSIGNED`, `DELIVERY_OUT_FOR_DELIVERY`, `DELIVERY_FAILED_ATTEMPT`, `DELIVERY_COMPLETED`.

**AuditAction values:** the "Audit action" column above (`APPLICATION_SUBMITTED`, `APPLICATION_REVIEW_STARTED`, `APPLICATION_APPROVED`, `APPLICATION_REJECTED`, `APPLICATION_CANCELLED`, `CREDENTIAL_ISSUED`, `CREDENTIAL_REVOKED`, `DELIVERY_CREATED`, `DELIVERY_ASSIGNED`, `DELIVERY_OUT_FOR_DELIVERY`, `DELIVERY_FAILED`, `DELIVERY_COMPLETED`, `SERVICE_CREATED`, `SERVICE_UPDATED`, `SERVICE_PUBLISHED`, `SERVICE_UNPUBLISHED`, `SERVICE_DELETED`, `STAFF_CREATED`, `STAFF_UPDATED`, `CITIZEN_DEACTIVATED`, `CITIZEN_REACTIVATED`, `PAYMENT_MARKED_PAID_MOCK`, `PASSWORD_RESET_COMPLETED`, `SETTINGS_UPDATED`).

---

# Appendix A: Backend-only notes (remove from any public copy)

**A.1 Environment variables (names only; values live in each environment's secret store, never in the repository or this document):**
`NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN`, `CORS_ORIGINS`, `FRONTEND_BASE_URL`, `TRUST_PROXY`, `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM`, `STORAGE_DRIVER`, `STORAGE_LOCAL_PATH` / `STORAGE_BUCKET` (per driver), `PAYMENT_MODE` (`mock` or `disabled`), `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `RATE_LIMIT_*` overrides.

**A.2 First boot:** the server runs migrations, creates the Settings singleton (`id = "singleton"`), and creates the first `ADMIN` from the `SEED_ADMIN_*` variables when no admin exists (with `mustChangePassword: true`).

**A.3 Automatic agent assignment (on approval):** pick an active `AGENT` whose `governorate` equals the delivery address governorate, with the fewest deliveries in `ASSIGNED` or `OUT_FOR_DELIVERY` (ties: the agent whose last assignment is oldest). If none, the delivery stays `PENDING_ASSIGNMENT` and appears in `GET /admin/deliveries?unassigned=true`.

**A.4 Security implementation notes:** passwords hashed with argon2id; reset tokens stored only as hashes; QR tokens ≥ 32 random bytes; JWT carries a per-user `tokenVersion` checked on every request (this is how invalidation works); regex patterns in form schemas are run with a safety check and a timeout; uploaded files are stored outside any web root under server-generated names and served only through §4.10.

**A.5 Status transition guard:** all status changes run inside a database transaction with a row lock on the application/delivery row; the "wrong source status" case returns `INVALID_STATUS_TRANSITION`, which also makes double-clicks and concurrent admins safe.

---

# 12. Open questions and deferred items

These are decisions taken for the MVP or items intentionally postponed. Nothing here is silently assumed elsewhere in the document.

| # | Item | MVP decision | Needs input before |
|---|---|---|---|
| 1 | **National ID verification.** No government registry is available. | Registration validates the national ID's structure only (§1.1). A future registry integration will add the error code `NATIONAL_ID_VERIFICATION_FAILED` to `POST /auth/register` without changing the request shape. | Incubation / government pilot |
| 2 | **Email verification** for new accounts. | Not required in the MVP; citizens can log in immediately. | Production launch |
| 3 | **Real payment gateway.** | Payment is a placeholder: the `payment` object and a mock endpoint (§4.6). A real gateway will replace the mock endpoint with a payment-intent and callback flow; the `payment` object stays. | Production launch |
| 4 | **SMS / OTP.** | Email and in-app notifications only. | Production launch |
| 5 | **"Needs correction" loop** (return to citizen instead of final rejection). | Rejection is final; the citizen starts a new application. | Product decision |
| 6 | **Production origins and cookie `SameSite`.** | Default assumes web app and API share a registrable domain (`SameSite=Lax`). If deployed on separate registrable domains, set `COOKIE_SAMESITE=none` (with `Secure`, automatic outside local development). | Deployment planning |
| 7 | **CDN in front of the API.** | Caching rules in §0.15 are safe with or without one. | Deployment planning |
| 8 | **File storage backend for production.** | `local` for development, an object-storage driver for production; no contract impact. | Deployment planning |
| 9 | **Correcting a citizen's identity data** (name typo, national ID). | Identity fields are immutable; no admin correction endpoint in the MVP. | Product decision |
| 10 | **SLA in working days** (weekend Friday–Saturday, public holidays). | `slaDays` is calendar days. | Product decision |
| 11 | **Refresh tokens / sliding sessions.** | Fixed 12-hour session. | Post-MVP |
| 12 | **Granular staff roles** (reviewer vs. super admin, per-service permissions). | One `ADMIN` role. | Post-MVP |
| 13 | **Languages beyond Arabic and English.** | `ar` and `en` only. | Post-MVP |
| 14 | **Native mobile clients.** | Out of scope; would require a Bearer scheme and `v2`. | Post-MVP |

---

# Changelog

## 1.0.3-mvp (2026-11-21)
- **§0.2 & §0.9 (Content-Type on writes):** clarified that write requests with a body require `application/json` (or `multipart/form-data` on §4.9), disallowed `Content-Type` values are always rejected with `415 UNSUPPORTED_MEDIA_TYPE` even with an empty body, and `Body: none` endpoints accept an omitted body with no `Content-Type`, an empty body with `application/json`, or `{}` with `application/json`.
- **§0.4:** added `503` (Service unavailable) to the HTTP status code table to match §2.3.
- **§0.9 (Forced password change):** clarified that `403 PASSWORD_CHANGE_REQUIRED` applies to authenticated endpoints only; public endpoints ignore cookies (§0.15) and remain accessible.
- **§0.12 (Password rule):** clarified that the email local-part ban applies when the local part is at least 3 characters (case-insensitive).
- **§0.20 (`AdminApplication` & mask):** explicitly omitted citizen `delivery` on `AdminApplication` (admins use `deliveryRecord` only; `deliveryCode` is never exposed to admins or agents); corrected masked national ID examples (`29**********45`, 10 asterisks) in §0.20 and §7.2.
- **§1.5 (`POST /auth/logout`):** made logout public (skips auth and forced-password-change guards while keeping the `Origin` check) so expired, invalid, or missing sessions always clear the cookie and return `200 { loggedOut: true }`.
- **§4.1:** clarified that `DRAFT` applications start with `statusHistory: []` (first history row is created on submit).
- **§4.6 & §4.7:** clarified that unpaid and free (`NOT_REQUIRED`) drafts always re-sync `payment.amount` and `payment.status` to the service's current published fee on read, mock payment, and submit; clarified `MISSING_REQUIRED_FIELDS` vs `VALIDATION_ERROR` precedence and individual `deliveryAddress.<sub>` detail paths on submit.
- **§4.9 & §4.10:** added `409 SERVICE_NOT_AVAILABLE` to attachment upload when the service is unpublished; added `Content-Security-Policy: default-src 'none'; sandbox` and RFC 5987 UTF-8 `Content-Disposition` filename encoding to attachment download.
- **§7.2:** extended CSV formula-injection guard to also prefix tab (`\t`) and carriage return (`\r`).
- **§11:** added `Change password (§1.6)` confirmation email (`PASSWORD_CHANGED`) to the side-effects matrix.
- **§12 (#6):** recorded `SameSite=Lax` (shared registrable domain) as the MVP default with `SameSite=None; Secure` documented as the cross-domain alternative.
