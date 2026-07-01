# Finance Tracker: Phases, Levels, And Implementation Agenda

This is the working build plan for the Finance Tracker mobile app. It keeps the original phased roadmap style, but updates it with the newest GitHub checkpoint and the current phone UX priorities.

The goal is not just to make the app "work." The goal is to make it feel like a real personal finance companion: calm, useful, private, fast enough on phone, clear when something fails, and friendly enough that a normal user can start without reading instructions.

## Current Project Snapshot

### Project

- Main repository: `https://github.com/shabanakhtar/Finance-Tracker`
- Local project path: `C:\Users\User\OneDrive\Desktop\Finance Tracker Project`
- Mobile app path: `finance-app/`
- Backend: FastAPI on Vercel
- Current API URL: `https://finance-tracker-shateam1.vercel.app`
- Supabase project: `https://pmyysyovszlywljoajun.supabase.co`

### Important Security Rule

- Never put the Supabase service role key or backend secret keys inside the mobile app.
- Mobile app should only use public Expo vars:
  - `EXPO_PUBLIC_API_URL`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Latest GitHub Checkpoint

- `Add onboarding preference setup`

Recent important commits:

- `Add onboarding preference setup`
- `Add PKR and USD currency setting`
- `Add floating success toasts`
- `Explain score and harden AI search diagnostics`
- `Refresh app color palette`
- `Track financial score clarity work`
- `Track home trend widget ideas`
- `Track product search follow-ups`
- `Polish post-login setup guide`
- `Harden Supabase advisor warnings`
- `Add SQL-backed AI context`
- `Add auth welcome step`
- `Harden backend security controls`
- `Surface AI usage limits`
- `Strengthen offline resilience`
- `Smooth motion and success feedback`
- `Harden forms and keyboard behavior`
- `Personalize quick add shortcuts`
- `Polish first run setup flow`
- `Document SQL-backed AI insight plan`
- `Keep setup visible until essentials complete`
- `Clarify home dashboard focus`
- `Harden level two navigation`
- `87ed019 Polish auth first impression`
- `d8977a7 Update roadmap with phases and levels`
- `dcb3ab7 Improve mobile onboarding and tab layout`
- `fb6e868 Update mobile UX roadmap`
- `3441b0f Add Supabase env to EAS builds`
- `e8e186a Stabilize Android animation build`
- `106266a Fix Android startup crash config`

## Contribution Push Strategy

We are intentionally using multiple meaningful GitHub checkpoints.

This helps contributions grow while keeping the repo clean. The rule is: push after real chunks, not after every tiny edit.

Good checkpoint size:

- A visible feature is added.
- A UX batch is complete.
- A validation pass succeeds.
- A phone/APK issue is fixed.
- A roadmap or release-prep doc is updated.

Avoid:

- Empty commits.
- Tiny noisy commits that make the history ugly.
- Pushing broken TypeScript or lint failures.

Current push plan:

1. `UX batch 1`
   - Auth, keyboard, floating nav, Analysis tab.
   - Completed: `dcb3ab7`

2. `UX batch 2`
   - Real phone/APK review fixes.

3. `Quick add personalization`
   - Editable quick-add shortcuts and local persistence.

4. `Setup guide polish`
   - Better onboarding/setup progression.

5. `Beta readiness`
   - QA fixes, migrations, release prep, docs update.

## Level 0: App Opens And Environment Is Correct

Status: mostly complete.

This level is about making sure the app launches on a real Android phone and talks to the right backend.

Implemented:

- Expo React Native app exists under `finance-app/`.
- EAS Android preview build path exists.
- Backend is deployed on Vercel.
- Supabase Auth and Postgres are integrated.
- EAS env now includes:
  - `EXPO_PUBLIC_API_URL`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- The app now opens on phone after the EAS env fix.

Still needed:

- Create a fresh EAS Android preview build after `dcb3ab7`.
- Install that APK on the phone.
- Confirm the latest UI changes are actually present on device.
- Confirm the app is using production backend URL in the build.

Validation commands:

```powershell
cd "C:\Users\User\OneDrive\Desktop\Finance Tracker Project\finance-app"
npx tsc --noEmit
npm run lint
```

## Level 1: Authentication And First Impression

Status: implementation batch started, needs phone verification after the next EAS preview build.

The auth screen is the first real impression. If it feels cramped, dull, or broken, users will not trust the finance app.

Previously visible issues:

- First name and last name fields were cropped.
- Password checklist showed too aggressively.
- Page appeared abruptly.
- Auth screen felt dull.
- "Protected by Supabase..." text was too loud.
- Keyboard could cover active fields.

Implemented in `dcb3ab7`:

- Auth name fields now wrap better with safer minimum width.
- Android uses stronger keyboard avoiding behavior.
- Scroll views use better keyboard tap/dismiss handling.
- Auth heading and form now enter with existing animation primitives.
- Added small finance preview tiles:
  - Income
  - Spend
  - Score
- Password checklist now appears only during signup while the password field is focused or has typed input.
- Supabase trust text reduced to tiny private sign-in language.

Implemented in the Level 1 auth-first-impression batch:

- Auth intro copy now changes between sign-in and account creation.
- The create-account headline now frames signup as building the first money picture.
- The sign-in headline now makes returning to saved budgets, receipts, and insights feel clearer.
- Brand row now includes a small "Private money clarity" caption.
- Finance preview tiles now show small example metrics instead of only labels.
- Compact phone screens get tighter spacing and smaller headline sizing.
- The auth card now has an explicit border so it reads better against the background.
- Switching between Sign in and Create clears stale errors, success messages, submitted state, and touched fields.
- Profile completion form now also enters with a subtle delayed animation.
- Mode-specific helper copy was added below the sign-in/create toggle.
- Auth now opens with a calm welcome step instead of dropping users straight into fields.
- The welcome step uses a large "Hello." moment, short decision copy, animated finance preview tiles, and clear Sign in/Create account actions.
- Existing sign-in/create forms remain behind that choice, with a Back action to return to the welcome step.
- The welcome step now staggers brand, greeting, headline, supporting copy, preview metrics, and actions so the first screen does not appear abruptly.
- The "Hello." greeting now uses a light typing reveal while respecting reduced-motion settings.

Next quality pass:

- Test on actual phone screen size.
- Confirm first/last name fields are not cropped in signup.
- Confirm password checklist appears only when the password field is focused or has typed input.
- Confirm keyboard does not hide password/name fields.
- Confirm compact-screen auth spacing feels calm and not cramped.
- Confirm mode switching does not leave stale validation messages behind.
- Confirm the welcome step feels smooth on emulator and phone, with text visibly appearing instead of popping in.
- Confirm the color direction feels premium; current direction is warm cream, charcoal, amber, green, coral, and violet instead of a single orange-heavy UI.

## Level 2: Navigation And Screen Structure

Status: major batch completed, navigation hardening started, needs APK review.

The app should feel like a real mobile finance tool, not a compressed web dashboard.

Original issue:

- Home was too dense.
- Floating bottom nav overlapped Settings/content.
- Add action needed to stay central.
- Analysis/charts needed their own home.

Implemented in `dcb3ab7`:

- Navigation is now five sections:
  - Home
  - Analysis
  - Add
  - AI
  - Settings
- Add remains the raised center action.
- Two tabs sit left of Add and two tabs sit right of Add.
- New dedicated `Analysis` tab exists.
- Analysis now contains:
  - Financial score
  - Monthly cash flow
  - Top categories
  - Opportunities
  - Smart insights
- Analysis clarity work:
  - Implemented: the financial score card is tappable and explains what the score means and what it does not mean.
  - Implemented: score explanation includes spending ratio, consistency, data confidence, and budget pressure.
  - Implemented: score copy avoids presenting the value like a credit score or full net-worth health score.
  - Add a compact category-spending donut or bar chart if it improves scanning more than the current list.
  - Keep Smart Insights as readable cards; use charts only for data that benefits from visual comparison.
- Home is lighter and more focused:
  - Balance
  - Net cash flow
  - Income/spent summary
  - Quick add
  - Setup guide prompt
  - Budgets
  - Recent transactions
- Safe-area bottom padding was added across:
  - Home
  - Analysis
  - Add
  - AI
  - Settings
  - Quick Add

Implemented in the Level 2 navigation hardening batch:

- Floating tab bar now hides while the keyboard is open so it does not fight active inputs.
- The tab bar now adapts on narrow phones with smaller icon, label, height, radius, and spacing values.
- The floating bar has a max width on larger screens so it stays like a mobile control instead of stretching awkwardly.
- Tab buttons now expose clearer accessibility labels.
- Active non-center tabs now expose selected accessibility state.
- Center Add remains visually raised and opens the dedicated quick-add flow.

