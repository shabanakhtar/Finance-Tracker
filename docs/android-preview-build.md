# Android Preview Build

Use this when the app is ready for device testing outside Expo Go.

## Prerequisites

- Expo account access.
- The backend production URL is live.
- `finance-app/eas.json` has the correct `EXPO_PUBLIC_API_URL`.
- Local checks pass:

```powershell
cd "C:\Users\User\OneDrive\Desktop\Finance Tracker Project\finance-app"
npx expo install --check
npx tsc --noEmit
npm run lint
```

## Start Preview APK Build

```powershell
cd "C:\Users\User\OneDrive\Desktop\Finance Tracker Project\finance-app"
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

The preview profile creates an APK for internal testing. Install the APK on your Android phone and test:

- Login/signup
- Dashboard load
- Quick add shortcuts
- Manual add transaction
- Offline add and sync
- Edit/delete transaction
- Budgets
- AI chat
- Receipt scan
- Market alternative search
- CSV export/import

## Production Build Later

Only run this after preview QA passes:

```powershell
cd "C:\Users\User\OneDrive\Desktop\Finance Tracker Project\finance-app"
npx eas-cli build --platform android --profile production
```
