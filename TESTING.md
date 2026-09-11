# Sprint Board — Testing Plan (Phases 1–4)

Manual + automated verification checklist for the security (Phases 1–2) and UX (Phases 3–4) work.

## Test environment

| Component | Local URL | Notes |
|---|---|---|
| Backend API | `http://localhost:5000` | New build: `npm start` (serves `dist/server.js`) |
| Frontend | `http://localhost:3000` | `next start` (production build) |

- **Admin credentials**: read from `backend/.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Do not commit real credentials.
- **Test user**: register one via the UI with a strong password (e.g. `TestUser@2026`). The register limiter allows 3/hour/IP — register sparingly; the automated script reuses one user per run.
- **Register limiter state**: the register limiter (3/hour/IP) is stored in memory. Restart the backend (`npm start`) to clear it if you hit a `429` while testing. Login rate limiting/lockout has been **removed** by request — repeated failed logins never throttle.

---

## Automated API tests

Provided separately as a local-only script (`test-api.ps1`, not part of the repo).

```powershell
C:\Users\jchan\AppData\Local\Temp\opencode\test-api.ps1 -BaseUrl http://localhost:5000
```

Reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `backend/.env` (or pass `-AdminEmail`/`-AdminPassword`). Covers **P1.1–P1.10** and **P2.1–P2.9** below; prints pass/fail and a summary.

---

## Phase 1 — API security hardening

Verify with the script, or manually with `curl.exe`:

| # | Test | Command / Steps | Expected |
|---|---|---|---|
| P1.1 | Helmet headers | `curl.exe -s -i http://localhost:5000/api/health` | Present on every response (incl. 404/429): `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Content-Security-Policy`, `Referrer-Policy`, `X-Download-Options` |
| P1.2 | CORS allowed origin | Request with `Origin: http://localhost:3000` | `200` + `Access-Control-Allow-Origin: http://localhost:3000` |
| P1.3 | CORS blocked origin | Request with `Origin: http://evil.com` (GET and OPTIONS preflight) | No `Access-Control-Allow-Origin` header; origin rejected |
| P1.4 | CORS no origin | Request without `Origin` (curl/tooling) | Still `200` |
| P1.5 | Body limit | POST `/api/tasks` (valid token) with a >10 kb body | Request handled without crash (observe returned status; see Findings) |
| P1.6 | Mongo-injection sanitize | POST `/api/tasks` with `{"title": {"$gt": ""}}`; or `GET /api/tasks?status[$ne]=x` | No `$`-operator honored, no data leak, no crash |
| P1.7 | Malformed JSON | POST `/api/auth/login` with an invalid JSON body | Caught as an error, not a crash loop (see Findings) |
| P1.8 | Unknown route | `GET /api/nope` | `404` JSON `{ success: false, message: "Route not found..." }` |
| P1.9 | No login rate limit | 10 rapid bad-login POSTs | Every attempt returns `401` "Invalid credentials" (login throttling removed by design) |
| P1.10 | Register rate limit | 4 rapid register POSTs | 4th → `429` "Too many registration attempts" |
| P1.11 | Env validation | `NODE_ENV=production node dist/server.js` with `JWT_SECRET` unset | Immediate startup throw (test in a scratch dir, not the live env) |
| P1.12 | Description cap | Create task with >2000-char description | `400` validation error |

---

## Phase 2 — Auth hardening

| # | Test | Steps | Expected |
|---|---|---|---|
| P2.1 | Password strength (server) | Register with `password1` (no upper), `Short1` (<8), `password` (lowercase only) | Each → `400` with a policy hint |
| P2.2 | Password strength (UI) | Same values on `/register` | Inline field error before submit |
| P2.3 | Valid register | Strong password | `201`, new user can log in |
| P2.4 | Strong login + session | Admin login → `GET /api/auth/me` with token | `200` "Session verified" (JWT carries `tokenVersion`) |
| P2.5 | Wrong password | Bad login once | `401` "Invalid credentials" |
| P2.6 | No per-email lockout | 10 bad logins on one email | Still `401` "Invalid credentials" every time (lockout removed by design) |
| P2.7 | Lock cleared on success | Correct password later | `200` (always, no lock state) |
| P2.8 | Token after password rotation | Login → tokenA; run `npm run seed`; call `/me` with tokenA | Still `200` (rotation does not bump `tokenVersion` — see Findings) |
| P2.9 | Invalidated token (advanced) | Manually bump a user's `tokenVersion` (mongosh), reuse their old token | `401` "Session is no longer valid" |
| P2.10 | Tampered token | Call `/me` with garbage token | `401` "Invalid token" |
| P2.11 | Seed safety | Run `npm run seed` without env vars; then with env vars | Fails cleanly without printing the password; with env vars logs "Credentials are read from environment variables" |
| P2.12 | Credential leak | `git grep` for the old password / admin email across tracked files (excl. history, node_modules) | Nothing except gitignored env files |