Phone review checklist:

- Does the floating nav overlap the bottom of Settings?
- Does it overlap long dashboard cards?
- Does it overlap Add form submit buttons?
- Does Analysis appear correctly in the tab bar?
- Is the center Add button still visually obvious?
- Does the tab bar feel too crowded with five items?
- Does the floating nav disappear when the keyboard opens?
- Does the compact tab bar still feel readable on smaller Android screens?

## Level 3: Dashboard Clarity

Status: production clarity pass started, needs APK review.

Home should answer one simple question:

> "What is my money situation today, and what should I do next?"

What Home should not be:

- A giant analytics report.
- A wall of charts.
- A permanent onboarding poster.
- A screen where the bottom nav hides the last action.

Implemented:

- Heavy analysis moved out of Home.
- Analysis got its own tab.
- Money snapshot setup prompt is now skippable.
- Skip state is saved locally.

Implemented in the Level 3 dashboard clarity batch:

- Home now computes a single "Today" focus action from the user's current state.
- The focus action prioritizes:
  - Offline sync if entries are waiting.
  - Add income if no income exists.
  - Add expense if no spending exists.
  - Set one budget if no budgets exist.
  - Open Analysis when warnings, insights, or opportunities are ready.
  - Quick add for normal daily use.
- Added a compact focus card after the balance so Home answers "what should I do next?"
- Money snapshot setup now shows essentials progress instead of feeling like a static poster.
- Setup progress tracks income, expense, and budget completion.
- Setup steps show completed states with check icons.
- Setup now stays visible at the top of Home after login until income, expense, and one budget exist, unless the user skips it.
- Budget focus primes the budget form with a sensible default category.
- Recent transactions are limited to a short preview on Home.
- Recent transactions now include a small footer pointing users to Analysis for trends.

Next improvements:

- Expand the setup progress model:
  - Add income.
  - Add expense.
  - Set budget.
  - Ask AI.
  - Optional CSV import.
  - Optional quick-add setup.
- Hide setup once completed or skipped.
- Infer completed steps from real user data.
- Add a way to restart setup from Settings later.
- Add a dedicated transactions/history screen later if users need full history outside Analysis.
- Add a compact Home balance sparkline with range controls such as 7D and 30D.
- Add period-over-period deltas on Home summary cards, for example income up/down versus the previous 7 days.
- Keep deeper chart controls in Analysis, but allow Home to show one glanceable trend when it helps daily decisions.

## Level 4: Setup Guide And Onboarding

Status: implemented for the current mobile app cycle. Needs phone APK review after the next preview build.

This is where the app starts feeling personal.

The setup flow should not lecture the user. It should help them get to their first useful money snapshot quickly.

Current implemented setup behavior:

- The setup guide appears first on Home after login while the essentials are incomplete:
  - Add income.
  - Add expense.
  - Set one budget.
- Setup hides once those essentials exist.
- Setup can be skipped and the skip state is persisted locally.
- Setup can be restored from Settings if the user skipped too early.
- Settings calls this the "Setup guide" instead of "First-run setup" so the label makes sense to normal users.
- The setup card now has a clear active step instead of a static poster.
- Essential steps now show state:
  - Active.
  - Completed.
  - Upcoming.
- Completed steps use check icons and progress percentage.
- Optional setup actions are separated from essentials:
  - Ask AI.
  - Import CSV.
  - Plan quick-add shortcuts.
- Budget setup primes the Home budget form with a sensible default category.
- Setup persistence is centralized in `finance-app/services/setupProgress.ts`.

Still pending after Level 4:

- Phone APK review of spacing, tap targets, and visual motion.
- Quick Add personalization itself, handled in Level 5.
- Stronger animation pass once the main flows are stable.

Quality bar:

- A new user should know what to do in under 10 seconds.
- The user should not feel trapped.
- The setup should disappear when it has done its job.

## Level 5: Quick Add Personalization

Status: implemented for the current mobile app cycle. Needs phone APK review after the next preview build.

Quick Add is the daily-use feature. It should become personal.

Current state:

- Quick add modal exists.
- Home quick-add shortcuts exist.
- Success states already exist for saving transactions in the quick-add flow.
- Shortcuts are now editable from Settings.
- Home and Quick Add both load the same saved shortcut list.
- Shortcut preferences are persisted locally with AsyncStorage.

Implemented editable shortcut fields:

- Label
- Category
- Transaction type
- Icon
- Optional default amount

Default shortcuts:

- Food
- Ride
- Shop
- Income

Implementation plan:

- Shared shortcut model added in `finance-app/services/quickAddShortcuts.ts`.
- Defaults are available even when local storage is empty or corrupt.
- Settings has a shortcut editor for each default tile.
- Editor validates:
  - Label required.
  - Label length.
  - Category required.
  - Category length.
  - Default amount optional, positive, and capped.
- Settings includes success/error feedback and reset-to-defaults.
- Home reloads shortcuts on focus.
- Quick Add reloads shortcuts on focus.
- Shortcut default amount is passed into Quick Add when available.
- First-run setup now routes "Plan shortcuts" to Settings.

Still pending after Level 5:

- Long-press edit directly from Home shortcut tiles.
- Allow adding/removing/reordering shortcuts beyond the current default slots.
- Cloud sync of shortcut preferences if users expect settings to follow them across devices.

Potential checkpoint name:

```text
Personalize quick add shortcuts
```

## Level 6: Forms, Keyboard, And Validation

Status: implemented for the current mobile app cycle. Needs phone APK review after the next preview build.

Forms should feel hard to misuse.

Already implemented:

- Reusable `FormField`.
- Reusable `KeyboardAwareScrollView`.
- Inline validation.
- Submit buttons reveal validation instead of silently staying disabled.
- Character counters.
- Password checklist.
- Amount/category/date validations.
- Product/search limits.
- Notes length validation.
- Better keyboard behavior in latest batch.
- Add, Quick Add, AI, and Settings use the same keyboard-aware scroll wrapper.
- Budget, edit transaction, add transaction, Quick Add, AI, and shortcut editor forms now provide a warning cue on invalid submit.
- Transaction save/offline success has consistent success feedback.

Needs phone verification:

- Keyboard should not cover:
  - Auth fields
  - Add amount/category/date/notes
  - AI question field
  - Market search fields
  - Quick Add custom amount
- Submit buttons should remain reachable.
- Long forms should scroll naturally.

Potential follow-up:

- Add field-level scroll-to-active-input if real-device Android testing still shows edge cases.
- Add end-to-end real-device checks for smallest supported Android screens.

## Level 7: Motion, Microinteractions, And Success States

Status: implemented for the current mobile app cycle. Needs phone APK review after the next preview build.

The app should feel alive, but not silly. Finance apps need calm motion.

Implemented reusable motion primitives:

- `AnimatedScreen`
- `AnimatedCard`
- `PressableScale`
- `AnimatedProgressBar`
- `SuccessPulse`
- `TypingText`

Implemented interaction polish:

- Card entrance motion.
- Score/budget progress animation.
- Button press scaling.
- Haptic feedback for important actions.
- AI response typing effect.
- Quick-add success pulse/banner.
- Auth entrance animation in latest batch.
- Passive entrance/progress animations are marked non-interactive so they do not block gestures.
- Pressable scaling now stops overlapping animations and respects disabled state.
- Success banners now use the same calm entrance motion as other UI.
- First-run setup progress now uses the shared animated progress primitive.
- Shortcut editor saves/resets now show a small success pulse plus banner.

Quality rules:

- Motion should make the app feel smooth, not distracting.
- Avoid big celebration animations for routine finance actions.
- Respect reduced-motion settings.
- Use small success feedback for save/delete/sync.

Still useful:

- Phone APK review for animation pacing on low-end Android devices.
- Optional long-press shortcut edit motion after shortcut reordering exists.
- Quick transaction added toast if Home shortcuts become one-tap save actions instead of prefilled Quick Add links.

## Level 8: Graceful Degradation And Offline Use

Status: implemented for the current mobile app cycle. Needs phone APK review after the next preview build.

The app should remain useful when services fail.

Implemented:

- API errors classified as:
  - Network
  - Timeout
  - Auth
  - Rate limit
  - Backend
  - Parse
  - Unknown
- Dashboard can show cached snapshot.
- Add transaction can queue offline.
- Quick Add can queue offline.
- Offline queue count appears.
- Recent sync history appears.
- Offline saves now create visible sync-history entries.
- Home refreshes queue/history when the tab regains focus.
- Home shows a visible offline-mode notice before a queue exists.
- Add and Quick Add show offline notices before save.
- Home attempts a silent sync when connection returns.
- Manual queue sync is disabled while internet is unreachable.
- AI rate-limit messages are friendly.
- Receipt/manual fallback exists.
- Product search avoids guessing when unreliable.

