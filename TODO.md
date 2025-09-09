# TODO — DV Support App (Stealth + Insights + Tableau)

> Guardrails: No hidden monitoring. All “insights” are *opt-in* and revocable. Never auto-contact third parties.

This document is the single source of truth for the roadmap. It is organized from foundations → features → Salesforce‑native data path → quality, security, and operations. Tasks use pragmatic checkboxes so new contributors can pick up work safely.

## 0) Project Bootstrap
- [x] Create monorepo: `apps/web` (Next.js, TS), `apps/api` (FastAPI), `infra` (IaC optional)
- [ ] Add `LICENSE`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- [ ] Add `CONTRIBUTING.md` with PR checks & commit style (Conventional Commits)
- [ ] Add CI: lint, typecheck, test, build for both apps
- [ ] Pre-commit hooks (frontend: eslint --fix, prettier; backend: black, isort, ruff)
- [ ] GitHub branch protections; required checks

**Cursor prompt:**  
“Create a monorepo with `pnpm` workspaces: Next.js (App Router, TS) in `apps/web` and FastAPI in `apps/api`. Add ESLint/Prettier, pytest, black, isort. Add GitHub Actions for lint/test/build.”

---

## 1) Safety & UX Baseline
- [x] Implement quick-exit: Esc/⌘+. → neutral page + clears screen state
- [ ] Neutral app name/icon; no DV wording in UI by default
- [x] App lock: PIN; **duress PIN** → decoy space with harmless sample data
- [ ] Consent screens for: journaling analysis, mood check-ins, location, notifications
- [ ] “This is not therapy” banner, emergency resource footer (configurable)
- [x] Hide overlays on Esc; Esc again → PIN prompt
- [x] Shortcut gating so typing in inputs never triggers actions (Ctrl/Cmd+J,O; WASD gated)

**Cursor prompt:**  
“Build a `SafetyShell` React component with quick-exit (Esc/⌘+.) + ‘Boss Screen’ route, duress PIN modal, and consent banners. Provide accessibility (ARIA), high-contrast emergency controls.”

---

## 2) Secrets & Encryption
- [x] `.env.example` with placeholders, **never commit .env**
- [ ] KMS key setup (local mock + prod notes)
- [ ] Envelope encryption: AES-256 content key wrapped by KMS
- [ ] Argon2id key derivation for optional end-to-end vault
- [x] Add crypto utils (AES-GCM encrypt/decrypt strings)
- [ ] Secrets management guidance (1Password/Vault/SSM); local vs prod parity

**Cursor prompt:**  
“Implement crypto utils in FastAPI: Argon2id KDF, AES-GCM envelope encryption; integrate with a mock KMS interface and local key file for dev.”

---

## 3) Data Model (Postgres)
- [ ] Tables: `users`, `pii`, `journals`, `chat`, `game_sessions`, `risk_snapshots`, `reports`, `consents`, `trusted_contacts`
- [ ] `pgcrypto` for encrypted columns; `pgvector` for embeddings
- [ ] Row Level Security (RLS) on user-scoped tables
- [ ] Hash user_id for analytics export
- [ ] Alembic migrations; block startup `create_all` in prod

**Cursor prompt:**  
“Generate SQL DDL (Postgres) for the above tables with pgcrypto columns (bytea) for PII/journal/chat text and pgvector for embeddings. Add RLS policies per user_id.”

---

## 4) AuthN/Z
- [x] Email+password (basic)
- [ ] WebAuthn (passkeys)
- [x] Session cookie (httpOnly) and CORS set for local dev
- [ ] CSRF protection
- [x] Duress PIN path returns decoy tenant (demo space)
- [ ] Consent flags persisted and enforced on endpoints
- [ ] Rate limiting (per-IP and per-account) on auth and PIN
- [ ] Brute-force lockout/backoff for PIN and login
- [ ] Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)

