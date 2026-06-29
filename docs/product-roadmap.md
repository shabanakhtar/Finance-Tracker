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
- Dashboard snapshots are cached locally and can be shown when live backend loading fails.
- Offline queue status and recent sync history are visible on the dashboard.
- Quick add modal exists inside the app.
- EAS Android preview build path exists.

## Important Current Gaps

- The installed phone build may not include the latest commits until a new EAS preview build is created and installed.
- Phone-build UX pass is needed after the first successful APK test:
  - Auth form fields are cramped on smaller screens.
  - Floating navigation can overlap lower screen content.
  - Keyboard can cover active form inputs.
  - Dashboard is too dense for first-time users.
  - First-run guidance currently appears too much like normal dashboard content.
- Google login needs real-device verification after Supabase and Google Cloud setup.
- The app has useful empty states and a first-run checklist, but not a full animated onboarding story yet.
- Offline support only covers adding transactions, not edit/delete.
- Notification quick add and home screen widgets are not implemented.
- Production CORS, non-AI API rate limiting, and observability need a hardening pass.
- Release readiness needs a formal beta freeze, QA pass, rollback plan, and fresh EAS build.
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
  - Show the checklist only after the password field is focused or the user starts typing.
- Add live character counters where fields have limits.
- Replace most form alerts with inline errors and action-specific toasts.
- Fix mobile auth layout:
  - Stack first name and last name vertically on narrow screens.
  - Keep form inputs full-width unless the screen is wide enough.
  - Reduce oversized trust/provider copy on auth screens.
  - Move "Protected by Supabase..." into small footer-level trust text, or remove it if it does not help the user.
- Improve keyboard behavior:
  - Ensure the active input remains visible when the keyboard opens.
  - Add `KeyboardAvoidingView`/scroll behavior consistently across auth, add transaction, product search, receipt review, and CSV import screens.
  - Add enough bottom padding so submit buttons are not hidden behind keyboard or navigation controls.

## Phase 3: Empty States And First-Run Guidance

Make the app useful before the user has data.

- Add first-run onboarding checklist:
  - Add income.
  - Add first expense.
  - Set first budget.
  - Ask first AI question.
  - Optional CSV import.
- Turn first-run guidance into an intentional setup flow instead of a large static dashboard card:
  - Show it the first time after signup/login when the user has little or no data.
  - Make it skippable.
  - Save skipped/completed state locally and infer completion from user data where possible.
  - Use progress dots or a short checklist so the user knows it is a guided setup.
  - Animate completed steps with check/success states.
  - Move bulky setup instructions out of the main dashboard after completion or skip.
- Dashboard empty state should guide the user toward a first useful setup.
- Transactions empty state should offer:
  - Add manually.
  - Import CSV.
  - Scan receipt.
- Budgets empty state should explain budgets and suggest common categories.
- AI empty state should show useful prompt chips.
- Receipts/product search empty state should explain what the feature does and when to trust it.
- Save checklist progress locally or infer it from existing user data.
- Include quick-add personalization in onboarding or early settings:
  - Start with sensible defaults such as Food, Ride, Shop, and Income.
  - Let users choose which shortcuts appear.
  - Allow each shortcut to define type, category, label, icon, and optional default amount.
  - Add success feedback after a quick-add shortcut is used.

## Phase 4: Motion And Success States

Use animation to make the app feel smoother, not flashy.

Status: completed together with Phase 4A.

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
  - Profile/name saved.
  - Transaction added.
  - Transaction edited.
  - Transaction deleted.
  - Budget saved.
  - Budget deleted.
  - CSV import completed.
  - Receipt scanned.
  - Quick-add shortcut saved.
  - Quick-add transaction added.
  - Offline transaction synced.
  - AI insight generated.
- Improve auth and onboarding entrance motion:
  - Logo/brand fades in first.
  - Heading slides in gently.
  - Form card enters after a short delay instead of appearing abruptly.
  - Mode switch and primary button use press feedback.
  - Keep motion subtle enough for routine finance use.
- Avoid large celebration animations for routine finance actions.
- Respect reduced-motion settings before public release.

Implemented:

- Reusable motion primitives:
  - `AnimatedScreen`
  - `AnimatedCard`
  - `PressableScale`
  - `AnimatedProgressBar`
  - `SuccessPulse`
  - `TypingText`
- Dashboard card entrance motion.
- Animated score and budget progress bars.
- First-run guidance tiles with gentle card entrance motion.
- Quick-add button/chip press feedback.
- Success haptics for save/delete/sync/AI completion moments.
- Smooth newest AI assistant response typing.
- Native stack transitions for tab screens and quick-add modal.
- Reduced-motion awareness in reusable motion primitives.

## Phase 4A: Mobile Navigation And Safe Areas

Make the app feel more native and comfortable on modern phones.

Status: completed together with Phase 4.