Future:

- Offline edit/delete queue.
- Conflict handling.
- Background sync scheduling if production usage justifies it.
- Implemented: market/product search now distinguishes backend Gemini/Search configuration issues from temporary provider failure or no trustworthy match.
- Still needed: verify the deployed Vercel environment has `GEMINI_API_KEY` and a search-capable `GEMINI_SEARCH_MODEL` configured.

## Level 9: AI Limits And Cost Protection

Status: implemented and hardened for free daily limits.

The app stays free for now, but AI must be protected.

Implemented:

- Supabase-backed `ai_usage` table migration.
- Backend-enforced daily limits:
  - AI chat: 10/day
  - Receipt scan: 5/day
  - Product recommendation: 5/day
- Friendly HTTP 429 before Gemini is called.
- Backend now fails closed if the `ai_usage` table is missing, so Gemini is not called before usage can be checked.
- `/ai-limits` endpoint exposes current daily usage status for the signed-in user.
- AI screen shows remaining chat, market, and receipt limits before the user spends a request.
- AI screen refreshes limit status after successful chat and market calls.
- App-side limit messages for:
  - AI chat
  - Market search
  - Receipt scan

Future product-search UX fixes:

- Product field examples should use realistic names such as "sea salt hair spray" or "hair spray" instead of vague product copy.
- Product-search troubleshooting should verify the backend route, provider keys, Vercel environment variables, and deployed error logs before changing UI behavior.

Future subscription agenda:

- Do not build paid subscriptions yet.
- Only start if the app gets meaningful usage.
- Later:
  - Play Billing
  - Entitlements
  - Higher AI limits
  - Model routing
  - Abuse prevention

## Level 9B: SQL-Backed AI Insight Architecture

Status: implemented as a backend-owned SQL/RPC context layer. Needs Supabase migration applied before the deployed backend uses the new AI chat path.

The AI should not need to read every transaction row for every question. That will become slow, expensive, and noisy as users add more history.

Preferred production direction:

- Keep Gemini involved in interpreting finance context and deciding what insight is useful.
- Keep the backend in control of database access.
- Use SQL/Postgres/Supabase queries for efficient filtering and aggregation.
- Send Gemini compact query results, not the entire raw database.
- Prefer approved backend query tools over freeform AI-generated SQL.

Recommended AI insight flow:

```text
User asks finance question
-> backend authenticates user
-> backend prepares allowed analytics tools
-> Gemini identifies what information is needed
-> backend runs safe SQL-backed helper queries
-> backend returns compact results to Gemini
-> Gemini explains the insight clearly
```

Approved SQL-backed tools should include:

- `finance_monthly_rollup(user_id, months)`
- `finance_category_rollup(user_id, days, limit)`
- `finance_budget_snapshot(user_id)`
- `finance_recent_transactions(user_id, limit)`

Implemented in the SQL-backed context batch:

- Added migration `20260630110000_add_ai_insight_sql_helpers.sql`.
- Added backend-only Supabase RPC helpers:
  - `finance_monthly_rollup`
  - `finance_category_rollup`
  - `finance_budget_snapshot`
  - `finance_recent_transactions`
- RPC helpers are `security invoker`.
- RPC helpers clamp date/window limits so prompts cannot grow forever.
- RPC helper execution is revoked from `public`, `anon`, and `authenticated`.
- RPC helper execution is granted only to `service_role`.
- Added `load_ai_insight_context(user_id)` in `supabase_data.py`.
- `/ask-ai` now uses SQL-derived context in Supabase mode.
- `/ai-context` exposes the same structured context for signed-in verification without spending Gemini quota.
- Gemini receives an explicit schema and compact query results, and is told it has no database access.

If AI-generated SQL is ever used, it must be heavily restricted:

- Only allow `SELECT`.
- Always require or inject `user_id`.
- Only allow known tables and columns.
- Block `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, and RPC calls that mutate data.
- Block access to auth/system tables.
- Add row limits and query timeouts.
- Validate SQL before execution.
- Never expose the Supabase service role key to Gemini or the mobile app.

Schema context is required if Gemini helps generate or choose queries:

```text
transactions(
  id uuid,
  user_id uuid,
  amount numeric,
  category text,
  type text,
  date date,
  notes text,
  created_at timestamptz
)

