# Calm Garden - DV Support App MVP

A secure, privacy-focused application for journaling, insights, and emotional support with a discrete game overlay.

## Features

- **Secure Journaling**: AES-GCM encrypted journal entries stored in PostgreSQL
- **Game-first UI**: A full-screen 2D tile game runs in the background; app UIs are overlays
- **Hamburger Menu Tabs**: Journaling, Risk Score, and Login/Security in a slide-out menu
- **Quick Hide & PIN**: Esc hides overlays; press Esc again to prompt for PIN; ⌘+. quick-exits
- **Duress PIN**: Optional duress PIN switches to a harmless demo space
- **Onboarding**: Guided signup overlay collects optional profile and PIN securely
- **Safety First**: All features designed with privacy and safety in mind

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: FastAPI with SQLAlchemy
- **Database**: PostgreSQL with pgvector/pgcrypto extensions
- **Encryption**: AES-GCM for journal data at rest

## Quick Start (Cross‑platform)

### Prerequisites

- Docker
- Node.js 20+
- Python 3.11+
- pnpm (`npm i -g pnpm`)

### Setup

1. **Clone and navigate to the project**
   ```bash
   cd "path/to/your/project"
   ```

2. **Start the database**
   ```bash
   docker compose up -d
   ```

3. **Set up the API**
   ```bash
   cd apps/api
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Set up the web app**
   ```bash
   cd ../../
   pnpm install
   ```

5. **Create environment file**
   ```bash
   cp env.example .env
   ```

6. **Start development servers (Windows users can use `pnpm dev`; macOS users see the section below for per-terminal commands)**
   ```bash
   pnpm dev
   ```

### Access the Application

- **Web App**: http://localhost:3000
- **API Health**: http://127.0.0.1:8000/health
- **API Docs**: http://127.0.0.1:8000/docs

## macOS Setup

The monorepo’s dev script uses a Windows PowerShell helper for the API. On macOS, run API and Web in separate terminals.

### 1) Install prerequisites

```bash
# Install Homebrew if needed (https://brew.sh)
# Install Docker Desktop for Mac (https://www.docker.com/products/docker-desktop/)

brew install node@20 pnpm python@3.11
brew link --overwrite node@20

# Optional: use corepack instead of global pnpm
corepack enable
```

### 2) Start Postgres

```bash
cd /path/to/your/project
docker compose up -d
```

### 3) Configure environment

Create a `.env` file (at the repo root and also copy it into `apps/api` if you run the API from that folder):

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
DB_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5433/dvapp
APP_ENC_KEY=dev-change-me-32-bytes-min
```

### 4) Run API (Terminal A)

```bash
cd apps/api
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 5) Run Web (Terminal B)

```bash
cd /path/to/your/project
pnpm install

# Clear Next cache if switching ports or envs
rm -rf apps/web/.next

cd apps/web
pnpm dev
```

Open the app at `http://127.0.0.1:3000`. The web app talks to the API at `http://127.0.0.1:8000` (set via `.env`).

### Keyboard & Controls

- Ctrl+J: open Journaling tab (when game is active)
- Ctrl+O: toggle back to Game
- Esc: hide overlays; Esc again → PIN prompt; ⌘+. quick-exit to a neutral site

### Troubleshooting (macOS)

- Port busy: `lsof -i :8000` then `kill -9 <PID>`
- Database not reachable: ensure Docker Desktop is running; `docker ps` should show `dvapp-db`
- Journals visible while logged out: clear browser cookies; API now returns 0 journals for unauthenticated sessions
- CORS/cookies: prefer `127.0.0.1` for both web and API to keep hosts aligned

## Usage

1. **Journaling**: Click "New Journal" to create encrypted journal entries
2. **Game Overlay**: Use the full-screen 2D game as a discrete cover; open the menu to access features
3. **Quick Hide/Exit**: Esc to hide; Esc again for PIN; ⌘+. for boss-screen
4. **Safety**: All data is encrypted and stored securely

## API Endpoints

- `GET /health` - Health check
- `GET /journals/` - List user's journals
- `POST /journals/` - Create a new journal entry

## Data Collection via Chat Context

In Chat → Show Context, you can capture structured fields that feed analytics and Salesforce Data Cloud:
- Jurisdiction, Children Present, Confidentiality, Share With
- Location Type (home, work, public, online, unknown)
- Recent Escalation (yes, no, unsure)
- Substance Use (yes, no, unsure)
- Threats to Kill (yes/no) and Access to Weapons (yes/no)

These are saved with each chat turn into `chat_events` (booleans on top-level columns where available, additional items in `extra_json`).

## Per-user Dataset Exports (JSON/CSV)

