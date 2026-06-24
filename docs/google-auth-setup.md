# Google Auth Setup

The app has a `Continue with Google` button wired to Supabase OAuth. To make it work in production, enable Google in Supabase:

1. Open Supabase Dashboard.
2. Go to Authentication > Providers.
3. Enable Google.
4. Add the Google OAuth client ID and secret from Google Cloud Console.
5. Add this redirect URL in Supabase URL configuration:

```text
financeapp://auth/callback
```

For local Expo Go testing, also add the local redirect URL shown by Expo if prompted. The built Android app uses the `financeapp` scheme from `app.json`.

After saving the provider settings, rebuild or restart the app and test `Continue with Google`.
