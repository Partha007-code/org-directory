# DECISIONS

## Conflict 1 — "Show every organisation on one page" vs. API (25 per request, 137 total, 5 requests/min)

**Chosen:** one continuous list with no pagination controls. The app fetches all pages in the
background (6 pages of 25), shows each page the moment it arrives, and keeps a client-side copy
of everything. Search, filter and sort run **in the browser** over that copy, so they cost zero
API requests.

- 137 records / 25 = **6 requests, but only 5 are allowed per minute.** So the first 125 rows
  appear after ~4 seconds and the last 12 arrive about a minute later. A banner explains this with a
  live countdown ("the rest will arrive in 41 seconds"), so nobody thinks the app is broken.
- The store keeps its own request log and *waits* instead of sending a request that would be
  rejected. If the server still answers "rate limited", it waits and tries again (not counted as a failure).
- Random server failures are retried up to 3 times per page. Failed requests still count towards
  the 5/min budget (as they would on a real rate limiter).
- If a page fails for good: rows already loaded stay visible with a "Load the rest" button.
  Only a failure of the very first page shows the full-screen error state.
- The data lives in a root service, so navigating between list and form does not refetch.

**What we gave up:** the list is not complete for the first minute. Until then, search/filter only see
the records that have arrived (the banner says so). Creating an organisation before loading finishes
means the uniqueness check may be incomplete (the form says so too).

**Rejected:**
- *Pagination* — contradicts what ops asked for.
- *Fetch everything behind a spinner* — ~1 minute of blank screen.
- *Infinite scroll* — still hits the API on scroll, and search/sort could not see unloaded rows.
- *Server-side search/sort* — every keystroke would burn the 5 requests/min budget instantly.
- *Virtual scrolling* — 137 rows render instantly; not worth the complexity. (Would revisit at ~5,000+ rows.)

**Real fix (to raise with the API team):** a bulk/export endpoint or a higher limit for this screen.

## Conflict 2 — "Coloured dot only, no text" vs. "never convey information by colour alone"

**Chosen:** keep the designer's dot **and** add a small, muted text label next to it
(`● Active`). On top of that each status has its own **shape**, so even the dot works without colour:
filled circle = active, hollow ring = inactive, diamond = suspended, dashed ring = unknown.
The dot is `aria-hidden`; the text is what screen readers and search read.

**What we gave up:** the designer's "no text" purity. The label is small and grey, so the table
stays calm; it does cost some horizontal space.

**Rejected:**
- *Dot only with a tooltip* — tooltips need hover; fails on touch and keyboard.
- *Dot + hidden text for screen readers only* — sighted colour-blind users get nothing.
- *Colour dot + shape only (no text)* — passes the letter of WCAG 1.4.1 but users must learn a
  legend. Text is unambiguous. I kept the shapes as a second, free layer.

## Handling the messy data (the fixture is served raw; cleaning happens at runtime)

All of it lives in one file: `core/organisation.mapper.ts` (with a test for every quirk).
Rule: **never throw, never guess.** Unknown becomes `null`/`'unknown'`, and the UI shows an honest placeholder.

| Quirk | Handling |
|---|---|
| `name: ""` / `null` / whitespace | shown as "(No name)" in muted text; sorts last |
| Very long name | clamped to 2 lines, full text in the `title` tooltip |
| Arabic + emoji name | `dir="auto"` so it renders right-to-left correctly |
| `"ACTIVE"`, `"Active"` | lower-cased + trimmed → `active` |
| `"actve"`, `null`, missing status | → `unknown` (labelled "Unknown"). **Typos are not auto-corrected**: guessing could show the wrong status. |
| `memberCount: "12"` | converted to 12 |
| `memberCount: -1`, `null`, `""`, `12.5` | shown as "—". Note `Number("")` is `0`, so empty strings are rejected *before* converting. |
| missing / `null` owner | "—" |
| `not-an-email` | shown as-is with an "Invalid email" tag (hiding it would hide a data problem) |
| `createdAt` as epoch ms | converted to a Date |
| `"not a date"` | "—"; always sorts last, in both directions |
| **duplicate `id: 42`** (two different records) | both kept; rows are tracked by our own `uid`, not the API id. Deduplicating would silently drop one of two conflicting records and we cannot know which is right. |
| dates shown in UTC | so `2024-01-02T00:00:00Z` shows the same day for every viewer |

## Other decisions and assumptions

- **Fixture:** 137 records (matching "137 total"). The 8 given records are verbatim; the rest are
  varied copies keeping the quirks, plus case-variant duplicate names (`Northwind traders`).
- **Mock API:** an in-browser service (`organisation-api.ts`) that reads the fixture file and enforces
  the limits (25/request, 5/min, 400–900 ms delay, ~15% failures).
- **URL state:** `?q=…&status=…&sort=name|created&dir=asc|desc`. The URL is the single source of truth,
  so shared links and the back button work. Typing waits 300 ms before touching the URL.
- **Default sort:** newest first. Search = "name contains text", case-insensitive.
- **Form:** all controls non-nullable. Validation runs on blur (`updateOn: 'blur'`), Enter still validates.
  Member count is a text control (digits only) so it can stay non-nullable; converted to a number on submit.
  The submit button is never disabled; instead an error summary lists every problem with links to the fields,
  and focus jumps to the first invalid field.
- **No backend:** created organisations live in memory only and disappear on reload.
- **Signals / zoneless:** Angular 21 is zoneless by default, so there is no zone.js. State is signals;
  `toSignal` bridges the router's query params.
- **i18n:** a tiny `t` pipe + `en.json`. All visible text, ARIA labels, page titles and even the sort arrows come from it.
- **Design tokens:** all colours and sizes are CSS variables at the top of `src/styles.css`.
- **Tests (optional):** mapper, store (rate limit/retry), list and form. Run with `npm test`.

## With two more days

- Persist the loaded data in `sessionStorage` with a short expiry, to stop reloads from burning the rate limit.
- Typo-tolerant status mapping, *shown* to the user as a suggestion ("Did you mean Active?") rather than applied silently.
- A real second language file and a language switcher; proper plural handling.
- Virtual scrolling and a column for each sort direction announced via a live region.

## AI-tool declaration

> **EDIT THIS before submitting so it is true.** The code in this repository was generated with
> Claude (Anthropic) from the assignment text. I [read / reviewed / changed ...] it and can explain every file.
