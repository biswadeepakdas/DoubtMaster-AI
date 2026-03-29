# QA Report — doubtmasterai.com
**Date:** 2026-03-29
**Tester:** Claude Code (automated browser QA)
**Scope:** Full UI audit — every page and interaction
**Auth:** Authenticated as `qatest99@doubtmaster.ai` (Free Plan, Class 10 CBSE)

---

## Health Score: 62 / 100

| Category | Score | Notes |
|---|---|---|
| Core Solve Flow | 9/10 | Text solve + chat working; physics + math confirmed |
| Mock Tests | 7/10 | Works end-to-end; submit dialog ref bug (minor) |
| Navigation & Routing | 4/10 | Many 404s, broken links, bad redirects |
| Settings / Profile | 3/10 | Save Changes fails (422), dark mode toggle broken |
| Footer / Legal | 1/10 | All legal pages mis-routed to /settings |
| Progress Page | 9/10 | Data displays correctly |
| Question History | 6/10 | Works for simple questions; raw JSON for complex ones |
| Homepage | 7/10 | Looks good; counter bug; footer links broken |
| Signup / Auth | 7/10 | Works; missing password validation; Google OAuth iframe warning |

---

## Bugs — Assign to Dev

---

### BUG-001 · CRITICAL · Settings "Save Changes" returns 422
**Page:** `/settings`
**Steps:** Open Settings → Change any field (e.g. Name) → Click "Save Changes"
**Expected:** Profile saved, success toast shown
**Actual:** "Request failed (422)" shown in red inline
**Screenshot:** `54-settings-save.png`
**Root Cause:** The frontend likely sends a payload the backend doesn't accept (field name mismatch or missing required field). Needs backend `/user/profile` or `/user/update` endpoint to be checked/created.

---

### BUG-002 · CRITICAL · All legal/policy footer links route to `/settings`
**Page:** Homepage footer
**Affected Links:** Privacy Policy, Terms of Service, Refund Policy, Cookie Policy
**Actual href values found:**
- Privacy Policy → `https://doubtmasterai.com/settings`
- Terms of Service → `https://doubtmasterai.com/settings`
- Refund Policy → `https://doubtmasterai.com/settings`
- Cookie Policy → `https://doubtmasterai.com/settings`

**Expected:** Each link should go to a dedicated legal page (e.g. `/privacy-policy`)
**Legal Risk:** Shipping a product with broken legal links is a compliance issue. These pages must exist before acquiring users.

---

### BUG-003 · HIGH · Question detail from search/history shows raw JSON for complex solutions
**Page:** `/questions` (history) + search dropdown navigation
**Steps:**
1. Search for "Real Numbers" → click result
2. Or open `/questions` → expand "Mock test: Real Numbers"
**Expected:** Step-by-step formatted solution
**Actual:** Raw JSON blob with code fences displayed as plain text
**Screenshot:** `38-question-history-raw-json.png`
**Root Cause:** Backend re-solves the question when `GET /api/v1/questions/{id}` is called. For "Mock test: Real Numbers (1/10 correct)", the LLM generates a 10-step solution with p5.js animation code that **exceeds 2048 tokens**, causing JSON truncation and parse failure, falling back to raw text display.
**Fix:** Either (a) store the solution JSON at solve time and retrieve it instead of re-solving, or (b) increase `max_tokens` to 4096 for the `get_question` endpoint, or (c) strip animation from history solves.

---

### BUG-004 · HIGH · `/questions/{id}` route returns 404 (search result click broken)
**Page:** Dashboard search dropdown
**Steps:** Search any question → click the result
**Expected:** Navigate to the question's solution page
**Actual:** 404 "Page Not Found"
**URL:** `https://doubtmasterai.com/questions/23f79805-...`
**Screenshot:** `35-search-result-click.png`
**Root Cause:** No Next.js page exists at `/questions/[id]`. The question detail view is only accessible via accordion expansion in `/questions`.

---

### BUG-005 · HIGH · Company footer pages all route to homepage
**Page:** Homepage footer
**Affected:** About, Careers, Blog, Press
**Actual href values:**
- About → `https://doubtmasterai.com/`
- Careers → `https://doubtmasterai.com/`
- Blog → `https://doubtmasterai.com/`
- Press → `https://doubtmasterai.com/`

