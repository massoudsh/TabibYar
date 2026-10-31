# TabibYar: issue drafts (glass UI/UX, features, improvements)

Repo: https://github.com/massoudsh/TabibYar

16 issues, each with a title, labels and a body written so an AI agent can pick it up cold: context with real file paths, tasks, acceptance criteria. Bodies are in English for agent reliability; every user-facing string in the product stays Persian.

How to use:
- Each issue starts with `## ISSUE`, then `Title:`, `Labels:` and `Body:` lines. Copy by hand or split on `## ISSUE` for a script (for example `gh issue create --title ... --label ... --body-file ...`).
- Create **T16 (epic)** last, then replace the `T01`...`T15` references in its checklist with the real issue numbers.
- New labels used: `ui`, `ux`, `agent-ready`. Existing: `feature`, `infra`, `security`, `epic`, `p0`, `p1`, `p2`.

Findings these issues are based on (all verified in the repo):
- `app/public/css/style.css` has two `:root` blocks and about 50 override rules appended at the end; it also loads Vazirmatn from Google Fonts via `@import`.
- `visit-new.ejs` says voice input is "in the next version"; `visit-review.ejs` tells the doctor to refresh the page while the draft is processing; medications and follow-ups are edited as pipe-delimited textareas.
- `app/src/app.js` has no security headers, no CSRF protection, a hand-rolled cookie parser, and a `/health` route that always returns ok. `POST /login` has no rate limiting. Express 4 does not forward errors from async handlers.
- No Dockerfile or CI exists. `uploads/` contains a committed screenshot. A `.gitmodules` file exists.

---

## ISSUE T01

Title: refactor(css): consolidate style.css into one token-based stylesheet and self-host Vazirmatn

Labels: ui, infra, p1, agent-ready

Body:

## Context
`app/public/css/style.css` ends with a second `:root` block and about 50 override rules appended after the "ریسپانسیو" section. They redefine tokens already declared at the top (`--color-primary` `#1a7f5a` → `#087f73`, `--radius` 10px → 16px, `main` max-width 760px → 1120px, plus `.app-header`, `.brand`, `button`). Cascade order now decides what you see, so edits in the top half often do nothing.

The file also starts with `@import url('https://fonts.googleapis.com/...')`. That blocks first paint, fails on slow or restricted networks, and sends a third-party request from a clinical app.

This is the prerequisite for the glass redesign (see the epic).

## Tasks
1. Merge both `:root` blocks into one and delete overridden or dead declarations. Output must look identical (compare screenshots before/after at 375, 768 and 1280 px).
2. Add tokens for spacing, radius, shadow, z-index, blur and motion (duration, easing).
3. Replace remaining hard-coded colors (`#fbfdfc`, `#f7f7f8`, `#fafafe`, `#edf2f2`, `#a8c9bd`, ...) with tokens.
4. Self-host Vazirmatn (400/500/600/700, woff2, OFL license) in `app/public/fonts/`; use `@font-face` with `font-display: swap`; remove the `@import`.
5. Group rules in labelled sections: tokens, base, layout, components, pages, utilities. Multiple files are fine only if every view (or `views/partials/header.ejs`) is updated to link them.
6. Move any inline `style=` or `<script>` leftovers into CSS/JS files (needed for a strict CSP, see the security issue).

## Acceptance criteria
- [ ] Exactly one `:root` block; no rule is overridden later in the same file
- [ ] No request to a third-party host on any page (DevTools, Network tab)
- [ ] No visual diff at the three widths
- [ ] `cd app && npm test` passes

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties (`margin-inline-start`, never left/right); the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T02

Title: feat(ui): glass design system (tokens, primitives, fallbacks, dark mode)

Labels: ui, feature, p1, agent-ready

Body:

## Context
The current look is flat white cards on a pale teal gradient. Goal: a modern glassmorphism language (frosted translucent surfaces, soft highlights, layered depth) that stays readable for clinicians who use the app all day. Depends on the CSS consolidation issue (T01).