---

## Phase 3 — UX high-impact (frontend `:3000`, logged in as admin)

| # | Test | Steps | Expected |
|---|---|---|---|
| P3.1 | Success toasts | Create / edit / claim / assign / delete / move tasks | "Task created/updated/..." toast top-right, auto-dismiss ~4s, dismiss button works |
| P3.2 | Error toast + banner | Stop the backend, refresh board | Error banner with **Retry** + **Dismiss**; a mutation attempt shows an error toast |
| P3.3 | Retry recovery | Restart backend, click **Retry** | Board loads, banner clears |
| P3.4 | Confirm dialog | Click Delete on a task | Modal with title + description + red Delete + Cancel; initial focus on Cancel |
| P3.5 | Confirm: dismiss paths | ESC, click backdrop, click Cancel | Modal closes, task untouched |
| P3.6 | Confirm: proceed | Confirm Delete | Delete button shows spinner → "Task deleted" toast → task removed |
| P3.7 | Loading states | Throttle network (DevTools), click Claim / save Edit / Assign | Correct button disabled with inline spinner ("Claiming…", "Saving…"); Assign select disabled during reassign |
| P3.8 | Empty column CTA | Empty a column | Column icon + "No tasks in X" + **Create task** button that opens the modal with that status preselected |
| P3.9 | Board welcome | Empty the whole board | "Your board is empty... Create your first task" banner |
| P3.10 | Updated timestamp | Edit a task, wait ≥30 s, view card | "Updated Xm ago"; title tooltip shows full date |
| P3.11 | Drag preview | Drag a card over another column | Target column shows an indigo ring while dragging over |

---

## Phase 4 — UX medium

| # | Test | Steps | Expected |
|---|---|---|---|
| P4.1 | Search | Type a title/description fragment in the filter bar | List narrows live; counter shows "N of M tasks" |
| P4.2 | Assignee filters | "My tasks", "Unassigned", each named user | Correct subsets |
| P4.3 | Combined filters | High priority + My tasks + search term | Combined result; **Clear** resets all |
| P4.4 | Filtered column empty state | Filter so a column is empty | Column CTA still creates in that column |
| P4.5 | Ctrl/Cmd+K | Press while on the dashboard | New Task modal opens |
| P4.6 | Touch move control | Device emulation / touch device; choose "Move to …" on a card | Status changes with success toast; control hidden on hover-capable desktop |
| P4.7 | Move permissions | As normal user: move an unassigned task vs. another user's task | Matches drag permission (users can drag own/unassigned tasks; admin everything) |
| P4.8 | Drag revert | Throttle network, drag between columns, kill backend mid-drag | Optimistic move rolls back; error toast |

---

## Regression (all phases)

- **Auth pages**: `/login` and `/register` render and validate; password **eye toggle** (open eye = password visible, closed = hidden).
- **Auth guard**: expired/invalid token → redirect to `/login`.
- **Users directory** (`/dashboard/users`): loads, search works, error state has **Retry**.
- **Dark mode**: toggle persists across reloads; "system preference" fallback when unset; toasts, confirm dialog, columns follow the theme.
- **Mobile responsive**: board stacks to one column; touch move control works; no horizontal overflow.

---

## Deployment checks (after `git push` → Vercel + Render)

1. **Render**: env var `FRONTEND_URL=https://sprint-board-beige.vercel.app` set; `GET https://sprint-board-jb8b.onrender.com/api/health` → `200`; startup logs show the env validation passed. The service must use the build command `npm install --include=dev && npm run build` so dev dependencies (`@types/*`) are installed during the build despite `NODE_ENV=production` (see `backend/render.yaml`).
2. **One-time logout**: after the backend deploys, previously stored tokens (without `tokenVersion`) are rejected → every user re-logs in once. Verify admin can log in with the new password.
3. **Vercel**: load the production URL → login → create/edit/delete → toasts, confirm dialog, search/filter, Ctrl+K work; DevTools console has no errors.
4. **Prod CORS**: browser fetch from the Vercel origin to the Render API returns `Access-Control-Allow-Origin: https://sprint-board-beige.vercel.app`; origins like `http://localhost:3000` and arbitrary sites return no such header (prod allowlist is `FRONTEND_URL` only).

---

## Known findings / decisions

- **P1.7 Malformed JSON** likely returns `500` instead of `400` — the error handler doesn't special-case body-parser errors (`SyntaxError` with `err.status === 400`). Optional one-line fix in `backend/src/middleware/error.ts`. Verify the observed status first.
- **P2.8 Password rotation does not invalidate existing JWTs** (`tokenVersion` is not bumped by the seed/rotation — by design). To force logout after a rotation, bump all users' `tokenVersion` manually.