**Expected:** Dedicated pages at `/about`, `/careers`, `/blog`, `/press`
**Note:** Contact correctly links to `mailto:support@doubtmaster.ai`

---

### BUG-006 · HIGH · `/history` and `/profile` return 404
**Pages:** `https://doubtmasterai.com/history`, `https://doubtmasterai.com/profile`
**Screenshot:** `30-history-page.png`, `31-profile-page.png`
**Note:** History is accessible via `/questions`, and profile/settings via `/settings` — but the `/history` and `/profile` routes themselves 404. Any external link or hardcoded navigation to these URLs will break.

---

### BUG-007 · HIGH · "Upgrade Now" (logged-in) redirects to `/signup?plan=pro` → then to dashboard
**Page:** Dashboard → Upgrade to Pro section
**Steps:** Click "Upgrade Now" while logged in
**Expected:** Go to a pricing/payment page for existing users
**Actual:** Navigates to `/signup?plan=pro` which immediately redirects logged-in users back to `/dashboard`
**Impact:** Logged-in users have **no way to upgrade their plan** from the dashboard. The `/pricing`, `/subscribe`, and `/subscription` routes all 404.
**Screenshot:** `40-upgrade-now.png`

---

### BUG-008 · HIGH · Settings dark mode toggle unresponsive (timeout)
**Page:** `/settings`
**Steps:** Scroll to "Appearance" section → Click the Dark Mode toggle
**Expected:** Page toggles to dark mode
**Actual:** `Operation timed out: click: Timeout 5000ms exceeded` — toggle doesn't respond
**Note:** Dark mode toggle in the **dashboard nav bar** (button @e11) works correctly. Only the `/settings` page toggle is broken.
**Screenshot:** `53-settings-dark.png`

---

### BUG-009 · MEDIUM · Signup — no password validation for short passwords
**Page:** `/signup`
**Steps:** Enter email → Enter password "short" (7 chars, below 8-char minimum) → Continue
**Expected:** Validation error "Password must be at least 8 characters"
**Actual:** Form proceeds to step 2 with no error shown
**Impact:** Users can create accounts with weak passwords; backend may reject them at a later step with a confusing error.

---

