# Better Auth Admin Panel

> **Beta** — A self-hostable admin panel for [Better Auth](https://better-auth.com) applications. Manage users, sessions, organizations, security settings, and system health from one secure, focused dashboard. Built with [TanStack Start](https://tanstack.com/start), React 19, Drizzle ORM, and shadcn/ui.

![Version](https://img.shields.io/badge/version-1.10.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D24-green)
![License](https://img.shields.io/badge/license-public-green)

---

## Features

| Area | What you get |
|:-----|:-------------|
| **User management** | Search, filter, sort, bulk ban/delete, role changes, impersonation, email verification, activity timeline, CSV export, and user creation/seed dialogs |
| **Security** | Database-backed rate limiting, encrypted OAuth tokens, session revocation, impersonation protection, CSRF protection, and secure cookies |
| **Audit log** | A record of every privileged action, including actor, target, IP address, user agent, and metadata |
| **Analytics** | Signup trends, active users, session activity, role distribution, and cumulative growth charts |
| **Organizations** | Inspect and delete multi-tenant organizations, and view members and roles |
| **Email configuration** | SMTP settings with test email support for password resets and verification |
| **System information** | Live CPU, memory, disk, and uptime metrics in the header |
| **Rate limits** | Inspect and clear rate-limit state from the dashboard |
| **Global sessions** | View and revoke active sessions across the entire app |
| **RBAC** | `admin` and `user` roles with granular server-side permission enforcement |
| **Better Auth infrastructure** | Optional Dash analytics and Sentinel abuse protection when `BETTER_AUTH_API_KEY` is set |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| **Framework** | TanStack Start (SSR) + React 19 |
| **Router / Data** | TanStack Router + TanStack Query |
| **Auth** | Better Auth (admin, organization, bearer, openAPI, expo, dash infra plugins) |
| **Database** | PostgreSQL (default) · SQLite (dev) via Drizzle ORM |
| **UI** | Tailwind CSS v4 + Radix UI (shadcn/ui) |
| **Tests** | Vitest (unit) · Playwright (e2e) |

---

## Getting Started

### Prerequisites

- **Node.js** 24+ (recommended)
- **npm**, pnpm, or yarn
- **PostgreSQL** — for production/staging; or use the built-in **SQLite** driver for zero-setup local development

### Clone

```bash
git clone https://github.com/boudraprof/better-auth-panel.git
cd better-auth-panel
```

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | Strong signing secret — generate with `openssl rand -base64 32` |
| `BETTER_AUTH_BASE_URL` | Public base URL, e.g. `http://localhost:8000` |
| `DATABASE_URL` | PostgreSQL connection string (or use `DB_DRIVER=sqlite` below) |

**SQLite quick start (no Postgres needed):**

```bash
DB_DRIVER=sqlite
SQLITE_DB_PATH=./dev.sqlite
```

### 3. Prepare the database

**SQLite (dev):**
```bash
npm run db:sqlite:push
# or apply migrations: npm run db:sqlite:migrate
```

**PostgreSQL:**
```bash
npm run db:push
# or apply migrations: npm run db:migrate
```

### 4. Create an admin account

The panel has no public sign-up flow. Promote an existing user or create one via:

```bash
npm run make-admin you@example.com
```

> Run this with the same environment as the app (inside the container or with the same `.env`) so the promotion writes to the correct database.

### 5. Start the dev server

```bash
npm run dev
```

Open **http://localhost:8000** in your browser.

---

## Production

### Build & run

```bash
npm run build
npm start            # serves dist/ on PORT (default 8000) with security headers
```

### Docker

```bash
# Build the image
docker build -t better-dash-admin .

# Run with PostgreSQL
docker run -p 8000:8000 --env-file .env better-dash-admin

# Run with SQLite (mount a volume for persistence)
docker run -p 8000:8000 -v panel-data:/data \
  -e DB_DRIVER=sqlite -e SQLITE_DB_PATH=/data/admin-panel.db \
  -e BETTER_AUTH_SECRET=... better-dash-admin
```

### Production checklist

- [ ] Set a strong `BETTER_AUTH_SECRET` and HTTPS-terminated `BETTER_AUTH_BASE_URL`
- [ ] Add your app/mobile origins to `BETTER_AUTH_TRUSTED_ORIGINS` and `ALLOWED_ORIGINS`
- [ ] Set `APP_URL` to the deployed origin
- [ ] If behind a reverse proxy, set `TRUSTED_PROXIES` (IPs/CIDRs) to prevent IP spoofing
- [ ] Promote an admin with `npm run make-admin <email>` (run inside the container or with the same env)

---

## Demo Mode

The panel can be run as a **read-only public demo**. When demo mode is on, every
mutating action is rejected and the UI explains why — so anyone can explore the
dashboard, analytics, audit log, organizations, etc. without changing any data.

### Try the live demo

A read-only instance is deployed at [https://better-auth-panel.vercel.app/](https://better-auth-panel.vercel.app/). Sign in with the
shared demo account — all changes are disabled, so explore freely:

| Email | Password |
|-------|----------|
| `demo@example.com` | `admin123` |

Enable it with the `DEMO_MODE` environment variable:

```bash
# .env — defaults to 'true' when unset (this repo is deployed as a live demo)
DEMO_MODE=true
```

What is blocked (server-side, so it can't be bypassed via the API either):

- Creating / deleting / banning / unbanning users, impersonation, role changes
- Editing or deleting your own profile, changing email or password
- Managing organizations (create / delete / members / invitations)
- Admin API mutations: email-verify, set-role, bulk-actions, seed-users,
  email-config save/test, rate-limits clear, session revoke, …

What still works:

- **All reads** — browse users, analytics, audit log, orgs, sessions, hardware
- Signing in (so visitors can see the authenticated experience)

The client shows an amber banner and an informational toast on every disabled
action. Set `DEMO_MODE=false` to run a normal, fully writable admin panel.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 8000 |
| `npm run build` | Production build |
| `npm start` | Production server (serves `dist/`) |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier + ESLint auto-fix |
| `npm run test:vi` | Unit tests (Vitest) |
| `npm run test:vi:ui` | Unit tests with interactive UI |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:e2e:ui` | Playwright with interactive UI |
| `npm run make-admin <email>` | Promote a user to admin |
| `npm run db:push` | Apply schema to PostgreSQL |
| `npm run db:migrate` | Apply migrations to PostgreSQL |
| `npm run db:sqlite:push` | Apply schema to SQLite |
| `npm run db:sqlite:migrate` | Apply migrations to SQLite |
| `npm run db:studio` | Open Drizzle Studio |

---

## Project Structure

```
better-auth-panel/
├── src/
│   ├── components/            # UI components
│   │   ├── dashboard/         # Dashboard widgets (UserRow, UserDetailDialog, StatsCards, …)
│   │   └── ui/                # shadcn/ui primitives (Button, Card, Input, …)
│   ├── db/                    # Drizzle schemas (schema.ts for pg, schema-sqlite.ts for SQLite)
│   ├── middleware/            # Admin / API / CORS middleware
│   ├── routes/                # File-based routes (pages + /v1/api/* endpoints)
│   │   ├── index.tsx          # Dashboard (user management)
│   │   ├── analytics.tsx      # Analytics page
│   │   ├── organizations.tsx  # Organization management
│   │   ├── audit-log.tsx      # Audit log viewer
│   │   ├── email-config.tsx   # SMTP email configuration
│   │   ├── sys-info.tsx       # System information
│   │   ├── rate-limits.tsx    # Rate limits inspector
│   │   └── api.v1.admin.$.ts  # All admin API endpoints
│   └── utils/                 # Auth, audit, email, session, config, logger helpers
├── e2e/                       # Playwright specs + global setup
├── drizzle/                   # Migration files
├── scripts/                   # make-admin and dev utilities
├── app-server.mjs             # Production server
├── Dockerfile                 # Multi-stage Docker build
└── .env.example               # Environment variable reference
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full annotated list.

| Variable | Required | Description |
|----------|:--------:|-------------|
| `BETTER_AUTH_SECRET` | ✅ | Auth signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_BASE_URL` | ✅ | Public base URL of the panel |
| `BETTER_AUTH_TRUSTED_ORIGINS` | ✅ | Comma-separated origins allowed to call auth endpoints |
| `APP_URL` | ✅ | Absolute URL used for in-process server calls (SSR) |
| `DATABASE_URL` | pg only | PostgreSQL connection string |
| `DB_DRIVER` | | `pg` (default) or `sqlite` |
| `SQLITE_DB_PATH` | sqlite only | Path to SQLite database file |
| `BETTER_AUTH_BASE_PATH` | | Base path for auth endpoints (default: `v1/api`) |
| `ALLOWED_ORIGINS` | | Comma-separated CORS allow-list for `/v1/api/*` |
| `TRUSTED_PROXIES` | | Reverse-proxy IPs/CIDRs for reliable client IP tracking |
| `BETTER_AUTH_API_KEY` | | Enables dash analytics + sentinel plugins (better-auth.com) |
| `E2E_ADMIN_EMAIL` | e2e only | Test admin email for Playwright global setup |
| `E2E_ADMIN_PASSWORD` | e2e only | Test admin password for Playwright global setup |

---

## Migrations

- **SQLite (dev)** — `npm run db:sqlite:migrate` applies migrations from the Drizzle journal.
- **PostgreSQL** — `npm run db:migrate` applies the full journal.
- **Shared PostgreSQL database** — if the panel shares a database with your main app, run [`drizzle/0002_restore_admin_tables.sql`](drizzle/0002_restore_admin_tables.sql) directly against Postgres instead. It is **idempotent** and only creates panel-owned tables (`audit_log`, `email_config`, `rate_limit`, …) that the main app's migrations may not include.

---

## License

[GNU Affero General Public License v3.0](licence) (AGPL-3.0)
