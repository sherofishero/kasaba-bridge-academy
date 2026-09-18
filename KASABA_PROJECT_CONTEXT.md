# KASABA BRIDGE HUB — Master Project Context / AI Handoff Document

**Created:** 2026-09-18
**Purpose:** Handoff document for new AI/Agents joining the Kasaba Bridge Hub project.
**Status:** [VERIFIED]

## 1. PROJECT IDENTITY

| Attribute | Value | Status |
|-----------|-------|--------|
| Project Name | Kasaba Bridge Hub (kasaba-bridge-academy) | [VERIFIED] |
| Repository URL | https://github.com/sherofishero/kasaba-bridge-academy.git | [VERIFIED] |
| Technology Stack | Next.js 16.2.10, React 19.2.4, TypeScript 5, Tailwind CSS 4, Supabase JS 2.110.5 | [VERIFIED] |

## 2. ARCHITECTURE

### 2.1 Directory overview
- app/: Next.js App Router pages and components
- lib/: core business logic (auction, game, play, historical)
- data/: imported PBNs and generated JSON (large files; do not load)
- supabase/: migrations and SQL
- scripts/: import/export and PBN pipeline utilities

### 2.2 Runtime and services
- Frontend: Next.js App Router (server + client components)
- Realtime: Supabase Realtime / Postgres for table state and chat
- Storage: public/ for static assets; data/ for imports (avoid loading)

## 3. LIB LAYER SUMMARY

- Purpose: app/lib/ implements core game logic separated from React components.
- Key modules: auction.ts, deck.ts, game.ts, play.ts, scoring.ts, trainingGenerator.ts, historical/*, supabase.ts

## 4. KEY MODULES (quick reference)

| Module | Path | Purpose |
|--------|------|---------|
| Auction logic | app/lib/auction.ts | Bidding rules |
| Deck / Deal | app/lib/deck.ts | Card types, deal utilities |
| Game state | app/lib/game.ts | Table state machine |
| Play engine | app/lib/play.ts | Play validation |
| Historical parser | app/lib/historical/*.ts | PBN parsing and validation |
| Supabase client | app/lib/supabase.ts | DB client and realtime subscriptions |

## 5. HISTORY ENGINE

- Files: app/lib/history/engine.ts, types.ts, visibility.ts
- Model: typed history records (GAME, TRAINING, EDUCATION, TEAM_MATCH, TOURNAMENT)
- Visibility: participant vs spectator rules
- Storage: history_records table (see migration 0008)

## 6. HISTORICAL DEAL SYSTEM

- Flow: manifest -> download -> parse -> validate -> upsert
- Scripts: scripts/downloadPbn.ts, scripts/importHistoricalPbn.ts, scripts/saveToJson.ts
- Validation: 52 unique cards, valid auction/play lines
- Indexing: data/pbn_hist_imports.json used as local index (large; not embedded)

## 7. SUPABASE MIGRATIONS SUMMARY

- Migrations under supabase/migrations/
- Key: 0008_history_records.sql, 0012_historical_deals.sql (review before imports)

## 8. SKIPPED LARGE FILES

- Large/generated files are not embedded here. See summary file for names and sizes.

## 9. KNOWN RISKS AND NEXT STEPS

- Timeouts: batch imports
- Large data: use samples/streaming
- Schema: test migrations on staging
- CI: prevent committing generated data

## 10. QUICK START

1. npm install
2. npm run dev
3. Use Supabase dashboard or emulator; run migrations on staging
4. Test import scripts with a single sample PBN

## 11. CONTACT AND NOTES

- Repo owner: sherofishero (GitHub)
- Supabase project referenced in app/lib/supabase.ts
