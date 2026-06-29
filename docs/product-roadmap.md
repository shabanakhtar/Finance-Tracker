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

- `Polish first run setup flow`

Recent important commits:

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

4. `First-run setup polish`
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

Next quality pass:

- Test on actual phone screen size.
- Confirm first/last name fields are not cropped in signup.
- Confirm password checklist appears only when the password field is focused or has typed input.
- Confirm keyboard does not hide password/name fields.
- Confirm compact-screen auth spacing feels calm and not cramped.
- Confirm mode switching does not leave stale validation messages behind.
- Consider making auth more onboarding-like after the APK review:
  - One or two screen intro.
  - Gentle finance illustration or motion.
  - Smooth switch between login and create account.

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
- Home is lighter and more focused:
  - Balance
  - Net cash flow
  - Income/spent summary
  - Quick add
  - First-run setup prompt
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
- First-run snapshot prompt is now skippable.
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
- First-run setup now shows essentials progress instead of feeling like a static poster.
- Setup progress tracks income, expense, and budget completion.
- Setup steps show completed states with check icons.
- Setup now stays visible until income, expense, and one budget exist, unless the user skips it.
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

## Level 4: First-Run Setup And Onboarding

Status: implemented for the current mobile app cycle. Needs phone APK review after the next preview build.

This is where the app starts feeling personal.

The first-run flow should not lecture the user. It should help them get to their first useful money snapshot quickly.

Current implemented setup behavior:

- First-run setup appears while the essentials are incomplete:
  - Add income.
  - Add expense.
  - Set one budget.
- Setup hides once those essentials exist.
- Setup can be skipped and the skip state is persisted locally.
- Setup can be restored from Settings if the user skipped too early.
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

Status: next coding batch.

Quick Add is the daily-use feature. It should become personal.

Current state:

- Quick add modal exists.
- Home quick-add shortcuts exist.
- Success states already exist for saving transactions in the quick-add flow.
- Shortcuts are still fixed defaults.

Desired editable shortcut fields:

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

1. Create quick-add shortcut model.
2. Store preferences locally first with AsyncStorage.
3. Load shortcuts on Home and Quick Add.
4. Add shortcut editor UI:
   - Could live in Settings first.
   - Later can support long-press edit on shortcut tile.
5. Validate shortcut fields:
   - Label required.
   - Category required.
   - Type must be income or expense.
   - Default amount optional but must be positive if present.
6. Add success feedback:
   - Shortcut updated.
   - Quick transaction added.
   - Offline quick transaction queued.
7. Push as its own GitHub checkpoint.

Potential checkpoint name:

```text
Personalize quick add shortcuts
```

## Level 6: Forms, Keyboard, And Validation

Status: mostly implemented, needs real-device testing.

Forms should feel hard to misuse.

Already implemented:

- Reusable `FormField`.
- Inline validation.
- Required fields disabled until valid.
- Character counters.
- Password checklist.
- Amount/category/date validations.
- Product/search limits.
- Notes length validation.
- Better keyboard behavior in latest batch.

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

- Add scroll-to-active-input behavior if normal `KeyboardAvoidingView` is not enough on Android.

## Level 7: Motion, Microinteractions, And Success States

Status: good foundation exists.

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

Quality rules:

- Motion should make the app feel smooth, not distracting.
- Avoid big celebration animations for routine finance actions.
- Respect reduced-motion settings.
- Use small success feedback for save/delete/sync.

Still useful:

- Better first-run setup completion animation.
- Shortcut edit success toast.
- Quick transaction added toast from Home shortcut.

## Level 8: Graceful Degradation And Offline Use

Status: strong foundation exists.

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
- AI rate-limit messages are friendly.
- Receipt/manual fallback exists.
- Product search avoids guessing when unreliable.

Future:

- Offline edit/delete queue.
- Conflict handling.
- More visible sync status.

## Level 9: AI Limits And Cost Protection

Status: implemented for free daily limits.

The app stays free for now, but AI must be protected.

Implemented:

- Supabase-backed `ai_usage` table migration.
- Backend-enforced daily limits:
  - AI chat: 10/day
  - Receipt scan: 5/day
  - Product recommendation: 5/day
- Friendly HTTP 429 before Gemini is called.
- App-side limit messages for:
  - AI chat
  - Market search
  - Receipt scan

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

Status: planned before AI insights become more advanced.

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

- `get_summary(user_id, date_range)`
- `get_monthly_cashflow(user_id, months)`
- `get_top_expense_categories(user_id, start_date, end_date)`
- `get_budget_status(user_id)`
- `get_recent_large_transactions(user_id, threshold, date_range)`
- `get_category_trend(user_id, category, months)`
- `get_recurring_candidates(user_id)`
- `get_spending_change(user_id, current_period, comparison_period)`

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

- Keep the current safe approach where backend loads user data and sends structured summaries to Gemini.
- Move expensive analytics toward SQL-backed helper functions.
- Add date-range limits so AI prompts do not grow forever.
- Feed Gemini a structured finance context with query results, warnings, and budget status.
- Do not give Gemini unrestricted database access.

## Level 10: Security Hardening

Status: before beta/public expansion.

Security matters extra because this is finance data.

Must do before wider beta:

- Verify RLS on every exposed user-data table.
- Verify users can only read/write their own rows.
- Keep `service_role` key backend-only.
- Rotate keys that were ever pasted into chat before public release.
- Keep `.env` and `.env.local` untracked.
- Review production CORS.
- Add non-AI rate limits for write-heavy endpoints.
- Treat AI output, CSV content, receipt text, and product names as untrusted text.
- Do not render arbitrary HTML.

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

## Current Immediate Agenda

### Step 1: Build And Test APK

- Create fresh EAS Android preview build.
- Install on phone.
- Confirm latest Level 1 through Level 4 UI is present.

### Step 2: Phone UX Review

Check:

- Auth field cropping.
- Auth first impression and mode-specific copy.
- Password checklist behavior.
- Keyboard overlap.
- Floating nav overlap.
- Floating nav keyboard-hide behavior.
- Analysis tab.
- Home Today focus card.
- First-run setup progress behavior.
- Recent transaction preview length.
- First-run setup skip.
- Settings setup restore action.
- Settings bottom content.
- Add form submit button visibility.

### Step 3: Push UX Batch 2

If APK review finds issues:

- Fix them.
- Run validation.
- Commit.
- Push checkpoint.

Potential commit:

```text
Polish phone UX after preview build
```

### Step 4: Level 4 First-Run Setup Polish

- Guided active step.
- Essential setup states.
- Optional setup actions.
- Settings restore action.
- Validate.
- Push checkpoint.

Potential commit:

```text
Polish first run setup flow
```

### Step 5: Quick Add Personalization

- Implement shortcut editor.
- Store locally.
- Add success states.
- Validate.
- Push checkpoint.

Potential commit:

```text
Personalize quick add shortcuts
```

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
