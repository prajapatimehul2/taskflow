# TaskFlow — AWS EC2 Deployment Plan

A phase-by-phase plan to deploy TaskFlow (Next.js 15 + Prisma + Postgres) onto a **single
AWS EC2 instance**, with the database running **on the same instance** (Dockerized Postgres),
HTTPS via Caddy, and the app supervised by pm2. Follow the phases top to bottom; each has a
goal, steps, and a "done when" gate. Do not start a phase until the previous one's gate passes.

---

## 0. Decisions (locked)

| Area | Choice | Notes |
|---|---|---|
| Host | One EC2 instance | All-in-one: app + database + proxy on one box |
| Database | PostgreSQL 16 in Docker, **same EC2** | No RDS; reuse repo `docker-compose.yml` |
| App runtime | Node 20+, run `next start` via pm2 | No container for the app (plain process) |
| TLS / proxy | Caddy (automatic Let's Encrypt) | Needs a domain name |
| Secrets | `.env` file on the box (chmod 600) | Optional upgrade: AWS SSM Parameter Store |
| Scaling | Single instance only | In-memory rate limiter is per-process by design |
| Backups | `pg_dump` cron + EBS snapshots | Replaces RDS's managed backups |

**Target architecture**
```
Internet
  │  :443 / :80
  ▼
Caddy (TLS termination, auto HTTPS)        ── same EC2 ──┐
  │  reverse_proxy 127.0.0.1:3000                        │
  ▼                                                      │
Next.js (pnpm start, 127.0.0.1:3000, pm2)                │
  │  DATABASE_URL → 127.0.0.1:5432                        │
  ▼                                                      │
Postgres 16 (Docker, 127.0.0.1:5432, named volume)  ─────┘
```

---

## 1. Prerequisites (before touching AWS)

- An **AWS account** with permission to create EC2, security groups, and Elastic IPs.
- A **domain name** you control (e.g. `taskflow.example.com`) with access to its DNS.
- The TaskFlow repo in a **git remote** you can `git clone` from the server (GitHub/CodeCommit).
- Locally: confirm the app builds clean — `pnpm typecheck && pnpm lint && pnpm build`.

**Done when:** you have AWS access, a domain, and a green local build.

---

## Phase 0 — Pre-flight: make the code deploy-ready

- Goal: the repo carries everything the server needs; no prod values are committed.
- Steps:
  - Confirm `.env` is git-ignored and `.env.example` is committed (already true).
  - Confirm `pnpm-workspace.yaml` with `allowBuilds` is committed (so `pnpm install` on the
    server builds Prisma/esbuild without an interactive prompt).
  - Decide the production env values (do **not** commit them):
    - `DATABASE_URL` → `postgresql://taskflow:<STRONG_DB_PASSWORD>@localhost:5432/taskflow?schema=public`
    - `AUTH_SECRET` → a fresh `openssl rand -base64 32` (never reuse the local one)
    - `AUTH_URL` → `https://taskflow.example.com` (your real domain)
    - `NODE_ENV` → `production`
  - Note the two prod tweaks to `docker-compose.yml` you'll apply on the server (Phase 4):
    strong `POSTGRES_PASSWORD` and bind the port to `127.0.0.1:5432:5432`.
- Done when: you have a written list of prod env values and know the two compose edits.

---

## Phase 1 — AWS networking & access

- Goal: a reachable, locked-down place to run the instance.
- Steps:
  - Create (or pick) an **EC2 key pair** for SSH.
  - Create a **security group** `taskflow-sg`:
    - Inbound `22/tcp` from **your IP only**.
    - Inbound `80/tcp` and `443/tcp` from `0.0.0.0/0`.
    - **No** rule for `3000` or `5432` (they stay loopback-only).
    - Outbound: allow all (default).
  - Allocate an **Elastic IP** (you'll associate it in Phase 2 so the address is stable).
- Done when: security group and Elastic IP exist; key pair downloaded.

---

## Phase 2 — Launch the instance

- Goal: a running Linux box with enough memory to build.
- Steps:
  - Launch EC2: **Amazon Linux 2023**, **t3.small (2 GB) minimum** (t3.medium is comfortable),
    20–30 GB gp3 root volume, `taskflow-sg`, your key pair.
  - Associate the Elastic IP.
  - SSH in and add a **2 GB swapfile** (prevents `next build` OOM on a 2 GB box):
    ```bash
    sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
    sudo mkswap /swapfile && sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    ```
  - Update the OS: `sudo dnf update -y`.
- Done when: you can SSH in, `free -h` shows swap active, and the EIP is attached.

---

## Phase 3 — Base software

- Goal: Node, pnpm, Docker, pm2, git, Caddy installed.
- Steps:
  ```bash
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo dnf install -y nodejs git docker
  sudo systemctl enable --now docker
  sudo usermod -aG docker $USER        # then log out/in for group to take effect
  sudo npm i -g pnpm pm2
  # Caddy:
  sudo dnf install -y 'dnf-command(copr)'
  sudo dnf copr enable -y @caddy/caddy
  sudo dnf install -y caddy
  ```
- Done when: `node -v` (>=20), `pnpm -v`, `docker ps`, `pm2 -v`, `caddy version` all succeed.

---

## Phase 4 — Database on the instance

- Goal: a hardened Postgres running locally, reachable only over loopback.
- Steps:
  - Clone the repo: `git clone <your-repo> ~/taskflow && cd ~/taskflow`.
  - Edit `docker-compose.yml` on the server:
    - Set `POSTGRES_PASSWORD` to your strong password.
    - Change the port mapping to `"127.0.0.1:5432:5432"`.
  - Start it: `docker compose up -d`.
  - Verify health: `docker compose ps` shows `healthy`.
- Done when: `docker exec taskflow_db pg_isready -U taskflow` returns ok, and `5432` is **not**
  reachable from outside (`nc -vz <eip> 5432` from your laptop should fail/timeout).

---

## Phase 5 — Configure and build the app

- Goal: dependencies installed, schema migrated, production build created — on the server.
- Steps:
  ```bash
  cd ~/taskflow
  cp .env.example .env
  # edit .env with the Phase 0 production values (chmod 600 .env)
  pnpm install --frozen-lockfile
  pnpm prisma migrate deploy        # applies migrations non-interactively
  # pnpm prisma db seed             # OPTIONAL: only if you want the demo user
  pnpm build
  ```
- Notes:
  - Build **on the server** so Prisma generates the Linux query engine (don't copy
    `node_modules` from macOS).
  - Use `migrate deploy`, never `migrate dev`, in production.
- Done when: `pnpm build` completes with no errors and `.next/` exists.

---

## Phase 6 — Run the app under a supervisor

- Goal: the app runs persistently, bound to localhost, and restarts on reboot.
- Steps:
  ```bash
  pm2 start "pnpm start -- -H 127.0.0.1" --name taskflow
  pm2 save
  pm2 startup        # run the printed command to enable boot start
  ```
  - `-H 127.0.0.1` keeps port 3000 off the public interface (Caddy reaches it locally).
- Done when: `curl -I http://127.0.0.1:3000/login` returns `200` and `pm2 status` shows
  `online`.

---

## Phase 7 — DNS + HTTPS (Caddy)

- Goal: the app is served on your domain over TLS.
- Steps:
  - Create a DNS **A record**: `taskflow.example.com → <Elastic IP>`. Wait for it to resolve.
  - Write `/etc/caddy/Caddyfile`:
    ```
    taskflow.example.com {
        reverse_proxy 127.0.0.1:3000
    }
    ```
  - `sudo systemctl enable --now caddy` (Caddy fetches a Let's Encrypt cert automatically).
- Done when: `https://taskflow.example.com/login` loads with a valid certificate, and you can
  **sign up, log in, create a task, and log out** end to end.

---

## Phase 8 — Security hardening

- Goal: reduce attack surface to the minimum.
- Steps:
  - Re-check the security group: only `22` (your IP), `80`, `443` inbound.
  - `chmod 600 ~/taskflow/.env`; confirm it is not in git.
  - Confirm `AUTH_SECRET` is unique to prod and `AUTH_URL` is the `https://` domain (required
    so Auth.js issues secure cookies — over plain HTTP login will not persist).
  - Enable automatic security updates (`dnf-automatic`) or schedule periodic `dnf update`.
  - (Optional) Move secrets from `.env` to **AWS SSM Parameter Store** and load at boot.
  - (Optional) Restrict SSH further with EC2 Instance Connect or SSM Session Manager (no open
    `22` at all).
- Done when: no unnecessary ports are open, `.env` is locked down, HTTPS-only confirmed.

---

## Phase 9 — Backups & disaster recovery

- Goal: the database can be restored if the instance is lost (this replaces RDS backups).
- Steps:
  - **Nightly logical dump** — create `/etc/cron.daily/taskflow-backup` (chmod +x):
    ```bash
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p /var/backups/taskflow
    docker exec taskflow_db pg_dump -U taskflow taskflow | gzip \
      > /var/backups/taskflow/taskflow-$(date +%F).sql.gz
    find /var/backups/taskflow -name '*.sql.gz' -mtime +14 -delete
    # optional: aws s3 cp the dump to a bucket for off-box safety
    ```
  - **EBS snapshots** — schedule the data volume via AWS Data Lifecycle Manager (daily, retain
    N days). This captures the Docker `taskflow_data` volume on disk.
  - **Test a restore once** (on a throwaway DB or a fresh box):
    ```bash
    gunzip -c taskflow-YYYY-MM-DD.sql.gz | docker exec -i taskflow_db psql -U taskflow taskflow
    ```
- Done when: a dump file exists, the snapshot policy is active, and a restore has been verified.

---

## Phase 10 — Monitoring & maintenance

- Goal: you can see health and logs, and catch failures.
- Steps:
  - App logs: `pm2 logs taskflow`; resource view: `pm2 monit`.
  - Proxy/DB logs: `journalctl -u caddy`, `docker compose logs db`.
  - (Optional) Install the **CloudWatch agent** for CPU/memory/disk metrics and alarms, or a
    lightweight uptime check (e.g. an external monitor hitting `https://.../login`).
  - Watch disk: Postgres data + backups grow over time (`df -h`).
- Done when: you can pull logs for app, proxy, and DB, and you have at least an uptime check.

---

## Phase 11 — Redeploy / update workflow

- Goal: a repeatable way to ship new code without downtime surprises.
- Steps (run on the server after pushing to your repo):
  ```bash
  cd ~/taskflow
  git pull
  pnpm install --frozen-lockfile
  pnpm prisma migrate deploy     # only applies new migrations
  pnpm build
  pm2 reload taskflow            # zero-ish-downtime restart
  ```
- Notes:
  - Migrations run **before** restarting the app so the new code meets the new schema.
  - For risky migrations, take a `pg_dump` first (Phase 9 script) so you can roll back data.
- Done when: a code change can be shipped with the steps above and the site stays healthy.

---

## Definition of Done (deployment)

- [ ] `https://your-domain` loads with a valid TLS certificate.
- [ ] Full flow works in prod: signup, login, create/edit/complete/delete task, category,
      filter, dashboard, logout.
- [ ] `AUTH_URL` is the https domain and `AUTH_SECRET` is unique to production.
- [ ] Postgres is reachable only on `127.0.0.1` (not from the internet); strong DB password set.
- [ ] Security group exposes only `22` (your IP), `80`, `443`.
- [ ] `.env` is chmod 600 and not committed.
- [ ] App and Postgres both auto-start on reboot (pm2 startup + Docker restart policy).
- [ ] Nightly `pg_dump` runs and an EBS snapshot policy is active; a restore was tested.
- [ ] Logs reachable for app, proxy, and DB; an uptime check exists.

---

## Rollback

- **Bad deploy:** `git checkout <previous-commit> && pnpm install && pnpm build && pm2 reload taskflow`.
- **Bad migration / data loss:** restore the latest `pg_dump` (Phase 9) or roll the EBS volume
  back to the most recent snapshot.
- **Instance lost entirely:** launch a fresh instance (Phases 2–7), restore the latest dump in
  Phase 5 before `pnpm build`.

---

## Appendix A — Production environment reference (`.env` on the server)

```bash
DATABASE_URL="postgresql://taskflow:<STRONG_DB_PASSWORD>@localhost:5432/taskflow?schema=public"
AUTH_SECRET="<openssl rand -base64 32 output>"
AUTH_URL="https://taskflow.example.com"
NODE_ENV="production"
```

## Appendix B — One-shot deploy helper (optional `deploy.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
git pull
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm build
pm2 reload taskflow
echo "Deployed at $(date)"
```

## Appendix C — Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Login never "sticks" | Serving over HTTP, or `AUTH_URL` not the https domain | Finish Phase 7; set `AUTH_URL=https://…` |
| `next build` killed | Out of memory on 2 GB box | Add the swapfile (Phase 2) or use t3.medium |
| Prisma engine error at runtime | `node_modules` built on a different OS | Run `pnpm install` + `pnpm build` on the server |
| `pnpm install` stops on build scripts | `allowBuilds` not present | Ensure `pnpm-workspace.yaml` is committed |
| Cert not issued | DNS not resolving to the EIP yet | Wait for DNS; check `journalctl -u caddy` |
| DB reachable from internet | Port mapped to `0.0.0.0` | Use `127.0.0.1:5432:5432` and close SG |

## Appendix D — Rough monthly cost (us-east-1, indicative)

- t3.small on-demand: ~$15/mo (or ~$5–7 reserved/savings plan); t3.medium ~$30/mo.
- 30 GB gp3: ~$2.4/mo. Elastic IP: free while attached. Data transfer: low for this app.
- Off-box backup S3: cents/mo. **No RDS cost** by design.

> Note: a single instance means the app is offline during reboots/maintenance and has no
> automatic failover. That is an accepted trade-off for this setup. If uptime needs grow,
> the migration path is: move Postgres to RDS, put the app behind an ALB, and run 2+
> instances (at which point replace the in-memory rate limiter with a shared store).