## Tokens to add
```css
--glass-bg: rgba(255,255,255,.55);
--glass-bg-strong: rgba(255,255,255,.72);
--glass-border: rgba(255,255,255,.65);
--glass-highlight: inset 0 1px 0 rgba(255,255,255,.7);
--glass-shadow: 0 8px 32px rgba(18,48,71,.10);
--glass-blur: 18px;
--glass-saturate: 160%;
```
Provide matching dark-mode values.

## Tasks
1. Primitives: `.glass`, `.glass-strong`, `.glass-interactive` (hover lift + brighter border), `.glass-inset` (inputs, textareas, selects).
2. Restyle buttons (primary: teal with a subtle gloss and glow; secondary: glass), badges/status chips, focus rings, `details/summary`, alert boxes (`.disclaimer`, `.warning-box`, `.changes-box`, `.rag-box`) as tinted glass. Alert boxes must stay clearly distinguishable by more than color.
3. Fallbacks: `@supports not (backdrop-filter: blur(1px))` falls back to a solid surface at about .92 alpha; `prefers-reduced-transparency: reduce` gives solid surfaces; `prefers-contrast: more` gives stronger borders; `prefers-reduced-motion: reduce` disables transitions and drift animations.
4. Dark mode via `prefers-color-scheme: dark` (deep navy-teal base). Optional manual toggle in the header, stored in `localStorage` (no personal data).
5. Performance: no more than about 6 `backdrop-filter` elements per viewport; do not apply it to every row of a long list; check scroll smoothness on a low-end Android device or with 6x CPU throttling.
6. Docs: write `docs/design/glass-design-system.md` (tokens, do/don't, contrast table) and add a dev-only `/styleguide` route that renders every primitive so an agent or human can verify the result visually.

## Acceptance criteria
- [ ] Text on any glass surface keeps at least 4.5:1 contrast (3:1 for large text) over the worst-case background in the styleguide
- [ ] Looks correct with `backdrop-filter` disabled, with reduced transparency, and in dark mode
- [ ] `/styleguide` is only mounted when `NODE_ENV !== 'production'`
- [ ] No third-party assets; no JS framework

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T03

Title: feat(ui): glass app shell (ambient background, floating header, mobile tab bar, login)

Labels: ui, feature, p1, agent-ready

Body:

## Context
`views/partials/header.ejs` renders a flat top bar and every page sits in a white `main` card. Mobile users get a horizontally scrolling nav row. Build the shell that all other pages inherit. Depends on T01 and T02.

## Tasks
1. Ambient background: fixed layered radial/conic gradient blobs (teal, deep blue, soft violet for the AI assistant) behind everything, CSS only, `position: fixed; inset: 0; z-index: -1`. Slow drift animation allowed, disabled under `prefers-reduced-motion`.
2. Floating glass header: sticky, inset from the edges, rounded, with an inline SVG logo mark replacing the letter badge. Active nav item uses `aria-current="page"` and a visible active style.
3. Mobile (under 640px): replace the scrolling nav with a bottom glass tab bar (Dashboard, Patients, New visit, Follow-ups, More). Respect `env(safe-area-inset-bottom)`; touch targets at least 44px.
4. `main` becomes a layout container; pages compose `.glass` cards instead of one big white card.
5. Login page (`views/login.ejs`): centered glass card over the ambient background, same typography, clear error state, `autocomplete` attributes on the fields.
6. Keep the existing disclaimer visible on pages that show AI output.

## Acceptance criteria
- [ ] Header and tab bar correct at 375, 768 and 1280 px; nothing overlaps content or the iOS home indicator
- [ ] Keyboard focus is visible on every nav item and reaches the tab bar in logical order
- [ ] Background animation is off under `prefers-reduced-motion`
- [ ] No layout shift when fonts load

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T04

Title: feat(ui): glass dashboard, lists and patient timeline

Labels: ui, feature, p2, agent-ready

Body:

## Context
Pages: `dashboard.ejs`, `analytics.ejs`, `follow-ups.ejs`, `patients-list.ejs`, `patient-history.ejs`, `patient-new.ejs`. They use the older card and list styles. Apply the glass system (T02) and add the missing states. The README promises "symptom trend across visits"; today `patient-history.ejs` is a plain list.

## Tasks
1. Dashboard: summary cards as `.glass-interactive`; gentle count-up on numbers (skipped under reduced motion); the primary card keeps its teal gradient.
2. Empty states: small inline SVG illustration, one sentence, one primary action (for example "no patients yet, add the first patient").
3. Loading: skeleton shimmer placeholders for list pages when data is fetched client-side.
4. Patient history as a vertical timeline: one glass node per visit with date, status chip, one-line summary, and recurring complaints highlighted (data already comes from `src/services/followup.js`). Keep the "changes since previous visit" summary at the top.
5. Follow-up rows: overdue/today/upcoming grouping, with the "mark complete" action and an undo toast.
6. Lists: add pagination or "load more" at 20+ rows; search keeps its state in the URL query.
7. `analytics.ejs` metric cards: add help text and a clear "no data yet" state.

## Acceptance criteria
- [ ] Every page has designed empty, loading and error states
- [ ] Timeline works with 0, 1 and 50 visits without layout problems
- [ ] No page needs horizontal scrolling at 375 px
- [ ] Tests cover any new server logic (grouping, pagination)

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T05

Title: feat(ux): redesign the visit review page (split view, per-field status, sticky action bar)

Labels: ui, ux, feature, p0, agent-ready

Body:

## Context
`views/visit-review.ejs` is the core screen: the physician reviews the AI draft and approves it. Today it is a single column of eight textareas. Problems:
- AI draft text and physician edits look identical.
- "Missing or ambiguous" warnings sit in a box far from the fields they refer to.
- The raw input is hidden in a collapsed `<details>`.
- The RAG insights and the "ask the assistant" box are at the bottom, below the approve button.
- While the draft is being produced the page just says to refresh (see T08).

Related code: `public/js/review.js`, `public/js/rag-assistant.js`, `src/routes/visits.routes.js`.

## Tasks
1. Desktop layout: two panes. Left, sticky: raw physician input, "changes since previous visit", and a tabbed assistant panel (RAG insights and ask box). Right: the draft as section cards.
2. Each field card: Persian label plus a small English key, auto-growing textarea, and a state chip: «پیش‌نویس هوش مصنوعی» / «ویرایش‌شده توسط پزشک» / «نیازمند تکمیل». Show a "revert to AI draft" action on edited fields.
3. Link each `missing_or_ambiguous` item to its field (highlight the field and scroll to it) while keeping the summary list at the top.
4. Keep the differential-diagnosis field visibly marked as a draft with its disclaimer; do not make it look final.
5. Sticky glass action bar at the bottom: "Save edits" (shows "saved at HH:MM" or an unsaved dot) and "Approve". Approve opens a confirmation dialog that summarises what will become final and what the patient will receive; it is the only path to approval.
6. Warn before leaving with unsaved changes; add `Ctrl/Cmd+S` to save. Do not bind Approve to a single keystroke.
7. Mobile: panes stack; action bar stays reachable above the tab bar.
8. Proposal (needs maintainer decision, do not implement without it): require every ambiguous item to be acknowledged before Approve is enabled, enforced server-side as well.

## Acceptance criteria
- [ ] A physician can see at a glance which fields are untouched AI output
- [ ] Approval is impossible without the explicit confirmation step; AI output is never marked final automatically
- [ ] Existing audit-log entries for save/approve are unchanged
- [ ] Works at 375 and 1280 px; keyboard-only flow works end to end
- [ ] Tests cover any changed server behavior

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T06

Title: feat(ux): structured medication and follow-up editors (replace pipe-delimited textareas)

Labels: ux, feature, p1, agent-ready

Body:

## Context
In `views/visit-review.ejs` medications are edited as one line per drug in the form `نام | دوز | دستور مصرف`, and follow-ups as `description | due_hint`. A stray `|` or a missing separator silently changes the data, and the format is invisible to users who did not read the label. Parsing lives in `public/js/review.js` and the save route in `src/routes/visits.routes.js`.

## Tasks
1. Medications: repeatable rows with three inputs (name, dose, instructions), add/remove row buttons, and keyboard support (Enter adds a row from the last field).
2. Follow-ups: repeatable rows with description and a due hint; keep the free-text hint, and optionally add a date picker (Jalali display, see the Jalali issue).
3. Warnings, differential diagnosis items and other one-per-line fields stay as textareas but get the hint "one per line".
4. Submit as structured JSON; the server validates against `src/schemas/structuredNote.schema.json` (ajv) and rejects malformed data with a Persian error shown inline.
5. Keep backward compatibility for visits already saved.
6. Add unit tests for the parse/serialize logic that now lives on the server or in a shared helper.

## Acceptance criteria
- [ ] No pipe-delimited parsing remains in the UI
- [ ] Data containing `|`, commas, newlines or Persian/Arabic digits round-trips unchanged
- [ ] Invalid input shows a field-level error, never a silent drop
- [ ] Existing visits open and save correctly

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T07

Title: feat(ux): voice-first visit capture UI (record in browser, review transcript, then submit)

Labels: ui, ux, feature, p1, agent-ready

Body:

## Context
`views/visit-new.ejs` is text only and states that voice input arrives in a later version. The self-hosted STT service (`stt-service/`, Persian Whisper) and the adapter contract (`src/services/sttAdapter.js`, `STT_PROVIDER=http`) already exist. Real-world accuracy testing is still open (issue #2), so the UI must always keep the physician in the loop.

## Tasks
1. Glass recorder card: record / pause / resume / stop, timer, live level meter (Web Audio `AnalyserNode`), and clear permission and error messages in Persian.
2. Use `MediaRecorder` with feature detection (webm/opus on Chromium and Firefox, mp4/aac on iOS Safari); fall back to a file upload button.
3. Add an authenticated endpoint (for example `POST /visits/transcribe`) that accepts audio with a size and duration limit, calls the STT adapter, and returns the transcript text. Audit-log the call.
4. Put the transcript into the existing `raw_input` textarea for editing before the visit is submitted; show a note that the transcript may contain errors.
5. Audio retention: do not store audio after transcription unless the data-residency/legal review (issue #19) allows it. Delete temporary files in a `finally` block. Document the behavior in `app/README.md`.
6. Works with `STT_PROVIDER=mock` so it is testable without the real service.
7. Tests: endpoint validation (size, mime type, auth), adapter called once, temp file removed.

## Acceptance criteria
- [ ] Recording to editable transcript works on desktop Chrome and mobile Safari with the mock provider
- [ ] No audio file remains on disk after the request finishes, including on errors
- [ ] A visit cannot be created directly from audio without the physician seeing the transcript first
- [ ] Unsupported browsers see the upload fallback, not a broken button

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T08

Title: feat(ux): live draft status, toasts and failure/retry states (no more "refresh the page")

Labels: ux, feature, p1, agent-ready

Body:

## Context
When a draft is not ready, `views/visit-review.ejs` prints "the draft is still processing, refresh the page". The queue (`src/services/queue.js`, `jobs` table, `queueWorker.js`) knows the job state, but the UI never shows it. If a job fails the physician sees nothing useful.

## Tasks
1. Add `GET /visits/:id/status` returning JSON such as `{ status, job_state, error_code }` (authenticated, scoped to the physician's own clinic; never include clinical text).
2. On the review page poll with backoff (2s, 4s, 8s, max 15s), pause while the tab is hidden, and replace the content in place when ready.
3. Show a step indicator: received, structuring, assistant notes, ready. Use an `aria-live="polite"` region.
4. Failure state: a clear Persian message and a retry button that re-enqueues the job (new route, audit-logged, rate-limited).
5. Toast component (glass) for save, approve, SMS sent and errors; replace any `alert()` calls in `public/js/*.js`.
6. Skeleton placeholders instead of a blank page while waiting.
7. Tests for the status route (auth, clinic scoping, each job state) and the retry route.

## Acceptance criteria
- [ ] Draft appears without a manual refresh
- [ ] A failed job shows an error and a working retry
- [ ] Polling stops when the draft is ready or the tab is closed
- [ ] Status route leaks no data across clinics

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T09

Title: a11y: accessibility, RTL and keyboard audit of the web client

Labels: ux, ui, p1, agent-ready

Body:

## Context
Glass surfaces are the usual place accessibility regresses (low contrast, invisible focus). This issue audits and fixes the whole client after the redesign work, and adds an automated check so it stays fixed.

## Tasks
1. Add a skip-to-content link, proper landmarks (`header`, `nav`, `main`), and a unique `<title>` per page (already Persian; verify).
2. Visible `:focus-visible` rings on every interactive element, including cards used as links.
3. Check color contrast on all glass states (default, hover, disabled, dark mode) against WCAG 2.2 AA.
4. Form labels, `autocomplete`, `inputmode` (for phone and numeric fields), and error messages tied to inputs with `aria-describedby`.
5. Status chips and alerts must not rely on color alone (add icon or text).
6. `aria-live` for toasts and status updates; dialogs trap focus and restore it on close.
7. RTL audit: replace any physical `left/right` property with logical ones; check icons that imply direction (arrows, chevrons) and mixed Persian/Latin text (`dir="auto"` on user-entered fields, `<bdi>` for names and phone numbers).
8. Add an automated check (axe-core with a small Node script or Playwright) that runs against the main pages and fails CI on serious violations. It must work without a bundler.

## Acceptance criteria
- [ ] Axe reports no serious or critical violations on login, dashboard, patients, visit new, visit review, follow-ups
- [ ] Whole flow (login, new visit, review, approve) is usable with keyboard only
- [ ] No physical left/right in the CSS except where intentionally documented

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T10

Title: feat(i18n): Jalali dates and Persian/Arabic numeral normalization

Labels: feature, p1, agent-ready

Body:

## Context
Doctors write dates and numbers in Persian, Arabic-Indic or Latin digits and refer to Jalali dates and relative times ("هفته بعد", "۲ ماه دیگر"). Timestamps in the UI should be Jalali. This was also listed in the hardening roadmap issue (#31).

## Tasks
1. Add `app/src/lib/locale.js` with: `normalizeDigits(str)` (Persian/Arabic-Indic to Latin), `toJalaliString(date, opts)` via `Intl.DateTimeFormat('fa-IR-u-ca-persian')`, and a Jalali-to-Gregorian converter for input.
2. Apply `normalizeDigits` at input boundaries: phone numbers (login, patient creation, search), national ID before encryption, and the raw visit text passed to the structuring pipeline. Do not change what is displayed back to the physician.
3. Show Jalali dates (with Persian digits) everywhere in the views; store UTC in the database as today.
4. Parse common relative follow-up hints into a suggested due date (for example "هفتهٔ بعد", "۲ هفته دیگر", "یک ماه بعد") and show it as a suggestion the physician can edit; never auto-schedule messages from it.
5. Tests: digit normalization (mixed scripts, edge cases), Jalali formatting, leap-year boundaries, relative hint parsing.

## Acceptance criteria
- [ ] Searching a patient by phone works whether the digits are Persian, Arabic-Indic or Latin
- [ ] All dates in the UI are Jalali; the database format is unchanged
- [ ] Relative hint suggestions are editable and clearly marked as suggestions
- [ ] Tests pass without network access

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T11

Title: infra(docker): Docker as the primary install method (app, worker, Postgres, optional STT), manual install as the alternative

Labels: infra, p1, agent-ready

Body:

## Context
Today the only way to run the project is the manual flow in `app/README.md` (Postgres, `.env`, migrate, seed, two terminals). There is no Dockerfile. Goal: `docker compose up` is the main way to install, and the manual steps remain documented as the alternative.

## Tasks
1. `app/Dockerfile`: multi-stage, pinned Node LTS image, `npm ci --omit=dev`, runs as a non-root user, `HEALTHCHECK` calling the health route, no secrets baked in.
2. `stt-service/Dockerfile`: slim Python image, model cache on a named volume, CPU by default with a documented GPU variant.
3. Root `docker-compose.yml` with services: `db` (Postgres with volume and healthcheck), `migrate` (one-shot, runs `npm run migrate`), `app`, `worker` (same image, command `npm run worker`), and `stt` behind a compose profile (`--profile stt`).
4. `.dockerignore` for both images (exclude `node_modules`, `.env`, `uploads/`, tests, docs).
5. Root `.env.example` listing every variable compose needs, with instructions to generate `JWT_SECRET` and `ENCRYPTION_KEY` (check `src/lib/crypto.js` for the required format). Compose must fail fast with a clear message when required secrets are missing.
6. First-run seeding: document `docker compose run --rm app npm run seed` with `ADMIN_PHONE` and `ADMIN_PASSWORD`.
7. Persistence: volumes for Postgres data and for any runtime uploads directory; nothing with patient data is written into the image.
8. README restructure: "Quick start (Docker)" first, "Manual install" second, both in Persian with English command blocks. Update `app/README.md` and `stt-service/README.md` accordingly.
9. CI (see T12): build both images on every PR; optionally publish to GHCR on tags.

## Acceptance criteria
- [ ] On a clean machine with only Docker, `cp .env.example .env`, filling secrets, `docker compose up` brings up a working login page
- [ ] Worker processes a visit end to end with `mock` providers inside compose
- [ ] Containers run as non-root; `docker compose config` shows no hard-coded secrets
- [ ] The manual install instructions still work and are documented as the alternative

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T12

Title: chore(agents): AGENTS.md, CI pipeline, templates and repo hygiene so AI agents can contribute safely

Labels: infra, p0, agent-ready

Body:

## Context
There is no CI, no linter, no contributor guide and no issue/PR templates, so an agent (or a new human) cannot tell what "done" means. This overlaps the checklist in the roadmap issue (#31); close those items here.

## Tasks
1. `AGENTS.md` at the repo root (and a `CLAUDE.md` that points to it): commands (install, migrate, seed, dev, worker, test, lint), architecture map with file paths (reuse the issue-to-code table in `app/README.md`), the ground rules below, definition of done, and a **do not change without maintainer review** list: `src/lib/disclaimers.js` texts (consent and disclaimers), `src/lib/crypto.js`, existing migrations (add new ones, never edit), and the `REFUSAL_KEYWORDS` in `src/services/rag/ragAgent.js`.
2. `.github/ISSUE_TEMPLATE/agent-task.yml` (context, files, tasks, acceptance criteria) and `.github/pull_request_template.md` (checklist: tests, RTL check, screenshots for UI changes, red-line confirmation).
3. `.github/workflows/ci.yml`: Node pinned, `npm ci`, lint, `npm test`, Docker image build; plus gitleaks, CodeQL and Dependabot configuration.
4. ESLint + Prettier config and an `npm run lint` script; fix or suppress existing findings in the same PR with justification.
5. Add `app/tests` coverage reporting (Node's built-in `--experimental-test-coverage` is enough) and a minimum threshold only after measuring the baseline.
6. Repo hygiene: audit `uploads/` (a committed `.png` screenshot is there): confirm it contains no patient data, then move it to `docs/` or remove it, and gitignore `uploads/` with a `.gitkeep`. Audit `.gitmodules` and document or remove the submodule. Add a license (the README badge says TBD).
7. Optional: Playwright screenshot job that uploads page screenshots as CI artifacts so agents and reviewers can verify UI changes.

## Acceptance criteria
- [ ] A fresh clone passes `npm ci && npm run lint && npm test` in CI without manual steps
- [ ] An agent reading only `AGENTS.md` can run the project and knows which files are off-limits
- [ ] No secrets or patient data in the repository or its history that need rotating (report if found, do not paste values into the issue)

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T13

Title: security: headers and CSP, CSRF protection, login rate limiting, config validation

Labels: security, p0, agent-ready

Body:

## Context
This app handles health data. Findings in the current code:
- `app/src/app.js` sets no security headers and no CSP.
- `views/visit-new.ejs` embeds templates with `const templates = <%- JSON.stringify(templates) %>`. The unescaped output is a script-injection risk if a template ever contains `</script>`, and an inline script blocks a strict CSP.
- State-changing routes rely only on the `SameSite=lax` cookie; there are no CSRF tokens (forms and the `fetch` calls in `public/js/review.js` and `rag-assistant.js`).
- `POST /login` in `src/routes/auth.routes.js` has no rate limit or lockout.
- `simpleCookieParser` in `app.js` calls `decodeURIComponent` without a try/catch, so a malformed cookie (for example `a=%`) throws on every request.
- `express.json()` and `express.urlencoded()` use default limits.
- `JWT_SECRET` and `ENCRYPTION_KEY` are not validated at startup.

## Tasks
1. Add `helmet` with a CSP such as `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; form-action 'self'`; set HSTS in production.
2. Move inline scripts out of views (start with `visit-new.ejs`: use a `<script type="application/json">` block with `<` escaped, or `data-` attributes, read by an external JS file).
3. CSRF: add a synchronizer or double-submit token middleware for all non-GET routes, include the token in forms and in `fetch` headers.
4. Login: rate limit per IP and per phone (in-memory is acceptable for the MVP; note that multiple instances need a shared store), temporary lockout after repeated failures, audit-log failures via `src/lib/audit.js`, and keep the error message identical for unknown phone and wrong password.
5. Replace the hand-written cookie parser with the `cookie` package or add a safe try/catch.
6. Set explicit body size limits (for example 100 kb for forms, a larger limit only on the audio route if T07 exists).
7. Fail fast at boot when `JWT_SECRET` is shorter than 32 bytes or `ENCRYPTION_KEY` is missing or the wrong length; log which variable, never its value.
8. Tests for each item (CSRF rejection, lockout, malformed cookie, config validation).

## Acceptance criteria
- [ ] Response headers include a CSP with no `unsafe-inline` for scripts
- [ ] POST without a valid CSRF token returns 403 and is audit-logged
- [ ] Repeated failed logins are throttled; legitimate users recover after the window
- [ ] Malformed cookies no longer cause 500 errors
- [ ] App refuses to start with missing or weak secrets

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T14

Title: reliability: async error handling, real health checks, structured logging, graceful shutdown

Labels: infra, p1, agent-ready

Body:

## Context
- Express 4 does not forward promise rejections from async route handlers (for example `authRouter.post('/login', async ...)`). A database error inside such a handler becomes an unhandled rejection, which terminates the process on Node 15 and later.
- `GET /health` always returns `{status:'ok'}` without touching the database or the queue.
- Logging is `console.error` only, so no request IDs and a risk of clinical text ending up in logs.
- The server and the worker (`src/services/queueWorker.js`) have no graceful shutdown.

## Tasks
1. Wrap async handlers (small `asyncHandler` helper or `express-async-errors`) so errors reach the error middleware; the error response stays generic in Persian and never includes stack traces.
2. Split health: `GET /health/live` (process up) and `GET /health/ready` (runs `SELECT 1`, reports queue backlog age). Use them in the Docker healthchecks (T11).
3. Structured JSON logging (for example `pino`) with a request ID per request, HTTP access logs, and a redaction list (names, phone numbers, national IDs, raw input, AI draft text). Add a test that a logged request containing clinical text does not leak it.
4. Graceful shutdown for the server and the worker on `SIGTERM`/`SIGINT`: stop accepting work, finish the current job, close the pool, exit.
5. Worker: bounded retries with backoff, a terminal `failed` state with an error code, and a way to query it (used by the status route in T08).
6. Optional: OpenTelemetry HTTP and DB spans behind an env flag.

## Acceptance criteria
- [ ] Simulated DB failure in any route returns a 500 page and the process stays up
- [ ] `/health/ready` fails when the database is unreachable
- [ ] Logs contain request IDs and no PHI in the redaction tests
- [ ] `docker stop` lets an in-flight job finish or be safely re-queued

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T15

Title: feat(ai): evaluation harness for the structuring pipeline and the RAG assistant

Labels: feature, p1, agent-ready

Body:

## Context
Structuring (`src/services/structuring.js`, prompts in `src/services/prompts.js`, schema in `src/schemas/structuredNote.schema.json`) and the RAG assistant (`src/services/rag/`) have unit tests with mocks but no quality measurement, so prompt or model changes cannot be compared. The STT side already has `stt-service/evaluate_wer.py`. This is the "eval harness" item from the roadmap issue (#31).

## Tasks
1. Create `app/evals/` with a golden dataset of **synthetic** Persian visit texts (no real patient data) for the two Phase 1 specialties, each with expected structured fields. Include informal speech, mixed digits, abbreviations, and deliberately incomplete notes.
2. Metrics (script `npm run eval`, JSON report plus short console summary):
   - schema validity rate (ajv)
   - field-level checks: medications extracted with name and dose, follow-ups extracted
   - grounding check: every medication and number in the output appears in the input text; flag anything invented
   - ambiguity recall: incomplete inputs must produce `missing_or_ambiguous` entries
   - red-line checks: output contains no diagnosis or prescription outside the flagged draft differential field
   - RAG: refusal rate on diagnosis/prescription questions (uses `REFUSAL_KEYWORDS` in `ragAgent.js`), and every answer cites a source
3. Run against the `mock` provider in CI (deterministic) and against a real provider on demand via env vars.
4. Store a baseline JSON; CI fails when a metric drops below the configured threshold.
5. Document how to add a case and how to interpret the report in `app/evals/README.md`.
6. Optional: trace prompt and model versions (Langfuse or Phoenix) behind an env flag.

## Acceptance criteria
- [ ] `cd app && npm run eval` works offline with the mock provider
- [ ] A deliberately broken prompt makes the eval fail (add this as a test)
- [ ] Dataset contains no real patient data and says so in its README

**Ground rules:** Express 4 + EJS + vanilla JS, no bundler; Persian RTL with logical CSS properties; the AI never diagnoses or prescribes and nothing is sent to a patient without physician approval; `cd app && npm test` must pass.

---

## ISSUE T16 (create last)

Title: [Epic] Glass UI/UX redesign and agent-ready platform improvements

Labels: epic, ui, p1

Body:

## Goal
A modern glassmorphism web client that is fast, accessible and RTL-correct, plus the engineering foundations (Docker, CI, security, reliability, evals) that let AI agents and humans contribute safely. Every child issue is written to be picked up independently by an AI agent.

## Order of work
1. Foundations: T01 (CSS tokens), T12 (AGENTS.md and CI)
2. Design system: T02, T03
3. Core screens: T05, T06, T08, T04
4. Capabilities: T07, T10
5. Quality and ops: T09, T13, T14, T15, T11

## Checklist
(replace `T..` with the real issue numbers once created)
- [ ] T01 CSS consolidation and self-hosted font
- [ ] T02 Glass design system
- [ ] T03 Glass app shell and login
- [ ] T04 Dashboard, lists and patient timeline
- [ ] T05 Visit review redesign
- [ ] T06 Structured medication and follow-up editors
- [ ] T07 Voice capture UI
- [ ] T08 Live draft status, toasts, retry
- [ ] T09 Accessibility and RTL audit
- [ ] T10 Jalali dates and numeral normalization
- [ ] T11 Docker as primary install
- [ ] T12 AGENTS.md, CI, templates, repo hygiene
- [ ] T13 Security hardening
- [ ] T14 Reliability
- [ ] T15 Evaluation harness

## Ground rules (apply to every child issue)
- Express 4 + EJS + vanilla JS; no bundler or frontend framework.
- UI is Persian and RTL: user-facing strings stay Persian, use logical CSS properties.
- Product red line: the AI never diagnoses or prescribes; nothing is final or sent to a patient without explicit physician approval.
- `cd app && npm test` must pass; add tests for new logic; keep each PR focused on one issue.

## Definition of done (epic)
1. All child issues closed, CI green on `main`
2. New contributor (human or agent) can run the project with `docker compose up` in under 15 minutes
3. Axe and eval checks run in CI
