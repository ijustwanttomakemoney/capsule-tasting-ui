# Capsule Tasting UI — UAT (Product Manager Audit)

Date: 2026-02-23
Target: https://ijustwanttomakemoney.github.io/capsule-tasting-ui/
Scope: Core user flows + edge cases + data integrity + usability/accessibility.

## Personas
- **Primary user:** Yan, Original capsules only, wants to quickly log tastings and revisit history.

## Acceptance criteria (high level)
- User can load a realistic catalog quickly (1 click).
- User can find a capsule (search/filters) and open its detail page.
- User can log a tasting with rating + acidity/bitterness/aroma + notes.
- Data persists across reload.
- Export/import works.
- No destructive action without confirmation.

---

## User stories & test cases

### US-01 — Load catalog
**As a user**, I want to import the official Nespresso Original catalog with one click.
- Steps: Click **Load Nespresso catalog**.
- Expected: Catalog populates; no duplicates; intensities present where available; no bundles included.
- Result: FAIL (initial build). Imported 63 items but had duplicate IDs/names due to site repeating capsules across sections.
- Fix: Added normalization on load (merge duplicates by name; enforce stable ID; infer type from name; merge collections/tags).

### US-02 — Browse catalog (grid)
**As a user**, I want to browse capsules in a scannable grid.
- Expected: Cards show name + intensity + collection/type; consistent layout.
- Result: PASS (after import). Cards show type and collection; intensity shown when available.

### US-03 — Search
**As a user**, I want to search capsules by name.
- Expected: Search filters live; clearing search returns full list.
- Result: PASS (e.g., searching “Tokyo” returns Tokyo Lungo).

### US-04 — Filter by drink
**As a user**, I want to filter by drink type (espresso/lungo/ristretto).
- Expected: Filter matches catalog metadata; lungo items actually appear under lungo.
- Result: PASS (after fix). Lungo list includes: Buenos Aires / Shanghai / Stockholm / Tokyo / Vienna (+ decaf Vienna Lungo).

### US-05 — Filter by intensity
**As a user**, I want to filter by minimum intensity.
- Expected: Capsules with unknown intensity are handled sensibly.
- Result: PASS. Setting min intensity=10 returns a smaller list; combining with tags can yield 0; Reset restores full list.

### US-06 — Capsule detail page
**As a user**, I want a capsule page showing key info and my recent tastings.
- Expected: Intensity bar correct; “Log this tasting” logs for that capsule.
- Result: PASS (after fix). Detail page updates immediately after saving; recent tastings list shows the new entry.

### US-07 — Log a tasting
**As a user**, I want to log tasting attributes quickly.
- Expected: Modal pre-fills capsule fields; can save; after save, detail page shows the entry.
- Result: PASS. End-to-end flow works.

### US-08 — Data persistence
**As a user**, I want my tastings to stay after closing/reopening.
- Expected: Reload page → tastings and catalog remain.
- Result: PASS (localStorage retained catalog + tastings across reload).

### US-09 — Export
**As a user**, I want to export my data.
- Expected: Downloaded JSON includes catalog + tastings.
- Result: PASS (download triggered; JSON contains catalog + tastings). Note: currently no meta block is exported.

### US-10 — Import
**As a user**, I want to import my data.
- Expected: Import replaces state; UI updates; handles invalid JSON with a clear error.
- Result: PASS (basic) for valid JSON; invalid JSON shows alert.

### US-11 — Clear all data
**As a user**, I want to reset the app.
- Expected: Confirmation dialog; state cleared; returns to catalog view.
- Result: PASS (confirmation shown; cancel aborts; OK clears and returns to catalog).

### US-12 — Mobile responsiveness
**As a user**, I want it usable on phone.
- Expected: Layout stacks; modal usable; buttons accessible.
- Result: PASS (basic). Layout collapses to 1 column; modal uses full width.

### US-13 — Accessibility basics
**As a user**, I want keyboard/ARIA basics.
- Expected: ESC closes modal; focus management reasonable; buttons labelled.
- Result: PASS (basic). ESC closes modal.

---

## Issues log
- I-01 Duplicate capsules after catalog load (same product repeated across Nespresso page sections). Fixed by normalization/merge-by-name.
- I-02 Drink type misclassified for "* Lungo" capsules. Fixed by inference from name.
- I-03 Detail page didn’t refresh recent tastings after saving. Fixed by tracking currentDetailId and refreshing.
- I-04 Top nav views (My tastings / Insights) were non-functional. Fixed by adding views + renderers.
- I-05 Deployment caching: some sessions loaded an old index.html (missing new views). Mitigation: hard-refresh / cache-bust query param.
- I-06 Data validation: if localStorage is manually modified (or imported from elsewhere), ratings can exceed 5 (e.g., 6/5). Fix in progress: clamp/normalize tastings on load.

## Fix plan
- F-01 (next) Improve tag taxonomy: separate "collection" from freeform tags; offer a Collection filter dropdown.
- F-02 (next) Add edit/delete for a tasting entry.
