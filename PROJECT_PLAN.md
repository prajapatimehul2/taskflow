# TaskFlow — Build Plan

A clean, Notion-style personal task manager. Multi-user, secure, production-grade.
This document is the single source of truth for building the project. Follow it phase by phase, top to bottom.

---

## 1. Product Overview

TaskFlow lets a signed-in user manage their own tasks, organize them with categories, filter and search them, and see a simple dashboard of their progress. Every user only ever sees their own data.

### Feature scope (final — do not add more)
- Auth: email + password signup, login, logout. Session-protected app.
- Tasks: create, edit, delete, mark complete / incomplete.
- Categories: user-defined labels (e.g. Work, Personal). Assign one category per task.
- Filter & search: by status (all / active / completed), by category, and a text search on title.
- Dashboard: total tasks, completed, pending, completion rate.
- Data isolation: every query is scoped to the logged-in user. No cross-user reads or writes.

### Explicit non-goals
No teams, no sharing, no real-time, no payments, no file uploads, no email sending. Keep it tight.

---

## 2. Tech Stack (pin these)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | React Server Components by default |
| Language | TypeScript (strict) | `strict: true` in tsconfig |
| Database | PostgreSQL 16 | Docker (local dev/test) · Neon (prod deploy) |
| ORM | Prisma | Single client instance |
| Auth | Auth.js (NextAuth v5) | Credentials provider, JWT sessions |
| Password hashing | bcrypt (cost factor 12) | Never store plaintext |
| Validation | Zod | Validate every input on the server |
| UI | Tailwind CSS + shadcn/ui | Notion-style tokens (section 4) |
| Icons | lucide-react | Thin, minimal line icons |
| Forms | react-hook-form + zod resolver | Client UX + server re-validation |
| Deploy | Vercel + Neon | Push to deploy |

Use the latest stable minor of each at build time. Do not mix package managers — pick `pnpm` and stay with it.

---

## 3. Architecture & Conventions

- **Server Components by default.** Only mark a component `"use client"` when it needs state, effects, or browser events.
- **Mutations via Server Actions.** No hand-rolled API routes for CRUD. The only route handler is the Auth.js catch-all.
- **Validate on the server, always.** Client validation is UX only; the server re-validates with Zod before touching the DB.
- **Data access layer.** All Prisma access lives in `src/lib/data/` and `src/lib/actions/`. UI components never import Prisma directly.
- **Auth context is the source of truth for `userId`.** Never accept a `userId` from the client. Read it from the session on the server.
- **Revalidate after mutations** with `revalidatePath` so the UI reflects current state.

### Folder structure
```
src/
  app/
    (auth)/
      login/page.tsx
      signup/page.tsx
    (app)/
      layout.tsx            # protected shell: sidebar + topbar
      dashboard/page.tsx
      tasks/page.tsx
      categories/page.tsx
    api/auth/[...nextauth]/route.ts
    layout.tsx              # root layout, fonts, theme
    globals.css
  components/
    ui/                     # shadcn primitives
    layout/                 # sidebar, topbar, nav
    tasks/                  # task list, task row, task form/dialog
    categories/
    dashboard/
  lib/
    auth.ts                 # Auth.js config
    db.ts                   # Prisma client singleton
    actions/                # server actions (mutations)
    data/                   # server-only read queries
    validations/            # zod schemas
    utils.ts
  middleware.ts             # route protection
prisma/
  schema.prisma
  seed.ts
```

---

## 4. Design System — Notion Style

The look is calm, neutral, text-first, generous whitespace, almost no shadows, thin borders. Light mode is primary; dark mode is supported.

