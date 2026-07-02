# Finance Tracker Remaining Agenda

This is the simplified list of what is still left. Completed P0 and P1 work has been removed from this file.

## 1. Emulator QA

Check these in the Android emulator:

- Auth welcome, sign-in, create-account, and profile-completion screens start below the status bar.
- Onboarding and Settings show the same theme and currency choices.
- Sign-out confirmation appears on Home and Settings.
- Budget save blocks empty required fields and shows inline errors.
- Save actions show visible success feedback.
- Auth welcome preview does not look like real account data.
- Auth/onboarding copy does not mention backend infrastructure.
- Category labels look clean and human-readable.
- Money fields show the selected PKR/USD prefix everywhere.
- AI usage cards read clearly at zero, partial, and max usage without text overlap.
- AI counters stay visible and do not collide with navigation.
- Floating navigation does not cover content on Home, Analysis, Add, Quick Add, AI, or Settings.
- Login and signup still work.
- First-run setup appears after login when essentials still need setup.
- Financial Score explanation opens correctly.
- Product search uses realistic examples like sea salt hair spray.
- Product search clearly says when the search or AI service is unavailable.
- AI chat still works when limits and config allow it.

## 2. Visual And Dashboard Follow-Ups

- Verify light and dark mode feel like the same product.
- Confirm orange/brown branding is gone except warning or caution states.
- Add Home trend widgets:
  - 7-day and 30-day selector
  - income/spend movement when enough data exists
  - small chart that helps scanning without crowding Home
- Decide after emulator review whether Analysis should include a category donut chart or bar chart.

## 3. EAS Preview Build

- Build a fresh Android preview APK after emulator QA passes.
- Install it on phone.
- Confirm emulator fixes are present on the real device.
- Run final phone UX review:
  - keyboard
  - bottom navigation overlap
  - auth
  - onboarding/setup
  - AI
  - Add
  - Settings
