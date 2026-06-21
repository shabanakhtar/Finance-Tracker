# Backend Deployment

This backend is a FastAPI service designed to run on Render and connect to Supabase.

## Render setup

Create a new Render Web Service from the GitHub repo.

Use these settings if you set it up manually:

```text
Language: Python
Build command: pip install -r requirements.txt
Start command: uvicorn api:app --host 0.0.0.0 --port $PORT
Health check path: /health
```

The repo also includes `render.yaml`, so Render can create the service as a blueprint.

## Environment variables

Set these in Render:

```text
DATA_SOURCE=supabase
ALLOW_DEMO_USER=false
CORS_ORIGINS=https://your-frontend-domain.com,http://localhost:8081
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

For production builds, set it to your Render URL:

```text
EXPO_PUBLIC_API_URL=https://your-render-service.onrender.com
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

After Render deploys:

```text
https://your-render-service.onrender.com/health
```

Expected:

```json
{"status":"ok","data_source":"supabase"}
```

Authenticated app requests should include:

```text
Authorization: Bearer <supabase_access_token>
```
