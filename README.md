# Calm Garden - DV Support App MVP

A secure, privacy-focused application for journaling, breathing exercises, and emotional support.

## Features

- **Secure Journaling**: AES-GCM encrypted journal entries stored in PostgreSQL
- **Quick Exit**: Press Esc or ⌘+. to quickly switch to a neutral page
- **Breath Garden**: Calming breathing exercise with animated visualization
- **Safety First**: All features designed with privacy and safety in mind

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: FastAPI with SQLAlchemy
- **Database**: PostgreSQL with pgvector/pgcrypto extensions
- **Encryption**: AES-GCM for journal data at rest

## Quick Start

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

6. **Start development servers**
   ```bash
   pnpm dev
   ```

### Access the Application

- **Web App**: http://localhost:3000
- **API Health**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs

## Usage

1. **Journaling**: Click "New Journal" to create encrypted journal entries
2. **Breathing**: Use the Breath Garden for guided breathing exercises
3. **Quick Exit**: Press Esc or ⌘+. to quickly switch away
4. **Safety**: All data is encrypted and stored securely

## API Endpoints

- `GET /health` - Health check
- `GET /journals/` - List user's journals
- `POST /journals/` - Create a new journal entry

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
