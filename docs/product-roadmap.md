# Finance App Product Roadmap

This roadmap captures the current state, the remaining agenda, and the order of work before a public mobile launch. The app should stay free for now, with AI limits added early enough to protect the backend and Gemini key. Paid AI/subscription work stays on the future agenda until the app has real demand and paid credits are available.

## Current State

- Expo React Native mobile app with tabs for dashboard, add transaction, AI, and settings.
- FastAPI backend deployed through Vercel.
- Supabase Auth and Postgres are integrated.
- Email/password login is implemented.
- Google OAuth app flow is implemented, pending dashboard/provider verification on device.
- Per-user transactions and budgets are backed by Supabase.
- Row Level Security exists for transactions and budgets.
- Dashboard analytics, financial score, insight cards, opportunities, and budget status exist.
- Add/edit/delete transactions exist.
- Budget create/delete exists.
- CSV import/export exists.
- Receipt scanning exists through Gemini.
- Local product alternative search exists through Gemini with Google Search grounding.
- AI chat exists.
- Offline add queue exists for transactions.
- Quick add modal exists inside the app.
- EAS Android preview build path exists.

## Important Current Gaps

- The installed phone build may not include the latest commits until a new EAS preview build is created and installed.
- Google login needs real-device verification after Supabase and Google Cloud setup.
- The app has useful empty states, but they are not yet a full guided onboarding system.
- Forms still rely too much on alerts instead of reusable real-time validation.
- Loading/error/success states are inconsistent between screens.
- AI usage has no backend quota yet.
- Gemini failures/rate limits need more graceful app behavior.
- Offline support only covers adding transactions, not edit/delete.
- Notification quick add and home screen widgets are not implemented.
- Production CORS, rate limiting, and observability need a hardening pass.
- Branding, Play Store listing assets, and final app identity are intentionally separate from this agenda.

## Phase 1: UX Foundation

Build reusable UX primitives before polishing individual screens.

- Add delayed loading behavior:
  - Under 500ms: show no loader to avoid flicker.
  - 500ms to 2s: show skeletons or soft placeholders.
  - 2s and above: show spinner plus clear loading text.
  - Long waits: show "Still working" with retry or cancel where possible.
- Add reusable components:
  - `DelayedLoader`
  - `SkeletonCard`
  - `SkeletonList`
  - `AppErrorState`
  - `EmptyState`
  - `SuccessToast`
  - `ConfirmDialog`
  - `FormField`
  - `PasswordChecklist`
  - `CharacterCounter`
- Create a consistent message system:
  - Inline errors for form problems.
  - Toasts for small success/failure events.
  - Modals for destructive or blocking decisions.
  - Full error states for page-level failures.

## Phase 2: Forms And Validation

Make forms feel production-grade and harder to misuse.

- Disable submit buttons until required fields are valid.
- Show missing required fields after blur or submit attempt.
- Validate formats in real time:
  - Email
  - Password
  - Amount
  - Date
  - Category
  - Notes length
  - Product search length
  - Receipt/CSV constraints
- Add password requirement checklist:
  - Minimum length.
  - Letter and number requirements.
  - Confirmation match if confirmation is added.
- Add live character counters where fields have limits.
- Replace most form alerts with inline errors and action-specific toasts.

## Phase 3: Empty States And First-Run Guidance

Make the app useful before the user has data.

- Add first-run onboarding checklist:
  - Add income.
  - Add first expense.
  - Set first budget.
  - Ask first AI question.
  - Optional CSV import.
- Dashboard empty state should guide the user toward a first useful setup.
- Transactions empty state should offer:
  - Add manually.
  - Import CSV.
  - Scan receipt.
- Budgets empty state should explain budgets and suggest common categories.
- AI empty state should show useful prompt chips.
- Receipts/product search empty state should explain what the feature does and when to trust it.
- Save checklist progress locally or infer it from existing user data.

## Phase 4: Motion And Success States

Use animation to make the app feel smoother, not flashy.

- Add an animated first-run intro:
  - Track your money.
  - Set simple budgets.
  - Scan receipts.
  - Ask AI for insights.