**Cursor prompt:**  
“Implement FastAPI auth routes: signup/login/logout, passkeys with `webauthn` libs, session cookies, CSRF. Add decoy user space for duress PIN.”

---

## 5) Journal Modal → KB
- [x] Web: floating journal modal with title/mood/tags
- [ ] Voice-to-text (optional)
- [ ] Local redact (on-device NER) toggle; user chooses to redact names before upload
- [x] API: create/read journals (encrypted at rest)
- [ ] Embeddings + pgvector index per user (only if consented)
- [x] Export-my-data endpoint (CSV)
- [ ] Delete-my-data endpoint
- [x] Do not expose journals to unauthenticated sessions (server enforced)

**Cursor prompt:**  
“Create `JournalModal.tsx` with offline-first support and a toggle to redact names client-side. Implement `/journals` endpoints with encryption and pgvector upsert when consented.”

---

## 6) Empathetic Chatbot (RAG)
- [ ] System prompt with empathetic style + safety guardrails
- [ ] Retrieval over user’s journals if consented; otherwise general grounding resources
- [ ] Chat history per user (encrypted)
- [ ] Clear disclaimer & crisis resource shortcuts
- [ ] SSE `/chat/stream` endpoint; client streaming UI
- [ ] Safety pre-checks (crisis, self-harm lexicon + classifier)
- [ ] Optional on-device redaction before upload
- [ ] Tools: “grounding resources”, “breathing exercise”, “list coping steps”

**Cursor prompt:**  
“Add `/chat` endpoint: streams responses, retrieves top-k journal chunks from pgvector only if `consents.journal_rag=true`. Store encrypted chat history. Provide a React chat UI.”

---

## 7) Game-first Overlay (2D Tile Game)
- [x] Full-screen tile map background (canvas)
- [x] Player movement (WASD/arrow) gated to game-only focus
- [x] Hamburger menu with tabs: Journaling, Risk, Login/Security
- [x] Esc hide → Esc again PIN prompt; ⌘+. quick-exit
- [ ] Telemetry (opt-in) saved to `game_sessions` (future)
- [ ] Sprite set + collision map; gentle pathfinding for NPC
- [ ] Performance budget (RAF at 60fps; throttle in background tabs)

**Cursor prompt:**  
“Create `apps/web/components/games/BreathGarden.tsx` (pure TS/Canvas). Add opt-in telemetry save and integrate quick-exit.”

---

## 8) Check-ins & Transparent Insights
- [ ] Daily 3 sliders (mood, energy, safety) + optional free text
- [ ] Micro-screens (PHQ-2/GAD-2 styles) with attribution & explicit consent
- [ ] Risk score is explainable: show weights & recent reasons; resettable by user

**Cursor prompt:**  
“Create `/checkins` endpoints and a `CheckInCard.tsx`. Store results and compute `risk_snapshots` using a rule-based YAML (see below). Render an Insights page that explains the score.”

---

## 9) Risk Rules (YAML)
- [x] Rule engine: easy to edit, transparent to the user
- [ ] No auto-escalations; UI offers choices first

