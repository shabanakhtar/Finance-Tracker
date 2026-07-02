# Screenshot Guide

Use this guide to capture the screenshots referenced in the README. Keep the emulator/device at a clean size, hide distracting desktop windows, and use consistent light mode unless you want to include a separate dark-mode set later.

## Screenshot Set

### 1. Login and onboarding

File: `docs/screenshots/login.png`

Show the welcome/auth screen with the app name, greeting, and clear sign-in/create-account actions. Avoid capturing a validation error or keyboard overlay.

### 2. Dashboard

File: `docs/screenshots/dashboard.png`

Show the Home screen after login with the available balance card, income/spent summary, quick-add shortcuts, AI insight card, and budget preview visible if possible.

### 3. Add transaction

File: `docs/screenshots/add-transaction.png`

Show the Add tab with the transaction form filled with realistic sample values, such as an expense category and amount. Avoid showing failed validation or backend error banners.

### 4. Budgets

File: `docs/screenshots/budgets.png`

Show the budget section with at least two categories and visible progress bars. If the budget section is on Home, scroll to the cleanest budget-focused area.

### 5. AI assistant

File: `docs/screenshots/ai-assistant.png`

Show the AI tab with the AI assistant header, usage limits, and a finance question prompt or response. Prefer a successful response over an empty/error state.

### 6. Settings

File: `docs/screenshots/settings.png`

Show settings with theme/currency controls, shortcut management, import/export, or account actions. Avoid showing raw technical debug text.

## Screens To Avoid For The First README Pass

- Full transaction history, because the dedicated history screen is still planned.
- Receipt scanning if camera/image permissions make the screenshot noisy.
- Market search if the AI/search service is unavailable or returns a weak result.
- Any screen with backend cold-start errors, validation errors, or keyboard overlap.

## Capture Tips

- Use a test account with realistic sample data.
- Use the same currency across all screenshots.
- Keep the status bar visible if it looks clean; crop only if it distracts.
- Capture portrait mobile screenshots rather than desktop web screenshots.
- Prefer screens that demonstrate completed flows instead of setup friction.