- Redesign the bottom navigation into a floating safe-area-aware bar.
- Add a raised center quick-add button because adding a transaction is the core daily action.
- Keep bottom spacing clear of Android navigation controls and iPhone home indicators.
- Use `react-native-safe-area-context` to calculate bottom padding.
- Update the tab structure to reduce dashboard density and make analysis easier to find:
  - Home
  - Analysis
  - Center quick add
  - AI
  - Settings
- Use a five-position floating bar with two items on the left of the add button and two on the right.
- Make the active tab visually clear with color and icon emphasis.
- Keep inactive tabs muted.
- Center button should open the dedicated quick-add flow, not a slow full form.
- Ensure every tab screen has enough bottom content padding so the floating bar never covers text, cards, import panels, or buttons.
- Add subtle tab transition feedback:
  - Active icon color shift.
  - Center button press scale.
  - Optional small haptic feedback.
- Keep the UI warm and welcoming in light mode, and calm/premium in dark mode.

Implemented:

- Custom floating tab bar.
- Safe-area-aware bottom padding.
- Raised center quick-add action that opens the dedicated quick-add flow.
- Active tab color and surface emphasis.
- Muted inactive tabs.
- Press scale and haptic feedback on tab/quick-add actions.

Needs follow-up from phone APK review:

- Fix screens where floating navigation still overlaps content, especially Settings and long dashboard cards.
- Add or expose the Analysis tab so the dashboard is less crowded.
- Re-check bottom padding on small Android screens with gesture navigation enabled.

## Phase 5: Graceful Degradation

The app should remain useful when services fail.

Status: completed before Phase 4, with offline edit/delete intentionally left for a later offline expansion.

- Backend unavailable:
  - API failures are classified as network, timeout, auth, rate-limit, backend, parse, or unknown.
  - Dashboard retries are available from the error state.
  - If a previous dashboard snapshot exists, the app shows cached data instead of a blank failure.
  - Add transaction and quick add preserve useful input behavior and save offline on likely network/backend failures.
- Gemini unavailable or rate-limited:
  - AI chat explains that AI is temporarily unavailable and core tracking still works.
  - Market search explains that no reliable recommendation can be made instead of guessing.
  - Non-AI dashboard summaries, budgets, transactions, and CSV tools remain usable.
- Supabase slow or temporarily unavailable:
  - Dashboard cache is stored locally after successful loads.
  - Cached dashboard mode clearly labels that it is showing a saved snapshot and offers retry.
  - Add transaction remains recoverable through the offline queue when the API is unreachable.
- Offline:
  - Add transaction queue exists.
  - Dashboard shows queue count.
  - Dashboard shows recent sync history for success, partial sync, offline, and failed sync attempts.
  - Offline edit/delete queue remains a future enhancement because conflict handling needs a separate design.
- Receipt scan fails:
  - The manual form stays available.
  - Failure messages stay specific enough for users to retry with a better image or enter values themselves.
- Product recommendation weak:
  - Empty/weak market results say no reliable cheaper option was found.
  - The app avoids inventing prices, stores, or sources when Gemini/search is unavailable.

## Phase 6: AI Limits While Keeping The App Free

Do this before public release to protect costs.

Status: completed for backend-enforced free daily limits. Paid subscription work remains future-only.

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

Implemented:

- Supabase-backed `ai_usage` table migration.
- Backend-enforced daily limits:
  - AI chat: 10/day.
  - Receipt scan: 5/day.
  - Product recommendation: 5/day.
- Usage tracking by user, feature, and day.
- Friendly HTTP 429 response before Gemini is called.
- Limit metadata returned with successful AI responses and limit errors.
- App-side friendly limit messages for AI chat, market search, and receipt scan.
- Paid subscription, Play Billing, and higher-tier AI routing intentionally left for the future subscription agenda.

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

## Phase 9B: Quick Add Personalization

Make quick add feel personal instead of fixed.

- Add editable quick-add shortcuts:
  - Category.
  - Transaction type.
  - Label.
  - Icon.
  - Optional default amount.
- Let users edit shortcuts from settings and/or long-pressing a quick-add tile.
- Include quick-add setup in first-run guidance as an optional step.
- Store shortcut preferences per user locally first, then consider Supabase sync later.
- Add success states:
  - Shortcut updated.
  - Quick transaction added.
  - Offline quick transaction queued.
- Keep the full add form available for non-routine transactions.

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

## Design And Animation Reference Sources

Use these for inspiration and implementation references, not direct copying.

- Figma Community:
  - Full UI kits, onboarding references, dashboard layouts, and component ideas.
  - Best format to share: Figma link plus screenshots of the exact frames.
- LottieFiles:
  - Free animated onboarding icons, success states, loaders, and empty states.
  - Best format to share: animation link or downloaded JSON.
- Mobbin:
  - Real-world mobile app onboarding, auth, settings, and finance/productivity flows.
  - Best format to share: screenshots or screen recordings.