### BUG-010 · MEDIUM · Stats counter shows "0 Languages Supported" on homepage
**Page:** `https://doubtmasterai.com` (Hero section)
**Actual text:** "0 Languages Supported" in the stats row
**Expected:** "11 Languages Supported"
**Root Cause:** The counter animation starts from 0 and animates up, but the animation didn't complete before the screenshot. This means the counter is slow/timing-dependent and may show "0" to users on slow connections or before the component mounts.
**Evidence:** Actual text in DOM has both "11 Languages" (static) and "0\nLanguages" (animated counter that hasn't fired).

---

### BUG-011 · MEDIUM · Social media links point to root domains (not real profiles)
**Page:** Homepage footer
**Actual:**
- Twitter → `https://twitter.com/`
- Instagram → `https://instagram.com/`
- YouTube → `https://youtube.com/`
- LinkedIn → `https://linkedin.com/`

**Expected:** Links to actual DoubtMaster AI social profiles
**Impact:** Looks unprofessional; broken social proof.

---

### BUG-012 · MEDIUM · JEE/NEET footer links both go to `/questions` (no dedicated landing pages)
**Page:** Homepage footer → Product section
**JEE Preparation** → `/questions`
**NEET Preparation** → `/questions`
**Expected:** Dedicated SEO landing pages at `/jee-preparation` and `/neet-preparation`
**Impact:** SEO opportunity missed; users landing from JEE/NEET searches get a generic questions page.

---

### BUG-013 · MEDIUM · Teacher Dashboard shows 403 for all users
**Page:** `/teacher`
**Actual:** "Request failed (403) — Make sure your account has teacher or admin access."
**Note:** If this page is not meant for general users, it should be hidden from navigation entirely and redirect to dashboard instead of showing a 403 error screen.

---

### BUG-014 · LOW · `/pricing` page returns 404
**URL:** `https://doubtmasterai.com/pricing`
**Note:** The homepage nav has a "Pricing" link that scrolls to the pricing section on the homepage (anchor link) — this works. But if someone navigates directly to `/pricing`, they get a 404.

---

### BUG-015 · LOW · Google Sign-In button shows iframe sandbox warning
**Page:** `/login`, `/signup`
**Console warning:** `An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.`
**Impact:** Non-critical security warning in console; Google Sign-In button renders but this could be a configuration issue with how the Google OAuth button is embedded.

---

## What's Working Well ✅

| Feature | Status | Notes |
|---|---|---|
| Text Solve (Type mode) | ✅ WORKING | Returns structured steps, formulas, final answer |
| Physics solve with animation | ✅ WORKING | p5.js animation canvas renders correctly |
| Follow-up chat (Ask a follow-up) | ✅ WORKING | Streaming response works, proper markdown rendering |
| Mock Tests (generate + answer + submit) | ✅ WORKING | AI generates 10 questions, scoring works, breakdown shows |
| Dashboard dark mode (nav toggle) | ✅ WORKING | Toggles correctly |
| Search dropdown | ✅ WORKING | Shows matching questions; click navigates (but goes to 404) |
| Question history (`/questions`) | ✅ WORKING | Accordion expand, simple questions show solution correctly |
| Progress page (`/progress`) | ✅ WORKING | Weekly activity, subject breakdown, weak topics all show |
| Settings page (`/settings`) | ✅ WORKING (display) | Profile data loads; Save fails (see BUG-001) |
| Homepage hero + pricing section | ✅ WORKING | Visually complete, CTAs navigate correctly |
| Signup flow (email + password) | ✅ WORKING | 3-step flow works (step 1 validation needs fix - BUG-009) |
| Login flow | ✅ WORKING | Email/password authentication works |
| Logout | ✅ WORKING | Logs out and redirects to homepage |
| Dashboard stats | ✅ WORKING | Questions solved, streak, solve count, subjects studied |
| Weak topics widget | ✅ WORKING | Updates after Learn Mode usage |
| Recent questions widget | ✅ WORKING | Shows latest questions with subject/topic tags |
| Weekly activity heatmap | ✅ WORKING | Shows correct counts per day |
| Photo upload button | ✅ PRESENT | File input detected (full test requires actual image) |
| `/mock-tests` page | ✅ WORKING | Subject/chapter selection, AI question generation |
| Custom 404 page | ✅ WORKING | Shows friendly "Page Not Found" with Home/Dashboard links |

---

## Summary for Dev Assignment

| Priority | Bug | Effort |
|---|---|---|
| P0 | BUG-002: Legal pages mis-routed (compliance risk) | Create 4 pages |
| P0 | BUG-007: No upgrade path for logged-in users | Create /pricing or /upgrade page |
| P0 | BUG-001: Settings Save fails 422 | Fix backend endpoint |
| P1 | BUG-003: History raw JSON on complex solves | Store solution at solve-time OR increase tokens |
| P1 | BUG-004: /questions/[id] route missing | Create dynamic route page |
| P1 | BUG-005: Company pages go to homepage | Create placeholder pages or fix hrefs |
| P1 | BUG-008: Settings dark mode toggle broken | Fix toggle event handler |
| P2 | BUG-009: Weak password passes signup | Add frontend password length check |
| P2 | BUG-010: Counter animation shows 0 | Fix IntersectionObserver trigger timing |
| P2 | BUG-011: Social links go to root domains | Add real profile URLs |
| P3 | BUG-006: /history and /profile 404 | Add redirects or pages |
| P3 | BUG-012: JEE/NEET links go to /questions | Create landing pages or update hrefs |
| P3 | BUG-013: Teacher 403 shown to all users | Hide page from non-teacher users |
| P3 | BUG-014: /pricing 404 | Add redirect to homepage#pricing |
| P3 | BUG-015: OAuth iframe sandbox warning | Review Google button embed config |

---

*Generated by gstack /qa-only — 2026-03-29*
