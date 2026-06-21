# Supabase Setup

## 1. Create the Supabase project

Create a new project in Supabase, then open SQL Editor and run:

```sql
-- Paste the contents of supabase/migrations/20260619180000_initial_finance_schema.sql
-- Then paste the contents of supabase/migrations/20260621090000_add_budgets.sql
```

This creates `public.transactions` and `public.budgets`, enables Row Level Security, and adds user-scoped policies.

## 2. Configure local environment

Copy `.env.example` to `.env` if needed, then set:

```text
DATA_SOURCE=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FINANCE_DEMO_USER_ID=your_supabase_auth_user_id
ALLOW_DEMO_USER=true
CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
```

`SUPABASE_SERVICE_ROLE_KEY` must only live on the backend. Never put it in Expo or any public client.

Set `ALLOW_DEMO_USER=true` only for temporary local CSV import or backend-only tests. Keep it `false` for normal app usage so requests require a real Supabase Auth token.

## 3. Create a temporary demo user

Until mobile auth is wired, create one Supabase Auth user in the Supabase dashboard and copy its user ID into `FINANCE_DEMO_USER_ID`.

## 4. Import existing CSV transactions

After setting the env values:

```powershell
.\venv\Scripts\python.exe .\scripts\import_csv_to_supabase.py
```

## 5. Run the backend

```powershell
.\venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8000
```

Check:

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/dashboard
```

## Production notes

- Keep `DATA_SOURCE=supabase` in production.
- Use Supabase Auth in the mobile app and send the user's access token to FastAPI as `Authorization: Bearer <token>`.
- Keep RLS enabled. The service role key is for the backend only.
- Deploy FastAPI to Render, then set `EXPO_PUBLIC_API_URL` to that production URL before building the app.
- Set `CORS_ORIGINS` to your deployed web domains. Expo Go/native mobile requests do not rely on browser CORS, but the web build does.
- See `docs/backend-deployment.md` for Render settings.