- Use welcoming intro motion:
  - Cards slide in gently from the bottom.
  - Progress dots animate between steps.
  - Icons use small motion such as chart rise, receipt scan, wallet open, or AI sparkle.
  - Final intro step leads into adding the first transaction or importing CSV.
- Evaluate navigation transitions between screens and tabs.
- Add smooth page transitions using existing navigation behavior first.
- Use `react-native-reanimated` only where the built-in navigation is not enough.
- Add light microinteractions:
  - Button press feedback.
  - Card entrance fade/slide.
  - Loading shimmer.
  - Success checkmark.
  - Subtle haptic feedback for save/delete/sync.
- Add success states for:
  - Account created.
  - Login successful.
  - Transaction added.
  - Transaction edited.
  - Transaction deleted.
  - Budget saved.
  - Budget deleted.
  - CSV import completed.
  - Receipt scanned.
  - Offline transaction synced.
  - AI insight generated.
- Avoid large celebration animations for routine finance actions.
- Respect reduced-motion settings before public release.

## Phase 4A: Mobile Navigation And Safe Areas

Make the app feel more native and comfortable on modern phones.

- Redesign the bottom navigation into a floating safe-area-aware bar.
- Add a raised center quick-add button because adding a transaction is the core daily action.
- Keep bottom spacing clear of Android navigation controls and iPhone home indicators.
- Use `react-native-safe-area-context` to calculate bottom padding.
- Recommended tab structure:
  - Home
  - Stats or Transactions
  - Center quick add
  - AI
  - Settings
- Make the active tab visually clear with color and icon emphasis.
- Keep inactive tabs muted.
- Center button should open the dedicated quick-add flow, not a slow full form.
- Add subtle tab transition feedback:
  - Active icon color shift.
  - Center button press scale.
  - Optional small haptic feedback.
- Keep the UI warm and welcoming in light mode, and calm/premium in dark mode.

## Phase 5: Graceful Degradation

The app should remain useful when services fail.

- Backend unavailable:
  - Preserve user input.
  - Offer retry.
  - Offer save offline where possible.
- Gemini unavailable or rate-limited:
  - Show normal non-AI summaries.
  - Explain that AI is temporarily unavailable.
  - Avoid blocking core finance tracking.
- Supabase slow or temporarily unavailable:
  - Show cached/local content where available.
  - Keep add transaction recoverable.
- Offline:
  - Add transaction queue already exists.
  - Add offline edit/delete queue later.
  - Show queue status and sync history.
- Receipt scan fails:
  - Let the user manually enter values.
  - Keep the image failure message specific.
- Product recommendation weak:
  - Say no reliable cheaper option was found.
  - Never invent prices, stores, or sources.

## Phase 6: AI Limits While Keeping The App Free

Do this before public release to protect costs.

- Keep all AI features free for now.
- Add backend-enforced usage limits.
- Track usage by user, feature, and time period.
- Suggested initial free limits:
  - AI chat: 10 requests/day.
  - Receipt scan: 5 scans/day.
  - Product recommendation: 5 searches/day.
  - Dashboard insight regeneration: cached, not regenerated on every refresh.
- Return friendly limit messages:
  - "You have used today's AI limit. Core tracking still works."
- Add cooldown/limit headers or response fields for the app.
- Store cached AI insight results with timestamps.
- Do not build paid subscription checkout yet.

## Future Subscription Agenda

Only start this if the app gets meaningful usage.

- Add subscription entitlement tables.
- Add Play Billing integration.
- Add backend verification of purchase status.
- Add model routing:
  - Free users use low-cost Gemini model.
  - Paid users get higher limits and stronger model access.
- Add subscription management UI.
- Add abuse prevention before increasing paid limits.
- Keep provider abstraction so Gemini, OpenAI, or Claude can be compared later.

Recommended future AI direction:

- Start with Gemini only because the app already uses it and needs receipt/image/product-search features.
- Add provider abstraction before adding a second AI provider.
- Benchmark Gemini, OpenAI, and Claude later with real finance prompts and cost data.

## Phase 7: Security Hardening

Security should be handled before public testing expands.

- XSS/content safety:
  - Do not render arbitrary HTML.
  - Treat AI output, CSV content, receipt text, and product names as untrusted text.
  - Keep markdown rendering out unless sanitized.