After logging in, you can download your datasets aligned to Salesforce Data Cloud schema:
- `GET /exports/dataset/chat_events.json` | `.csv`
- `GET /exports/dataset/risk_snapshots.json` | `.csv`
- `GET /exports/dataset/user_profiles.json` | `.csv`
- `GET /exports/dataset/journals_public.json` | `.csv`

Example (with cookies):
```bash
# Login to set session cookie
curl -i -c cookies.txt -b cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"jane.d001@example.com","password":"Passw0rd!001"}' \
  http://127.0.0.1:8000/auth/login

# Download per-dataset
curl -b cookies.txt http://127.0.0.1:8000/exports/dataset/chat_events.json | jq > chat_events.json
curl -b cookies.txt http://127.0.0.1:8000/exports/dataset/chat_events.csv  -o chat_events.csv
curl -b cookies.txt http://127.0.0.1:8000/exports/dataset/risk_snapshots.json | jq > risk_snapshots.json
curl -b cookies.txt http://127.0.0.1:8000/exports/dataset/user_profiles.json | jq > user_profiles.json
curl -b cookies.txt http://127.0.0.1:8000/exports/dataset/journals_public.json | jq > journals_public.json
```

## Manual Flat CSV for Tableau Testing

A one-row-per-user CSV with key profile, snapshot, and recent context fields is available via a script:

```bash
cd apps/api
source .venv/bin/activate
python scripts/export_all_users_csv.py
```

Output path:
- `apps/exports/tableau_manual/users_flat_<YYYY-MM-DD>.csv`

Columns:
- `user_id,email,created_at,age,gender,relationship_status,num_children,`
  `victim_housing,has_trusted_support,default_confidentiality,default_share_with,`
  `risk_score,risk_level,snapshot_at,journals_count,events_count,events_last7,avg_sentiment,avg_risk_points,`
  `recent_escalation,threats_to_kill,weapon_involved,substance_use`

## Development

### Project Structure

```
├── apps/
│   ├── api/                 # FastAPI backend
│   │   ├── app/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── models.py    # Database models
│   │   │   ├── schemas.py   # Pydantic schemas
│   │   │   └── crypto.py    # Encryption utilities
│   │   └── requirements.txt
│   └── web/                 # Next.js frontend
│       ├── src/
│       │   ├── app/         # App Router pages
│       │   ├── components/  # React components
│       │   └── lib/         # Utilities
│       └── package.json
├── infra/
│   └── db/
│       └── init.sql         # Database initialization
├── exports/                 # Data exports for analytics
└── docker-compose.yml       # Database setup
```

### Available Scripts

- `pnpm dev` - Start both frontend and backend
- `pnpm dev:web` - Start only frontend
- `pnpm dev:api` - Start only backend
- `pnpm db:up` - Start database
- `pnpm db:down` - Stop database

## Security Features

- **Encryption**: All journal data encrypted with AES-GCM
- **Quick Exit**: Immediate escape to neutral page
- **Privacy**: No hidden monitoring or tracking
- **Consent**: All features require explicit user consent

## Next Steps

This MVP includes:
- ✅ Basic journaling with encryption
- ✅ Quick exit functionality
- ✅ Breath Garden zen game
- ✅ Secure API with authentication stubs

Future enhancements (from TODO.md):
- 🔜 Proper authentication (passkeys/sessions)
- 🔜 RAG chatbot over consented journals
- 🔜 Risk assessment and insights
- 🔜 Scheduled exports for analytics
- 🔜 Enhanced safety features

## Contributing

Please read the TODO.md file for detailed development roadmap and contribution guidelines.

## License

This project is designed for supporting individuals in need. Please use responsibly and ethically.


## created users
Seeded credentials (emails → passwords)
jane.d001@example.com → Passw0rd!001
maya.p002@example.com → Passw0rd!002
alex.r003@example.com → Passw0rd!003
jordan.k004@example.com → Passw0rd!004
rosa.m005@example.com → Passw0rd!005
liam.t006@example.com → Passw0rd!006
priya.n007@example.com → Passw0rd!007
sam.w008@example.com → Passw0rd!008
aisha.l009@example.com → Passw0rd!009
diego.s010@example.com → Passw0rd!010
noor.c011@example.com → Passw0rd!011
ethan.v012@example.com → Passw0rd!012
grace.h013@example.com → Passw0rd!013
chen.y014@example.com → Passw0rd!014
omar.z015@example.com → Passw0rd!015
sofia.g016@example.com → Passw0rd!016
maria.j017@example.com → Passw0rd!017
natalie.b018@example.com → Passw0rd!018
tyrese.q019@example.com → Passw0rd!019
helena.f020@example.com → Passw0rd!020