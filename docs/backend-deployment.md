# Backend Deployment

This backend is a FastAPI service designed to run on Vercel and connect to Supabase.

## Vercel setup

Create a new Vercel project from the GitHub repo.

Use these settings:

```text
Git Repository: shabanakhtar/Finance-Tracker
Project Name: finance-tracker-api
Framework Preset: Other
Root Directory: ./
Build Command: leave empty
Output Directory: leave empty
Install Command: leave empty
Development Command: leave empty
```

The repo includes `api/index.py` and `vercel.json` so Vercel routes all API paths to the FastAPI app.

## Environment variables

Set these in Vercel:

```text
DATA_SOURCE=supabase
ALLOW_DEMO_USER=false
CORS_ORIGINS=*
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_or_secret_key
```

`SUPABASE_SERVICE_ROLE_KEY` must only be stored on the backend. Never put it in Expo, Vercel public variables, or GitHub.

For Expo Go local testing, keep your local `finance-app/.env.local` pointed at your computer's LAN IP:

```text
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000
```

For production builds, set it to your Vercel URL:

```text
EXPO_PUBLIC_API_URL=https://your-vercel-project.vercel.app
```

## Supabase prerequisites

Before deploying, run the migrations in Supabase SQL Editor or via Supabase CLI:

```text
supabase/migrations/20260619180000_initial_finance_schema.sql
supabase/migrations/20260621090000_add_budgets.sql
```

Confirm these tables exist:

```text
public.transactions
public.budgets
```

Both tables must have Row Level Security enabled.

## Smoke test

After Vercel deploys:

```text
https://your-vercel-project.vercel.app/health
```

Expected:

```json
{"status":"ok","data_source":"supabase"}
```

Authenticated app requests should include:

```text
Authorization: Bearer <supabase_access_token>
```
