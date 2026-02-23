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
- Result: (pending)

### US-03 — Search
**As a user**, I want to search capsules by name.
- Expected: Search filters live; clearing search returns full list.
- Result: (pending)

### US-04 — Filter by drink
**As a user**, I want to filter by drink type (espresso/lungo/ristretto).
- Expected: Filter matches catalog metadata; lungo items actually appear under lungo.
- Result: FAIL (initial scrape). Many items named "* Lungo" were classified as espresso.
- Fix: Infer drink type from capsule name (contains Lungo / Espresso / Ristretto) during catalog normalization.

### US-05 — Filter by intensity
**As a user**, I want to filter by minimum intensity.
- Expected: Capsules with unknown intensity are handled sensibly (either excluded or shown with disclaimer).
- Result: (pending)

### US-06 — Capsule detail page
**As a user**, I want a capsule page showing key info and my recent tastings.
- Expected: Intensity bar correct; “Log this tasting” logs for that capsule.
- Result: (pending)

### US-07 — Log a tasting
**As a user**, I want to log tasting attributes quickly.
- Expected: Modal pre-fills capsule fields; can save; after save, detail page shows the entry.
- Result: (pending)

### US-08 — Data persistence
**As a user**, I want my tastings to stay after closing/reopening.
- Expected: Reload page → tastings and catalog remain.
- Result: (pending)

### US-09 — Export
**As a user**, I want to export my data.
- Expected: Downloaded JSON includes catalog + tastings + meta.
- Result: (pending)

### US-10 — Import
**As a user**, I want to import my data.
- Expected: Import replaces state; UI updates; handles invalid JSON with a clear error.
- Result: (pending)

### US-11 — Clear all data
**As a user**, I want to reset the app.
- Expected: Confirmation dialog; state cleared; returns to catalog view.
- Result: (pending)

### US-12 — Mobile responsiveness
**As a user**, I want it usable on phone.
- Expected: Layout stacks; modal usable; buttons accessible.
- Result: (pending)

### US-13 — Accessibility basics
**As a user**, I want keyboard/ARIA basics.
- Expected: ESC closes modal; focus management reasonable; buttons labelled.
- Result: (pending)

---

## Issues log (to fill)
- I-01 …

## Fix plan (to fill)
- F-01 …
