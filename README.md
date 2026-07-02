# Finance Tracker

Finance Tracker is a mobile-first personal finance app built with Expo React Native, FastAPI, Supabase, and Gemini AI. It helps users track income and spending, manage budgets, review dashboard insights, scan receipts, compare product alternatives, and ask AI-assisted finance questions based on their own data.

**Status:** Mobile app complete. Play Store release planned after final compliance setup, including privacy policy hosting, account/data deletion flow, Data Safety form, and final QA.

## Problem It Solves

Personal finance apps often make users choose between simple expense logging and deeper insight. Finance Tracker combines the core workflow of a budget tracker with AI support so users can understand what changed, where money is going, and what actions might improve their cash flow.

The app is designed around three practical questions:

- What did I earn and spend recently?
- Which categories or budgets need attention?
- What should I do next based on my own transaction history?

## Key Features

- Supabase email/password authentication
- Per-user transaction tracking
- Add, edit, and delete transactions
- Quick-add shortcuts for common entries
- Budget limits with progress tracking
- Dashboard summaries for income, spending, balance, and financial score
- Analysis tab with trends, category breakdowns, and insight cards
- CSV import and export for transaction history
- Offline transaction queue with later sync
- Receipt scanning with AI extraction
- Local market check for cheaper product alternatives
- Settings for theme, currency, shortcuts, imports, and exports
- Android EAS build profiles for internal APK testing and Play Store app bundles

## AI Assistant And Gemini-Powered Insights

Finance Tracker uses Gemini through the FastAPI backend, not directly from the mobile client. The assistant can answer questions about spending patterns, budgets, warnings, and recent transactions. The backend prepares a finance context from Supabase data before calling Gemini, which keeps API keys server-side and avoids exposing AI credentials inside the Expo app.

AI-supported features include:

- Finance question answering
- Budget and spending explanations
- Receipt data extraction
- Product alternative checks
- Daily AI usage limits per user

## Tech Stack

| Layer | Technology |
| --- | --- |
| Mobile app | Expo, React Native, Expo Router, React Native Paper |
| Backend | FastAPI, Python, Vercel serverless deployment |
| Database/Auth | Supabase Auth, Supabase Postgres |
| AI | Google Gemini via backend API |
| Builds | EAS Android preview APK and production AAB profiles |
| Monitoring | UptimeRobot-ready backend health endpoint |

## Architecture Overview

```text
Expo React Native app
  |
  | Supabase Auth session
  v
FastAPI backend on Vercel
  |
  | user-scoped queries and service role on server only
  v
Supabase Postgres
  |
  | summarized user finance context
  v
Gemini AI
```

Core files:

- `finance-app/` - Expo mobile app
- `backend.py` - FastAPI app and API routes
- `supabase_data.py` - Supabase REST data layer
- `ai.py` - Gemini AI integration
- `ai_usage.py` - AI usage limit tracking
- `supabase/migrations/` - database schema, RLS policies, and SQL helpers
- `api/index.py` and `vercel.json` - Vercel backend entrypoint and routing

## Security Model

- Supabase Auth is used for account identity.
- Mobile requests include the authenticated Supabase access token.
- The backend resolves the current user before loading or mutating finance data.
- Supabase tables use Row Level Security policies scoped to `auth.uid()`.
- The Supabase service-role key is used only by the backend and is not placed in Expo public variables.
- Gemini API calls happen on the backend so AI keys are not exposed in the mobile app.
- AI usage is limited per user per day for chat, receipt scanning, and product recommendations.

## Screenshots

Screenshots will be added before the LinkedIn launch.

| Screen | Preview |
| --- | --- |
| Login and onboarding | ![Login screen](docs/screenshots/login.png) |
| Dashboard | ![Dashboard screen](docs/screenshots/dashboard.png) |
| Add transaction | ![Add transaction screen](docs/screenshots/add-transaction.png) |
| Budgets | ![Budgets screen](docs/screenshots/budgets.png) |
| AI assistant | ![AI assistant screen](docs/screenshots/ai-assistant.png) |
| Settings | ![Settings screen](docs/screenshots/settings.png) |

Screenshot capture notes are in [docs/screenshot-guide.md](docs/screenshot-guide.md).

## Demo Video

Demo walkthrough coming soon.

The planned 60-90 second video flow is in [docs/demo-video-script.md](docs/demo-video-script.md).

## Local Setup

### Backend

Create `.env` from `.env.example`, then set the backend environment variables.

```powershell
python -m uvicorn backend:app --host 127.0.0.1 --port 8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

### Mobile App

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

## Environment Variables

### Mobile app

These are public Expo variables:

```text
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Backend

These must be set on the backend host:

```text
DATA_SOURCE=supabase
ALLOW_DEMO_USER=false
CORS_ORIGINS=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

Keep `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` server-side only.

## Deployment

The backend is configured for Vercel using `api/index.py` and `vercel.json`.

Vercel backend settings are documented in [docs/backend-deployment.md](docs/backend-deployment.md).

## Android Builds

The Expo app includes EAS profiles for Android internal testing and Play Store preparation.

```powershell
cd finance-app
npx eas build --platform android --profile preview
npx eas build --platform android --profile production
```

Preview build steps and manual QA are documented in [docs/android-preview-build.md](docs/android-preview-build.md).

## Current Status

- Mobile app core flows are implemented.
- FastAPI backend is Vercel-ready.
- Supabase schema, RLS policies, and SQL helper migrations are included.
- Android preview and production EAS profiles are configured.
- Play Store release is planned after final compliance setup.

## Known Limitations

- Play Store publication is not live yet.
- Privacy policy hosting and in-app privacy access still need final setup.
- Account deletion and full data deletion flow need to be completed before Play Store submission.
- A dedicated full transaction history screen is planned; current transaction history is surfaced through dashboard previews and edit flows.
- Expo web deployment has not been positioned as the main public demo path.

## Roadmap

- Add final screenshot set and demo video
- Complete Play Store compliance checklist
- Add account and data deletion flow
- Finalize privacy policy hosting
- Prepare Google Play Data Safety form
- Add dedicated transaction history screen with filtering and edit/delete entry points
- Continue polishing AI assistant explanations and dashboard drill-downs

## Play Store Coming Soon

Finance Tracker is being prepared for a future Google Play Store release. The remaining work is focused on store compliance, privacy/account deletion requirements, final QA, and production listing assets.
