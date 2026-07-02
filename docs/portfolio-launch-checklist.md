# Portfolio Launch Checklist

This checklist is for the GitHub, demo video, and LinkedIn launch before the later Play Store release.

## A. Needed Before LinkedIn Post

### README

- [ ] Confirm README title, description, status, and roadmap read cleanly.
- [ ] Add final screenshots to `docs/screenshots/`.
- [ ] Add demo video link once recorded.
- [ ] Confirm no Play Store/live-store claims are made before release.
- [ ] Confirm the AI assistant is described accurately as Gemini-powered through the backend.

### Screenshots

- [ ] Capture login/onboarding.
- [ ] Capture dashboard.
- [ ] Capture add transaction.
- [ ] Capture budgets.
- [ ] Capture AI assistant.
- [ ] Capture settings.
- [ ] Avoid screenshots with errors, keyboard overlap, or weak empty states.

### Demo Video

- [ ] Prepare a test account with sample data.
- [ ] Warm up the backend before recording.
- [ ] Record app launch and login.
- [ ] Show dashboard overview.
- [ ] Add a transaction and show success feedback.
- [ ] Show budget progress.
- [ ] Ask the AI assistant one prepared question.
- [ ] End on the GitHub README/tech stack.
- [ ] Keep final video to 60-90 seconds.

### GitHub Public Repo

- [ ] Confirm `.env` and `.env.local` files are ignored.
- [ ] Confirm no APK, AAB, keystore, or debug log is committed.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are not committed.
- [ ] Confirm README links resolve.
- [ ] Confirm setup instructions are understandable.

### LinkedIn Launch

- [ ] Use wording: "Mobile app complete. Play Store release planned."
- [ ] Mention Expo React Native, FastAPI, Supabase, and Gemini AI.
- [ ] Include the GitHub link.
- [ ] Include the demo video.
- [ ] Highlight security/user isolation at a high level.
- [ ] Avoid downplaying the app or implying it is already published on the Play Store before release.

## B. Needed Before Play Store

- [ ] Host a public privacy policy URL.
- [ ] Add in-app privacy policy access.
- [ ] Add account deletion flow.
- [ ] Add full data deletion flow or clear deletion request process that meets store policy.
- [ ] Prepare Google Play Data Safety form.
- [ ] Finalize app screenshots and feature graphic.
- [ ] Build production Android AAB through EAS.
- [ ] Complete final physical device QA.
- [ ] Confirm package name, versioning, signing, and release track.

## C. Nice-To-Have Polish

- [ ] Add dedicated transaction history screen.
- [ ] Add category/date drill-downs from Analysis to transaction history.
- [ ] Add a seeded sample-data path for demos.
- [ ] Add a short architecture diagram image to README.
- [ ] Add a short security model diagram to README.
- [ ] Add a second screenshot set for dark mode.
- [ ] Add stronger global AI quota controls for public signups.
