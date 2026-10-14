# Organisation Directory (Angular 21)

```bash
npm install
npm start        # opens http://localhost:4200
npm test         # optional: unit + component tests (Vitest)
npm run build    # production build
```

Needs Node 20.19+ (or 22+).

## Where things are

```
public/data/organisations.json     the RAW messy fixture (137 records, untouched)
src/styles.css                     design tokens (all colours + spacing)
src/app/core/
  organisation.model.ts            types: Raw (unknown) vs Organisation (clean)
  organisation.mapper.ts           turns messy records into clean ones   <- the data "trap"
  organisation-api.ts              fake server: 25/request, 5/min, delay, 15% failures
  organisation-store.ts            loads all pages politely; signals for the UI   <- Conflict 1
  en.json, translate.*             all visible text
src/app/shared/status-badge/       dot + label + shape                   <- Conflict 2
src/app/features/org-list/         table, search, filter, sort, states
src/app/features/org-create/       form + validators
DECISIONS.md                       choices, rejected options, AI declaration
```
