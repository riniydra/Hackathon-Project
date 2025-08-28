# TODO — DV Support App (Stealth + Insights + Tableau)

> Guardrails: No hidden monitoring. All “insights” are *opt-in* and revocable. Never auto-contact third parties.

## 0) Project Bootstrap
- [ ] Create monorepo: `apps/web` (Next.js, TS), `apps/api` (FastAPI), `infra` (IaC optional)
- [ ] Add `LICENSE`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- [ ] Add `CONTRIBUTING.md` with PR checks & commit style (Conventional Commits)
- [ ] Add CI: lint, typecheck, test, build for both apps

**Cursor prompt:**  
“Create a monorepo with `pnpm` workspaces: Next.js (App Router, TS) in `apps/web` and FastAPI in `apps/api`. Add ESLint/Prettier, pytest, black, isort. Add GitHub Actions for lint/test/build.”

---

## 1) Safety & UX Baseline
- [ ] Implement quick-exit: Esc/⌘+. → neutral page + clears screen state
- [ ] Neutral app name/icon; no DV wording in UI by default
- [ ] App lock: biometric/PIN; **duress PIN** → decoy space with harmless sample data
- [ ] Consent screens for: journaling analysis, mood check-ins, location, notifications
- [ ] “This is not therapy” banner, emergency resource footer (configurable)

**Cursor prompt:**  
“Build a `SafetyShell` React component with quick-exit (Esc/⌘+.) + ‘Boss Screen’ route, duress PIN modal, and consent banners. Provide accessibility (ARIA), high-contrast emergency controls.”

---

## 2) Secrets & Encryption
- [ ] `.env.example` with placeholders, **never commit .env**
- [ ] KMS key setup (local mock + prod notes)
- [ ] Envelope encryption: AES-256 content key wrapped by KMS
- [ ] Argon2id key derivation for optional end-to-end vault
- [ ] Add crypto utils (encrypt/decrypt buffers & strings)

**Cursor prompt:**  
“Implement crypto utils in FastAPI: Argon2id KDF, AES-GCM envelope encryption; integrate with a mock KMS interface and local key file for dev.”

---

## 3) Data Model (Postgres)
- [ ] Tables: `users`, `pii`, `journals`, `chat`, `game_sessions`, `risk_snapshots`, `reports`, `consents`, `trusted_contacts`
- [ ] `pgcrypto` for encrypted columns; `pgvector` for embeddings
- [ ] Row Level Security (RLS) on user-scoped tables
- [ ] Hash user_id for analytics export

**Cursor prompt:**  
“Generate SQL DDL (Postgres) for the above tables with pgcrypto columns (bytea) for PII/journal/chat text and pgvector for embeddings. Add RLS policies per user_id.”

---

## 4) AuthN/Z
- [ ] Email+password + WebAuthn (passkeys)
- [ ] Session tokens (httpOnly, sameSite=strict), CSRF protection
- [ ] Duress PIN path returns decoy tenant
- [ ] Consent flags persisted and enforced on endpoints

**Cursor prompt:**  
“Implement FastAPI auth routes: signup/login/logout, passkeys with `webauthn` libs, session cookies, CSRF. Add decoy user space for duress PIN.”

---

## 5) Journal Modal → KB
- [ ] Web: floating journal modal with quick prompts + voice-to-text
- [ ] Local redact (on-device NER) toggle; user chooses to redact names before upload
- [ ] API: create/read journals (encrypted at rest)
- [ ] Embeddings + pgvector index per user (only if consented)
- [ ] Export-my-data & delete-my-data endpoints

**Cursor prompt:**  
“Create `JournalModal.tsx` with offline-first support and a toggle to redact names client-side. Implement `/journals` endpoints with encryption and pgvector upsert when consented.”

---

## 6) Empathetic Chatbot (RAG)
- [ ] System prompt with empathetic style + safety guardrails
- [ ] Retrieval over user’s journals if consented; otherwise general grounding resources
- [ ] Chat history per user (encrypted)
- [ ] Clear disclaimer & crisis resource shortcuts

**Cursor prompt:**  
“Add `/chat` endpoint: streams responses, retrieves top-k journal chunks from pgvector only if `consents.journal_rag=true`. Store encrypted chat history. Provide a React chat UI.”

---

## 7) Calming Cover Game (Zen)
- [ ] Implement ‘Breath Garden’ mini-game (canvas): inhale/exhale grows plants
- [ ] Soft visuals, no timers, haptics off by default
- [ ] Telemetry (opt-in) saved to `game_sessions.telemetry_opt`
- [ ] One-tap ‘Hide & Exit’ back to boss screen

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
- [ ] Rule engine: easy to edit, transparent to the user
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