**Create `apps/api/risk_rules.yaml`:**
```yaml
weights:
  mood_drop_7d: 0.25
  safety_low: 0.35
  negative_language: 0.20
  missed_checkins: 0.10
  game_telemetry_stress: 0.10
thresholds:
  warn: 0.45
  high: 0.65
features:
  mood_drop_7d: "delta(mood, 7d) < -1.5"
  safety_low: "avg(safety, 3d) < 3"
  negative_language: "nlp.sentiment <= -0.5 or nlp.anger >= 0.6"
  missed_checkins: "miss_rate(7d) >= 0.5"
  game_telemetry_stress: "breath_irregularity >= 0.6"

---

## 10) Salesforce-Native Architecture (Agentforce + Data Cloud + Tableau Next)

- [ ] Align IDs: stable, hashed `user_id_hash` for exports/ingestion
- [ ] Data Cloud: configure org, connector app, and credentials (JWT/Client Credentials)
- [ ] Choose ingestion path:
  - [ ] Turn on Conversation Transcript streams (if using Salesforce chat), or
  - [ ] Implement Streaming Ingestion (REST) micro-batches for custom web chat and events
- [ ] Define curated objects/tables in Data Cloud:
  - [ ] `chat_turns_curated` (user_hash, ts, role, text_redacted, sentiment, abuse_tags)
  - [ ] `risk_snapshots` (user_hash, score, level, feature_scores)
  - [ ] `journals_public` (user_hash, ts, mood, tags, text_redacted)
- [ ] BYOC (Bring Your Own Code) Python jobs in Data Cloud:
  - [ ] Redact PII (names/addresses/phones) with deterministic masking
  - [ ] Classify abuse type / sentiment; produce tidy columns
  - [ ] Compute risk feature aggregates; write to curated tables
  - [ ] Schedules + manual trigger; error notifications
- [ ] Agentfront (Einstein/Agentforce):
  - [ ] Build chat UI (Slack/web/Console) with empathetic system prompt
  - [ ] Tools integrated with Platform/Flows (e.g., “create case”, “log incident”) – disabled by default for MVP
  - [ ] Grounding on Data Cloud objects
- [ ] Tableau Next:
  - [ ] Connect live to Data Cloud
  - [ ] Dashboards: Timeline, Incident Map, Risk Flags, Trends
  - [ ] Least-privilege sharing and row-level security on user_hash
- [ ] Compliance & data handling:
  - [ ] Document fields that never leave the app (unencrypted text)
  - [ ] Tokenize/Hash all identifiers before leaving app infra
  - [ ] Backfill/migration plan for existing data if schema evolves

---

## 11) API & Web Performance

- [ ] Enable gzip/br compression; cache headers for static assets
- [ ] Pydantic v2 strict schemas; validation on all inputs
- [ ] Connection pooling tuned for Postgres
- [ ] Avoid N+1 queries; add indexes for common filters
- [ ] Web: code-split overlays; minimize bundle size; prefetch only on user intent

---

## 12) Security Hardening

- [ ] OWASP ASVS checklist pass
- [ ] CSRF tokens for mutating routes
- [ ] Content Security Policy (no inline eval)
- [ ] Helmet-style headers in Next.js
- [ ] Audit logs for auth, PIN/duress events (no PII)
- [ ] Dependency scanning: `npm audit`, `pip-audit`, Dependabot
- [ ] Container/image scanning: Trivy
- [ ] Secrets scanning: GitHub secret scanning / gitleaks

---

## 13) Observability & Ops

- [ ] Structured logging with request correlation id
- [ ] Error tracking (Sentry or OpenTelemetry collector)
- [ ] Health/ready endpoints; startup probes
- [ ] Metrics (Prometheus/Otel): request latency, error rates, db timings
- [ ] Backup/restore docs for Postgres; retention policy

---

## 14) Testing Strategy

- [ ] Backend unit tests (pytest) for routes/auth/crypto/risk
- [ ] Frontend tests (React Testing Library) for critical components
- [ ] Integration tests (Playwright) for auth → journal flow → risk refresh
- [ ] Contract tests for API (schemathesis/Pydantic models)
- [ ] Security tests: bandit/ruff rules; basic fuzzing on text inputs

---

## 15) Deployment & CI/CD

- [ ] GitHub Actions: lint/typecheck/test/build for both apps
- [ ] Build and push API container; CD to staging
- [ ] Environment configurations (dev/staging/prod) checked in as code
- [ ] Rollback playbook and incident runbook

---

## 16) Documentation & Onboarding

- [ ] Update README with platform-specific setup (Windows/macOS/Linux) [macOS done]
- [ ] Architecture overview diagram (game overlay, API, Data Cloud)
- [ ] SECURITY.md with threat model and response plan
- [ ] Contributor guide with "Good First Issues" tagged from this list
