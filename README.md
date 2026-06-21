# AI Finance Tracker

A mobile-first finance tracker built with Expo, FastAPI, and Supabase. The app supports authenticated user accounts, per-user transactions, budgets, dashboard analytics, and AI-assisted finance insights.

## Features

- Email/password auth with Supabase
- Per-user transaction tracking
- Add, edit, and delete transactions
- Budget settings with progress tracking
- Income, expense, balance, and financial score summaries
- Monthly cash-flow and expense breakdown charts
- AI finance assistant powered by Gemini
- Supabase Postgres database with Row Level Security
- Vercel-ready FastAPI backend

## Tech Stack

- Expo / React Native
- FastAPI
- Supabase Auth and Postgres
- Gemini API
- Vercel for backend deployment

## Project Structure

```text
.
├── api/index.py                   # Vercel FastAPI entrypoint
├── backend.py                     # FastAPI app
├── analytics.py                   # Finance analytics and insights
├── data.py                        # Data access bridge
├── supabase_data.py               # Supabase REST data layer
├── vercel.json                    # Vercel backend config
├── requirements.txt               # Backend dependencies
├── docs/
│   ├── backend-deployment.md
│   └── supabase-setup.md
├── supabase/migrations/           # Database schema and RLS policies
└── finance-app/                   # Expo mobile app
```

## Local Backend

Create `.env` from `.env.example`, then set your backend secrets.

```powershell
python -m uvicorn backend:app --host 127.0.0.1 --port 8000
```

Check:

```text
http://127.0.0.1:8000/health
```

## Mobile App

Create `finance-app/.env.local` from `finance-app/.env.example`.

For local web testing:

```text
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

For Expo Go on a real phone, use your computer's LAN IP:

```text
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000
```

Start Expo:

```powershell
cd finance-app
npx expo start
```

## Deployment

Use Vercel for the FastAPI backend. Vercel settings and environment variables are documented in:

```text
docs/backend-deployment.md
```

Before deploying, run the Supabase migrations:

```text
supabase/migrations/20260619180000_initial_finance_schema.sql
supabase/migrations/20260621090000_add_budgets.sql
```

## Security Notes

- Never commit `.env` or `finance-app/.env.local`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` on the backend only.
- Keep `ALLOW_DEMO_USER=false` in production.
- Set `CORS_ORIGINS` to trusted deployed web origins.