- Supabase RLS:
  - Verify RLS is enabled on every exposed user-data table.
  - Verify users can only read/write their own rows.
  - Do not use editable `user_metadata` for authorization.
  - Keep `service_role` only on backend/Vercel.
- API rate limiting:
  - Add limits to AI chat, receipt scan, market search, import/export, and write-heavy endpoints.
  - Add stronger limits around expensive Gemini calls.
- Secrets:
  - Rotate exposed keys before public release.
  - Keep backend secrets out of mobile app config.
- CORS:
  - Replace broad/local-only defaults with explicit production origins where relevant.
- Input limits:
  - Keep hard limits for CSV size, receipt size, prompt length, and product name length.

## Phase 8: Backend And Scaling Readiness

Prepare for real users without overbuilding too early.

- Add structured backend logs.
- Add request IDs.
- Add `/health` monitoring and uptime alerts.
- Add simple usage metrics for AI and import endpoints.
- Add database indexes as queries grow.
- Avoid recalculating expensive analytics unnecessarily.
- Cache AI insight outputs.
- Consider background jobs later for receipt scans and product recommendations.

Expected scaling pressure:

- First likely bottleneck: Gemini quota/cost.
- Second likely bottleneck: backend function limits and cold starts.
- Third likely bottleneck: inefficient database queries as data grows.
- Supabase is likely fine early if RLS and indexes are correct.
- At high usage, the stack needs paid AI, quotas, caching, monitoring, and possibly queues.

## Phase 9: Mobile Convenience

These are useful, but should come after core UX and AI quota work.

- Notification quick add:
  - Add notification permission flow.
  - Add daily/weekly reminder option.
  - Deep-link notification actions into quick add.
  - Test on EAS preview build.
- Home screen widget:
  - Decide whether it should show balance, monthly spend, or quick add.
  - Evaluate Expo-compatible widget approach versus native module.
  - Build only after preview build workflow is stable.
- Camera shortcut idea:
  - Android hardware camera-button interception is limited and device-dependent.
  - Better route is notification action, widget, or app shortcut deep-link.

## Phase 9A: Bank Statements And Share-To-App Capture

Add safer financial import paths before considering direct bank integrations.

- Bank statement import:
  - Add an import path for app/exported statements from Nayapay, JazzCash, and other local wallets.
  - Support CSV first when available.
  - Evaluate PDF statement parsing only after the CSV import/review flow is mature.
  - Parse statement rows into a review screen before saving.
  - Let users map columns such as date, description, amount, debit/credit, and category.
  - Detect likely duplicates before import.
  - Preserve the original file only if the user explicitly opts in; otherwise process and discard.
- Provider templates:
  - Create import templates for Nayapay and JazzCash statement formats.
  - Keep a generic statement importer for unknown banks/wallets.
  - Add a sample-file based test fixture for each supported provider.
- Receipt and statement sharing:
  - Add Android share-to-app support so users can share receipt images or statement files directly from WhatsApp, gallery, file manager, or email.
  - Shared receipt image should open the receipt scan/review flow.
  - Shared CSV/PDF statement should open the import preview flow.
  - Never save imported rows without a review/confirm step.
- Direct bank connections:
  - Treat as future/high-risk work, not near-term scope.
  - Requires bank/open-banking providers, compliance review, explicit user consent, token storage, revocation flows, and stronger security controls.
  - Do not request bank credentials directly inside the app.

## Phase 10: Release Engineering

Ignore branding details here, but keep production mechanics ready.

- Ensure app build uses production backend URL.
- Create fresh EAS preview builds after meaningful app changes.
- Add production Android build profile checks.
- Manage version and Android version code.
- Verify Play Store permissions and data-safety answers.
- Keep privacy policy updated.
- Use internal testing before public release.

## Current Priority Order

1. UX foundation components.
2. Forms and validation.
3. Empty states and first-run guidance.
4. AI usage limits while keeping all features free.
5. Graceful degradation and success states.
6. Security hardening: RLS review, rate limits, secrets, CORS.
7. Fresh EAS preview build and real-device verification.
8. Notification quick add.
9. Widget feasibility.
10. Future subscription infrastructure only if the app shows real usage.
