# Implementation Plan

Execute phases in order. A phase is complete only when its requirement IDs, tests, browser checks, and documentation pass.

| Phase | Name | Main output |
|---:|---|---|
| 00 | Foundation | Next.js/Supabase project, design shell, quality scripts, fixtures, formula skeleton |
| 01 | Auth & household boundary | Profile, household/membership/invite, RLS baseline |
| 02 | Tutoring operations | Students, schedules, lessons, prep, modes, Calendar mock |
| 03 | Ledger & receivables | Accounts, transactions, CSV/mock sync, receivables and allocations |
| 04 | Subscriptions | Contract, occurrences, calendar, matching, household subscription bridge |
| 05 | Household operations | Inventory, shopping, cleaning |
| 06 | Shared money | Shared expenses, payer/splits, settlement, transaction classification |
| 07 | Dashboard, Grow & analytics | Formulas, Home, surplus plan, charts/text summaries |
| 08 | External integrations | Google production adapter, KFTC testbed contract, sync/error controls |
| 09 | Hardening & release | PWA, accessibility, export/delete, security, CI, preview deployment |

Use the corresponding `harness/build/phase-XX-*.md` as the executable checklist. Keep `PROGRESS.md` current.