budgets(
  id uuid,
  user_id uuid,
  category text,
  limit_amount numeric
)
```

Near-term implementation:

- Apply the migration to Supabase before deploying this backend path.
- Verify `/ai-context` with a signed-in mobile session.
- Keep future AI tools as approved backend helpers, not arbitrary generated SQL.
- Add more SQL helpers only when a real insight needs them.

## Level 10: Security Hardening

Status: implemented for the current backend/mobile cycle. Needs production environment review before wider beta.

Security matters extra because this is finance data.

Must do before wider beta:

- RLS verified in migrations for:
  - `transactions`
  - `budgets`
  - `ai_usage`
- User data policies scope rows with `(select auth.uid()) = user_id`.
- `service_role` key remains backend-only in `supabase_data.py`.
- Mobile uses only public Expo Supabase/API variables.
- Rotate keys that were ever pasted into chat before public release.
- Keep `.env` and `.env.local` untracked.
- Production CORS now filters accidental `*` unless explicitly enabled with `ALLOW_WILDCARD_CORS=true`.
- API responses now include conservative security headers:
  - `Cache-Control: no-store`
  - `Referrer-Policy: no-referrer`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
- Non-AI write rate limits now protect:
  - Add transaction
  - Update transaction
  - Delete transaction
  - Budget save/delete
  - CSV import commit
- Supabase advisor cleanup migration added:
  - `set_updated_at()` now pins `search_path = public`.
  - Direct table privileges are revoked from `public`, `anon`, and `authenticated`.
  - Finance tables remain backend-owned through the `service_role` path.
- Treat AI output, CSV content, receipt text, and product names as untrusted text.
- Do not render arbitrary HTML.

Still required before public release:

- Rotate any key that was ever shared outside secure deployment settings.
- Review Vercel production `CORS_ORIGINS`.
- Consider distributed rate limiting if traffic grows beyond one Vercel instance.
- Re-run Supabase advisors after the cleanup migration is applied.
- Leaked password protection is recommended but blocked on the current Supabase Free plan because HaveIBeenPwned checks require Pro and up.

## Level 11: Backend And Scaling Readiness

Status: future hardening.

Expected first bottleneck:

- Gemini quota/cost.

Second likely bottleneck:

- Vercel function limits/cold starts.

Third likely bottleneck:

- Database query efficiency as data grows.

Planned:

- Structured logs.
- Request IDs.
- `/health` monitoring.
- Uptime alerts.
- AI usage metrics.
- Index review.
- Cached AI insight outputs.
- Background jobs later if needed.

## Level 12: Mobile Convenience

Status: later.

Useful, but not before beta core UX is stable.

Future features:

- Notification quick add.
- Home screen widget.
- App shortcut/deep link into quick add.
- Share-to-app receipt capture.
- Share-to-app statement import.

Important:

- Direct bank connections are not near-term.
- Do not ask for bank credentials in the app.
- Bank connections require compliance, token security, consent, revocation, and provider support.

## Level 13: Bank Statements And Imports

Status: future.

Safer import paths before direct integrations:

- CSV statement import first.
- Later evaluate PDF parsing.
- Support templates for:
  - Nayapay
  - JazzCash
  - Other local wallets/banks
- Always show review screen before saving imported rows.
- Detect duplicates.
- Do not preserve original files unless user explicitly opts in.

## Level 14: Beta Release Readiness

Status: upcoming after UX and quick-add personalization.

Before beta:

- Fresh EAS preview build.
- Test with at least two fresh accounts.
- Full user flow:
  - Sign up
  - Login/logout
  - Google login
  - Add income
  - Add expense
  - Edit/delete transaction
  - Create/delete budget
  - CSV import/export
  - Receipt scan
  - Product recommendation
  - Product search with a realistic example such as sea salt hair spray
  - Financial score explanation and score-breakdown behavior
  - AI chat limit behavior
  - Offline add and later sync
- Edge cases:
  - Slow internet
  - No internet
  - Wrong password
  - Invalid forms
  - Empty dashboard
  - Invalid CSV
  - Unclear receipt
  - Logout/access behavior
- Run validation:

```powershell
python -m py_compile backend.py supabase_data.py ai_usage.py
cd "C:\Users\User\OneDrive\Desktop\Finance Tracker Project\finance-app"
npx tsc --noEmit
npm run lint
```

- Create GitHub release tag.
- Keep previous working APK/build link for rollback.
- Confirm latest Vercel deployment is green.

Not needed for first beta:

- Paid subscriptions.
- Direct bank connections.
- Home screen widget.
- Notification quick add.
- Marketing site.
- Advanced analytics dashboards.

## Currency And Premium Direction

Status: free baseline implemented for PKR and USD display currency. True multi-currency remains a premium-ready future feature.

Free baseline:

- Settings includes a default currency choice:
  - PKR
  - USD
- Home, Analysis, Add, Quick Add, AI market results, onboarding preview tiles, budgets, and transaction rows display amounts using the selected currency.
- Market search receives the selected display currency so prompts and result text do not assume PKR.
- No exchange-rate conversion happens yet. Existing numeric transaction values are only reformatted.

Premium future:

- True multi-currency transaction entry.
- Store original amount, original currency, home currency, converted amount, exchange rate, and exchange-rate date.
- Dashboard totals use converted home-currency amounts.
- Transaction detail shows both original and converted values.
- Save the exchange rate used at transaction time so old reports do not change randomly.
- Pair premium multi-currency with higher AI limits, deeper AI monthly reports, smarter budgets, recurring-payment detection, and richer receipt/product analysis.

## Onboarding Preference Setup

Status: implemented for the first-run local preference step before auth.

Implemented:

- First-run onboarding asks for default display currency:
  - PKR
  - USD
- First-run onboarding asks for theme:
  - Light
  - Dark
- The step appears before the auth welcome screen and is saved locally.
- Settings remains the place to change both preferences later.

Evaluation:

- Good first-run questions:
  - Currency, because it changes every amount in the app.
  - Theme, because it affects readability and comfort.
- Better after login/account creation:
  - Name/profile, because it belongs to the account.
  - First income, first expense, and first budget, because they become real financial data.
  - Primary goal such as saving, reducing spending, or tracking subscriptions, because it can personalize future AI guidance.
- Avoid asking too much before auth. The first launch should feel like setup, not a survey.

## Current Immediate Agenda

### Step 1: Current Quality Batch

Status: implemented in `Explain score and harden AI search diagnostics`.

- Replaced Supabase auth session persistence that triggered the Expo SecureStore 2048-byte warning.
- Made the Financial Score card explain itself inside the Analysis tab.
- Improved market/product search failure messages so config/provider issues are obvious instead of vague.
- Updated this roadmap with the current agenda.
- Validated mobile and backend.
- Pushed a checkpoint.

Potential commit:

```text
Explain score and harden AI search diagnostics
```

### Step 2: Emulator QA

Check:

- First-run onboarding asks for PKR/USD and Light/Dark before the auth welcome step.
- Settings can switch default currency between PKR and USD.
- Amounts across Home, Analysis, Add, Quick Add, AI, and auth preview tiles use the selected display currency.
- Market search text does not hardcode PKR when USD is selected.
- Transaction saves, edits, deletes, budget changes, and offline sync success show a small green floating confirmation with a tick.
- App opens without the SecureStore warning repeating after a fresh login.
- Auth welcome text animates visibly and does not pop in.
- Login/signup still works.
- First-run setup appears after login when essentials are unfinished.
- Financial Score card opens the explanation dialog.
- Product search uses realistic examples such as sea salt hair spray.
- Product search clearly says whether the backend/search provider is unavailable.
- AI chat still works when limits/config allow it.

### Step 3: Visual And Dashboard Follow-Ups

- Verify the new light/dark palette feels like the same product in both modes.
- Confirm old orange/brown branding is gone except for warnings/caution states.
- Add the Home trend widgets:
  - 7-day and 30-day selector.
  - Income/spend movement such as "+20% vs last 7 days" only when the data supports it.
  - Small chart that helps scanning without crowding Home.
- Decide whether a category donut/bar chart belongs in Analysis after emulator review.

### Step 4: EAS Preview Build

- Create a fresh Android preview APK after emulator QA passes.
- Install on phone.
- Confirm the emulator fixes are present on real device.
- Run a final phone UX review for keyboard, nav overlap, auth, setup, AI, Add, and Settings.

## Quality Bar

The app should feel:

- Private.
- Fast enough.
- Calm.
- Friendly.
- Useful with no data.
- Useful with bad internet.
- Clear when AI is unavailable.
- Easy to start.
- Easy to return to daily.

The big product idea:

> The user should not feel like they are maintaining a spreadsheet. They should feel like they are building a clear picture of their money, one small action at a time.
