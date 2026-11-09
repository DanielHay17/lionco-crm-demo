# v2 call-driven features — what is real, what is mock, what is future

Branch: `feature/v2-call-features` (built on `feature/mvp`). Everything is **fictional demo data** held in the browser's
`localStorage`. No transcript, real client, contact or price is included.

Legend: **Working** = functioning local feature · **Simulated** = local state change that says so, nothing leaves the browser ·
**Mock** = placeholder UI for an integration that is *not connected* · **Future** = not built, shown only as roadmap.

## Priority 1 — connected core workflow

| # | Request | Status | Where |
|---|---------|--------|-------|
| 1 | Lifecycle Inquiry → quote → approved/declined → in progress/packing → build booked → erected → takedown booked → dismantled → warehouse return → invoiced → paid → Google review, with breadcrumb + Kanban, declines, variations, linked objects | **Working** (invoice/payment/review steps are simulated) | Pipeline (phase-grouped Kanban, phase filter, Declined column), Job detail (scrollable lifecycle breadcrumb, `Client › Job › Kit › Quote › Packing` crumbs, Variations tab). Logic: `lib/state.ts` `moveJob` is the single choke-point. |
| 2 | Editable kit/inventory: quantities, available/reserved, shortage warnings, fictional price list, labour hours, crew formula | **Working** | Kit & Inventory (`/catalogue`): every cell editable; reserved = kit on jobs from *Approved* to *Warehouse return*; shortage banners on job and quote; crew calculator. `lib/inventory.ts`, `lib/crew.ts`. |
| 3 | Quote builder from kit + job: lines, rental duration, labour/transport/other, totals, margin, deposit, save, printable customer preview, simulated issue/approve/decline, site notes, schematic concept | **Working / Simulated** | Quotes (`/quotes`, `/quotes/:id`, `/quotes/:id/preview`). Preview shows sell prices only. Site notes + attachment *placeholders* (file **name only** — contents never read). `lib/quote.ts`. |
| 4 | Job records: stable sequential demo IDs, buyer/site-manager contacts, location, client + kit breadcrumbs, quotes, dates; create customer → job → quote | **Working** | New enquiry modal (existing or new client, buyer + site manager), Job detail, Clients. Job numbers are a local simulation (`#seq`, `LC-YYYY-NNN`), never reused, **not** Xero numbers. |
| 5 | Clients list/detail: editable contacts, linked jobs, LTV/avg ticket, clickable map, mocked Gmail activity; company map with stage-coloured bubbles | **Working** (Gmail **Mock**) | Clients, Client detail, Map. Local SVG schematic map (illustrative, no tokens/APIs); bubbles open the job; stage-group / suburb / date filters; suburb revenue table. **Analytics** (`/analytics`) is a coverage map of Greater Sydney: Leaflet on OpenStreetMap standard tiles (no API key; only the tiles in view are requested — CARTO's lighter style now needs a key and is not used). Pins are random fictional demo sites stored on the job (not suburb centres); zoom runs from the city to street level. Status legend, clusters, fit-to-jobs, suburb revenue chart/table, and optional revenue bubbles. A saved demo without `sitePinRev` is migrated onto the new pins. Older paid sample jobs stay in client LTV and off the live pipeline. |

## Priority 2 — transcript details

| # | Request | Status | Where |
|---|---------|--------|-------|
| 6 | Printable handover / sign-off, neighbour consent, site folder cover, schematic placeholders; QR tentative | **Working** forms (clearly **DEMO TEMPLATE / not compliance-approved / not a safety certificate**); QR **Mock** (non-scannable picture, labelled tentative/not built) | Job → Site tab, `/jobs/:id/docs/:kind` |
| 7 | 30-day inspection reminder (configurable), local inspection record, variations linked to job/quote, takedown booking, warehouse return checklist | **Working** (demo reminder, not legal guidance; no real reminders sent) | Job → Site / Variations / Return tabs, Operational dates card, `/site` overview, dashboard tile. Interval is a setting (Kit & Inventory → assumptions; `0` disables). Return checklist reuses the packing lines. |
| 8 | Integration centre: Xero source-of-truth + queue + reconciliation, Gmail per-client, WhatsApp stages/invite preview, expense-capture exception, MYOB checklist | **Mock** (all disconnected; actions are labelled *simulated*) | `/integrations` tabs. Capture exceptions: hyperlink-only receipts and failed forwarding land in a pending-human-allocation inbox; allocating creates a real *local* expense. WhatsApp tab states feasibility is **unconfirmed**; nothing sent. MYOB: planning checklist + local job-sequence planner only. |

## Priority 3 — future scope (kept separate: `/roadmap`)

SOP starter templates (not approved procedures) · drone pre-flight checklist mock with safety disclaimer · BI suburb revenue by date +
illustrative cash-flow with editable fictional recurring items · consent-aware Google-review follow-up **preview** (blocked unless the
client's demo consent flag is set; nothing sent) · **Future / not built**: Google sign-in & MFA, backup admin access, hosted backups / PITR,
native iOS. The page states plainly that the demo is localStorage-only with **no secure authentication and no backups**.

## Definitions & assumptions (all labelled in the UI)

* **Quote maths** (`lib/quote.ts`): kit line sell = qty × weekly rental price × hire weeks; other lines = qty × unit price. Cost likewise from unit cost.
  *Profit* = sell − cost. *Margin* = profit ÷ sell (**not** markup); sell ≤ 0 ⇒ margin shown as `n/a` (0 internally, `marginDefined=false`). Prices ex GST; GST is not modelled.
  Negative quantities/costs/NaN are clamped to 0; a negative sell price is allowed only to model a discount. Demo deposit = sell × % (clamped 0–100%).
* **Crew** (`lib/crew.ts`): `people = ceil(total person-hours / (days × hours per day))`; total hours = Σ kit qty × labour hours/unit. Zero/negative/non-finite days or hours ⇒ `valid:false`, 0 people, reason shown.
  Labour cost assumes the crew is paid full days (people × days × hours). This mirrors a *spreadsheet concept*; no real business formula was invented — rates and hours/unit are fictional and editable.
* **Client LTV** (`lib/clients.ts`): *booked* = contract value of jobs at Approved or later (incl. approved variations); *paid* = Paid or later; *average ticket* = booked ÷ booked jobs (0 when none).
  *Quoted (open)* = issued quote at the Quote stage, shown separately. Enquiries, draft quotes and declined jobs are excluded from LTV/average.
* **Stock**: reserved from Approved until Warehouse return; Quote-stage kit is *not* reserved. Return shortfalls are recorded but do not auto-adjust owned quantities.
* **Lifecycle invariants** (tested): Enquiry ⇒ quote draft · Quote ⇒ issued · Approved+ ⇒ approved · Declined ⇒ declined · `paidAt` iff stage ≥ Paid · dates for later stages are cleared when moving back ·
  Declined can only re-open to Enquiry/Quote · job IDs/seq unique and never reused · job value = active quote sell (+ approved variations after approval).
  Moves that skip steps (e.g. invoicing before the return checklist is complete) are *allowed* but raise an advisory warning toast/banner.
* **Persisted state**: key `lionco-crm-demo:v2` unchanged; document `version` 1 → 2. `lib/migrate.ts` upgrades v1 in place (creates clients from job names, buyer contacts, job sequence, kit pricing defaults, settings, empty quotes/variations) and is idempotent. Unusable documents fall back to the seed.
* Seed edits to existing demo data: stages on three jobs changed and four jobs added so every stage is represented. Seeded quote totals reproduce the original job values exactly, so the CEO dashboard figures are unchanged.

## Preserved MVP features

Pipeline Kanban, fixed job-code costing (expenses must reference an existing job), CEO dashboard, truck packing with 60/40 load balancing and A4 print — unchanged in behaviour; the dashboard gained an "Operations attention" row and its Xero card now points at the mock Integration Centre.
Two assertions in `state.test.ts` that hard-coded the old seed (7 stages; next code `016`) were updated for the larger seed; the original 30 tests still pass.

## Verification

```bash
npm install
npm run typecheck     # tsc -b
npm test              # vitest run  (169 tests)
npm run build         # tsc -b && vite build
npm run test:ui       # real-browser smoke (needs a local Chrome/Chromium; SKIPs cleanly if none) — 51 checks
npm run dev           # manual walkthrough, http://localhost:5173
```

Tests: `quote.test.ts` (cost/profit/margin incl. zero revenue and invalid input, deposit, per-line rental weeks, crew formula incl. invalid input), `clients.test.ts` (LTV/average incl. no jobs and excluding draft/declined/enquiry, stock, inspection, map, suburb analytics),
`lifecycle.test.ts` (full lifecycle walk, declines/revise, variations linked to quote, numbering, return checklist, invariants), `migrate.test.ts` (v1→v2, idempotence, bad input, localStorage round-trip),
`smoke.test.tsx` (every route server-renders against the seed; customer preview never contains cost/profit/margin).

`scripts/ui-smoke.mjs` (`npm run test:ui`, not part of `npm test`) drives headless Chrome against a local Vite dev server via the dev-only `puppeteer-core` package (no browser download, no network/accounts):
create fictional client → job (buyer + site manager) → kit → quote (hire weeks, per-line weeks, transport line, deposit) → save → issue → approve → packing link → client link → map bubble → Kanban ▶ and real HTML5 drag/drop (incl. Declined reason dialog) →
customer print preview has no cost/margin/profit text → localStorage persists across reload → 23 routes at a 390px viewport have no horizontal overflow, mobile menu opens, no uncaught page errors.
Set `CHROME_PATH` if Chrome is not in a standard location. It uses a throwaway headless profile, so it never touches your own demo data.

## Suggested walkthrough (≈6 min)

1. **Clients → ＋ New client** → open it → **＋ New job for this client** (buyer + site manager roles).
2. Job → **Kit** tab add items → **Quote** tab **Build quote from kit** → set hire weeks/crew → **Apply crew formula** → watch margin; **Customer preview / print**.
3. **Issue (simulated)** → **Customer approves (simulate)** → packing list generated; or **Customer declines** → job in *Declined*, then **Revise**.
4. Use ▶ on the job through *Build booked → Erected* (see the inspection reminder), *Takedown booked → Dismantled → Warehouse return* (Return tab), *Invoiced* (mock Xero queue item), *Paid*.
5. **Map** (click a bubble), **Kit & Inventory** (shortage on the large quoted job), **Integrations** (capture exceptions, WhatsApp preview), **Future scope**.

## Known gaps

* The browser smoke covers the main flow, Kanban and mobile overflow, not every screen's visual polish; the printed (paper/PDF) layout of the quote and site forms was not visually verified (browser print dialog is not automated).
* Moving a job backwards past Approved reverts its quote status but does not release/undo a generated packing checklist.
* Kit returned short is a record only; stock is not auto-adjusted. No per-day crew scheduling or calendar.
* The schematic map positions are hand-set for ~14 Sydney suburbs; other suburbs go to a holding strip.
* Rental duration can be set per kit line (override) but is a whole-line multiplier; there is no date-based hire calendar. Labour/transport/other lines are flat.
* GST, multi-user editing, real documents/PDF generation (browser print only), and anything marked Mock/Future are intentionally absent.
