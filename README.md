# TaskFlow

A clean, Notion-style personal task manager. Multi-user, secure, local-first.

- **Framework:** Next.js 15 (App Router, React Server Components, Server Actions)
- **Language:** TypeScript (strict)
- **Database:** PostgreSQL 16 (Docker) via Prisma
- **Auth:** Auth.js (NextAuth v5), Credentials + JWT sessions, bcrypt password hashing (cost 12)
- **UI:** Tailwind CSS v4 + shadcn-style components, light + dark mode

## Features

- Email + password signup / login / logout with protected routes
- Tasks: create, edit, complete/uncomplete, delete (user-scoped)
- Categories: user-defined labels with colors, assigned per task
- Filter by status and category, plus title search (URL-driven, server-rendered)
- Dashboard: total / completed / pending / completion rate and a by-category breakdown
- Strict data isolation: every query and mutation is scoped to the signed-in user

## Run locally

Prerequisites: Docker, Node 20+, and pnpm.

```bash
# 1. Start the database (Postgres in Docker)
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Set up env (first time only) — DATABASE_URL already points to the local Docker DB
cp .env.example .env
#    then set a strong AUTH_SECRET, e.g.:  openssl rand -base64 32

# 4. Apply schema + seed demo data
pnpm prisma migrate dev
pnpm prisma db seed

# 5. Run the app
pnpm dev    # -> http://localhost:3000
```

### Demo login

`demo@taskflow.local` / `password123`

## Useful commands

- `pnpm typecheck` — TypeScript check
- `pnpm lint` — ESLint
- `pnpm build` — production build
- `pnpm prisma studio` — inspect the database
- `docker compose down` — stop the database (data persists)
- `docker compose down -v` — stop and wipe the database

## Notes

- Passwords are hashed with bcrypt (cost 12) using the pure-JS `bcryptjs`, chosen over the
  native `bcrypt` binding to avoid native-build/bundling issues in the Next.js server runtime;
  the algorithm and cost factor are identical.
- Auth attempts are rate-limited with a minimal in-memory limiter (per email, 5/min). Swap in
  a shared store (e.g. Upstash) before running multiple instances in production.