### Color tokens (light)
| Token | Value | Use |
|---|---|---|
| `--background` | `#ffffff` | Page background |
| `--surface` | `#fbfbfa` | Sidebar, subtle panels |
| `--foreground` | `#37352f` | Primary text (Notion's signature near-black) |
| `--muted-foreground` | `#787774` | Secondary text, metadata |
| `--border` | `rgba(55,53,47,0.09)` | Dividers, input borders |
| `--hover` | `rgba(55,53,47,0.06)` | Row / nav item hover |
| `--accent` | `#2383e2` | Primary buttons, links, focus ring |
| `--success` | `#448361` | Completed state |
| `--danger` | `#d44c47` | Destructive actions |

### Color tokens (dark)
| Token | Value |
|---|---|
| `--background` | `#191919` |
| `--surface` | `#202020` |
| `--foreground` | `#e9e9e7` |
| `--muted-foreground` | `#9b9a97` |
| `--border` | `rgba(255,255,255,0.094)` |
| `--hover` | `rgba(255,255,255,0.055)` |
| `--accent` | `#2383e2` |

### Typography
- Font: system UI sans stack, or `Inter`. Headings and body share the family.
- Sizes: page title 28-30px / 600, section heading 16px / 600, body 14-15px, metadata 12-13px.
- Line height generous (1.5). Letter spacing default.

### Shape & spacing
- Corner radius: 4-6px (small, like Notion). Avoid large pills.
- Borders: 1px, very low contrast (use `--border`).
- Shadows: avoid. At most a faint shadow on popovers/dialogs.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Lean toward more whitespace.

### Components & patterns
- **Sidebar**: left, `--surface` background, collapsible nav items with a leading lucide icon, hover = `--hover`, active = slightly stronger hover + medium weight text.
- **Topbar**: page title left, primary action button right. Thin bottom border.
- **Task row**: checkbox (round, Notion-like) + title + category chip + due date, all on one line; hover reveals edit/delete. Completed task = strikethrough + muted text.
- **Buttons**: primary = `--accent` solid; secondary = transparent with border; ghost = transparent, hover bg. All subtle, no gradients.
- **Inputs**: thin border, no heavy focus glow — a 1px accent ring is enough.
- **Empty states**: centered icon + one line of muted text + a single action. Calm, not loud.
- **Category chip**: small rounded tag with a soft tint; muted, not saturated.
- **Dark mode toggle** in the sidebar footer.

The end result should feel like a focused Notion workspace, not a flashy dashboard. No emojis in the UI.

---

## 5. Database Schema (Prisma)

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String     @id @default(cuid())
  name         String?
  email        String     @unique
  passwordHash String
  createdAt    DateTime   @default(now())
  categories   Category[]
  tasks        Task[]
}

model Category {
  id     String @id @default(cuid())
  name   String
  color  String @default("#787774")
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks  Task[]

  @@unique([userId, name])
  @@index([userId])
}