- Dribbble:
  - Visual mood and polished microinteraction ideas.
  - Use carefully because many shots are not production-ready UX.
- Behance:
  - Longer app case studies and complete visual systems.
- Screenlane:
  - Mobile UI inspiration for onboarding, empty states, and account flows.
- Page Flows:
  - User-flow videos for onboarding and payment/account flows.
- IconScout:
  - Icons, illustrations, and Lottie animations with free filters.

Preferred references to send into Codex:

- Screenshots for layout and visual direction.
- Short screen recordings or GIFs for motion timing.
- Lottie JSON/link for specific animation assets.
- Figma links when inspecting multiple related frames matters.

## Phase 11: Beta Release Readiness Checklist

Use this before sharing the app beyond trusted testers. Treat beta release as a freeze-and-test process, not another feature sprint.

Already present:

- Core app screens exist: dashboard, add transaction, AI, settings, quick add.
- Supabase Auth and per-user finance data are implemented.
- Supabase RLS exists for transactions and budgets.
- Environment examples exist for backend and Expo without real secrets.
- `.env` is ignored by Git.
- Privacy policy draft exists.
- Friendly loading, empty, validation, success, and error states exist.
- Offline add queue and graceful degradation exist.
- AI daily limits are backend-enforced.
- Vercel production deployment exists.
- EAS preview build path exists.
- Uptime monitoring has been set up.

Needed before beta:

- Freeze v1/beta scope and stop adding non-critical features until the beta is tested.
- Run all pending Supabase migrations in production, especially `ai_usage`.
- Verify the EAS build uses the correct production API URL.
- Create and install a fresh EAS preview build after the latest commits.
- Test with at least two fresh accounts, not only the developer account.
- Test the full user flow:
  - Sign up.
  - Login/logout.
  - Google login on real device.
  - Add income.
  - Add expense.
  - Edit/delete transaction.
  - Create/delete budget.
  - CSV import/export.
  - Receipt scan.
  - Product recommendation.
  - AI chat limit behavior.
  - Offline add and later sync.
- Test edge cases:
  - Slow or unavailable internet.
  - Wrong password.
  - Incomplete forms.
  - Empty dashboard.
  - Invalid CSV.
  - Invalid/unclear receipt image.
  - User tries to access data after logout.
- Security hardening:
  - Rotate keys that were ever pasted into chat before public release.
  - Keep `SUPABASE_SERVICE_ROLE_KEY` only in Vercel/backend env.
  - Keep `ALLOW_DEMO_USER=false` in production.
  - Verify no real `.env` or `.env.local` files are tracked.
  - Review CORS for production origins.
  - Add non-AI API rate limiting for write-heavy endpoints later.
- Database readiness:
  - Confirm production database is Supabase, not local CSV.
  - Confirm required constraints and indexes exist.
  - Remove dummy/test data before public launch, or clearly label beta accounts.
  - Set a simple backup/export routine before public launch.
- Monitoring and support:
  - Confirm UptimeRobot points at `/health`.
  - Add an error monitoring option such as Sentry before wider public launch.
  - Add support/contact email in the app store listing and privacy policy.
- Release mechanics:
  - Run `python -m py_compile backend.py supabase_data.py ai_usage.py`.
  - Run `npx tsc --noEmit`.
  - Run `npm run lint`.
  - Create a GitHub release tag for beta.
  - Keep the previous working APK/build link for rollback.
  - Verify Vercel latest deployment is green after every backend change.

Not needed for the first beta:

- Custom domain/DNS for the mobile app. The Vercel API domain is acceptable for beta if stable.
- Full browser matrix testing. The app is mobile-first; web testing is useful but secondary.
- Role-based student/teacher/admin permission testing. This app has normal users, not school roles.
- Paid subscription, Play Billing, or premium AI routing.
- Direct bank connections.
- Home screen widget and notification quick add.
- Advanced analytics dashboards.
- A polished marketing site.

## Current Priority Order

1. Finish the current EAS APK verification and confirm the app opens with Supabase env included.
2. Fix visible phone-build UX issues:
   - Auth form layout.
   - Password checklist behavior.
   - Keyboard avoidance.
   - Floating nav overlap.
   - Dashboard density.
3. Add five-section floating navigation: Home, Analysis, Add, AI, Settings.
4. Convert first-run money snapshot guidance into a skippable animated setup flow.
5. Add editable quick-add shortcuts and success states.
6. Run Supabase production migrations and verify Vercel deployment.
7. Beta freeze and full QA pass with fresh accounts.
8. Security hardening: RLS review, non-AI rate limits, secret rotation, CORS.
9. Monitoring/support polish: `/health`, UptimeRobot, Sentry or equivalent, support contact.
10. Internal beta with a small tester group.
11. Notification quick add.
12. Widget feasibility.
13. Future subscription infrastructure only if the app shows real usage.