enum TaskStatus {
  ACTIVE
  COMPLETED
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(ACTIVE)
  dueDate     DateTime?
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId  String?
  category    Category?  @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([userId])
  @@index([userId, status])
}
```

Notes: `onDelete: Cascade` so deleting a user cleans up their data; deleting a category sets tasks' category to null (tasks survive). Every task and category carries `userId` and is always queried with it.

---

## 6. Security Requirements (non-negotiable)

- Hash passwords with bcrypt, cost 12. Never log or return the hash or plaintext.
- Sessions: Auth.js JWT strategy, `httpOnly` secure cookies. Set a strong `AUTH_SECRET`.
- Protect all `(app)` routes via `middleware.ts`. Unauthenticated users redirect to `/login`.
- Every read and every mutation filters by the session `userId`. Treat any record whose `userId` does not match the session as not found (return 404-style, do not leak existence).
- Validate all input with Zod on the server before DB access. Reject malformed payloads.
- Prisma parameterizes queries — never build SQL by string concatenation.
- Do not expose internal errors. Catch, log server-side with context (no secrets), return a generic message to the client.
- Rate-limit auth attempts at least minimally (e.g. simple in-memory or upstash if added). Document if skipped.
- `.env` is git-ignored. Provide `.env.example` with placeholder keys only.
- Generic auth errors: "Invalid email or password" — never reveal which field was wrong.

---

## 7. Build Phases

Each phase has a goal, concrete steps, and a "done when" check. Complete and verify a phase before moving on.

### Phase 0 — Project setup
- Goal: a running Next.js 15 + TS app with Tailwind, lint, and formatting.
- Steps:
  - Scaffold Next.js 15 App Router + TypeScript (strict) with `pnpm`.
  - Install Tailwind, configure `globals.css`, init shadcn/ui.
  - Add ESLint + Prettier; set up `tsconfig` paths (`@/*`).
  - Create the folder structure from section 3 (empty placeholders).
  - Add `.env.example` and `.gitignore`.
- Done when: `pnpm dev` serves a blank page with no type or lint errors.

### Phase 1 — Database (local Docker) & Prisma
- Goal: a local Postgres running in Docker, schema migrated, Prisma client wired.
- Steps:
  - Create `docker-compose.yml` exactly as in section 9.1 (Postgres 16-alpine, named volume, port 5432).
  - Run `docker compose up -d` and confirm the container is healthy.
  - Create `.env.example` as in section 9.2 and copy it to `.env`; `DATABASE_URL` already points to the local Docker DB.
  - Add `prisma/schema.prisma` (section 5). Run `pnpm prisma migrate dev --name init`.
  - Create `src/lib/db.ts` as a singleton client (guard against hot-reload duplication).
  - Write `prisma/seed.ts` (one demo user + a couple of categories/tasks); wire `prisma db seed`.
- Done when: `docker compose ps` shows the DB up and `pnpm prisma studio` shows the tables with seed data.

### Phase 2 — Authentication
- Goal: working signup / login / logout with protected routes.
- Steps:
  - Configure Auth.js v5 in `src/lib/auth.ts`: Credentials provider, JWT session, bcrypt compare in `authorize`.
  - Add the catch-all route handler at `app/api/auth/[...nextauth]/route.ts`.
  - Build `(auth)/signup` and `(auth)/login` pages with react-hook-form + zod.
  - Signup server action: validate, check email uniqueness, hash password, create user.
  - Add `middleware.ts` to protect `(app)` routes and redirect.
  - Add logout action.
- Done when: a new user can sign up, log in, reach the app, and logging out blocks access again. Wrong credentials show a generic error.

### Phase 3 — App shell & design system
- Goal: the Notion-style protected layout and reusable UI.
- Steps:
  - Implement design tokens (section 4) in `globals.css` as CSS variables + Tailwind theme; wire light/dark.
  - Build `(app)/layout.tsx`: sidebar (nav to Dashboard / Tasks / Categories, dark-mode toggle, user + logout in footer) and topbar.
  - Add shadcn primitives needed: button, input, dialog, dropdown-menu, checkbox, select, badge, skeleton.
  - Build empty-state and loading-skeleton components.
- Done when: navigating between the three pages shows a consistent, calm Notion-like shell in both themes.

### Phase 4 — Tasks CRUD
- Goal: full task lifecycle, user-scoped.
- Steps:
  - Read query in `src/lib/data/tasks.ts` (scoped by `userId`).
  - Server actions in `src/lib/actions/tasks.ts`: create, update, toggle status, delete — each validates with Zod and scopes by session `userId`.
  - Task list + task row components; create/edit via a dialog form.
  - Toggle complete with optimistic UI; `revalidatePath` after mutations.
- Done when: a user can add, edit, complete/uncomplete, and delete tasks; a second user never sees the first user's tasks.

### Phase 5 — Categories
- Goal: manage categories and assign them to tasks.
- Steps:
  - Read + actions for categories (user-scoped, unique name per user).
  - Categories page: list, create, rename, delete (deleting unsets it on tasks).
  - Category selector in the task form; category chip on task rows.
- Done when: categories CRUD works and tasks display their chip.

### Phase 6 — Filter & search
- Goal: find tasks fast.
- Steps:
  - Status filter (all / active / completed), category filter, and title search.
  - Drive filters through URL search params (shareable, server-rendered). Debounce the search input on the client.
  - Apply filters in the server read query, not in the browser.
- Done when: changing filters updates the list correctly and survives refresh.

### Phase 7 — Dashboard
- Goal: at-a-glance progress.
- Steps:
  - Aggregate counts (total, completed, pending, completion rate) with Prisma `count`, scoped by user.
  - Stat cards + a simple breakdown by category. Keep it minimal and on-brand.
- Done when: numbers match the data and update after task changes.

### Phase 8 — Polish & hardening
- Goal: production feel.
- Steps:
  - Loading skeletons, empty states, and error boundaries on every page.
  - Confirm dialogs for destructive actions.
  - Toasts for action feedback.
  - Mobile responsive: sidebar collapses to a sheet.
  - Accessibility: labels, focus states, keyboard nav on dialogs.
  - Final security pass against section 6.
- Done when: the app feels finished and the Definition of Done checklist passes.

### Phase 9 — Deploy (optional, later)
- Goal: live URL. The project is fully usable locally without this phase; do it only when explicitly asked.
- Steps:
  - Create a Neon Postgres database; this is the only change from local (swap `DATABASE_URL`).
  - Push to GitHub. Import to Vercel. Set env vars (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`).
  - Run `prisma migrate deploy` against the prod Neon DB.
  - Smoke-test signup/login/CRUD on the deployed URL.
- Done when: a fresh user can sign up and use the app on the production URL.

---

## 8. Definition of Done (checklist)

- [ ] No TypeScript or ESLint errors; build passes.
- [ ] All inputs validated server-side with Zod.
- [ ] Every query and mutation scoped to the session user; verified with two accounts.
- [ ] Passwords hashed (bcrypt 12); no plaintext or hashes ever logged/returned.
- [ ] Protected routes redirect unauthenticated users.
- [ ] No secrets in the repo; `.env.example` present.
- [ ] Generic auth + error messages; no stack traces leaked.
- [ ] Loading, empty, and error states on every page.
- [ ] Responsive and keyboard-accessible.
- [ ] Light + dark mode both correct.
- [ ] `docker compose up -d` + `pnpm dev` boots cleanly; app reachable at http://localhost:3000.
- [ ] Full flow smoke-tested locally: signup, login, create/edit/complete/delete task, category, filter, dashboard, logout.

---

## 9. Local Run & Verification

This project is local-first. The end deliverable is a working app on `http://localhost:3000`.

> Note on Postgres: you do NOT install PostgreSQL separately. It runs inside Docker
> (see 9.1). Installing Docker is enough. A manual Postgres install is only an
> optional fallback (9.0.3) for people who cannot run Docker.

### 9.0 Install prerequisites (only if missing)

Check what you already have:
```bash
docker --version      # need Docker
node --version        # need v20 or higher
pnpm --version        # need pnpm
```
Install only the ones that fail. (macOS)

#### 9.0.1 Homebrew (package manager)
Skip if `brew --version` already works.
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
After install, follow the on-screen lines to add brew to your PATH (Apple Silicon adds
`/opt/homebrew/bin` to `~/.zprofile`). Then run `brew --version` to confirm.

#### 9.0.2 Docker, Node, pnpm
```bash
# Docker Desktop (includes Docker engine + Compose)
brew install --cask docker
# Then OPEN the Docker Desktop app once and wait until the whale icon shows "running".
# The `docker` command only works while Docker Desktop is open.

# Node.js 20+ (LTS)
brew install node

# pnpm
brew install pnpm
# (alternative, no brew):  corepack enable && corepack prepare pnpm@latest --activate
```
Close and reopen the terminal, then re-run the three `--version` checks. All three
must succeed before continuing.

#### 9.0.3 Optional fallback — no Docker (manual Postgres)
Only if Docker cannot be used. Skip 9.1 and instead:
```bash
brew install postgresql@16
brew services start postgresql@16
createdb taskflow
# Then set DATABASE_URL in .env to your mac username, e.g.:
# DATABASE_URL="postgresql://<your-mac-username>@localhost:5432/taskflow?schema=public"
```
The Docker route (9.1) is strongly preferred — it needs no Postgres config.

### 9.1 Create `docker-compose.yml` (project root)
```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: taskflow_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: taskflow
      POSTGRES_PASSWORD: taskflow
      POSTGRES_DB: taskflow
    ports:
      - "5432:5432"
    volumes:
      - taskflow_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskflow -d taskflow"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  taskflow_data:
```

### 9.2 Create `.env.example` (and copy to `.env`)
```bash
# Local Postgres (Docker — matches docker-compose.yml)
DATABASE_URL="postgresql://taskflow:taskflow@localhost:5432/taskflow?schema=public"

# Auth.js (NextAuth v5)
# Generate a strong secret: openssl rand -base64 32
AUTH_SECRET="replace-with-a-strong-random-secret"
AUTH_URL="http://localhost:3000"
```

Add `.env` to `.gitignore` (commit only `.env.example`).

### 9.3 Run
```bash
# 1. Start the database (Postgres in Docker)
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Set up env (first time only)
cp .env.example .env        # DATABASE_URL already points to the local Docker DB

# 4. Apply schema + seed demo data
pnpm prisma migrate dev
pnpm prisma db seed

# 5. Run the app
pnpm dev                    # -> http://localhost:3000
```

Demo login (from the seed): `demo@taskflow.local` / `password123`.

Useful:
- `pnpm prisma studio` — inspect the DB in a browser.
- `docker compose down` — stop the DB (data persists in the volume).
- `docker compose down -v` — stop and wipe the DB (fresh start).

Verify before declaring done: open `http://localhost:3000`, sign up a new user, create a category and a task, complete it, filter, check the dashboard counts, log out. Confirm a second user cannot see the first user's data.

---