# Lion & Co Scaffolding — Operations Demo

Clickable MVP demo of a simple in-house "pseudo-Salesforce" CRM/ERP for **Lion & Co Scaffolding** (Sydney, [lioncoscaffolding.com.au](https://lioncoscaffolding.com.au)):
pipeline, job costing with fixed job codes, a CEO dashboard and truck packing checklists.

> **v2:** the demo now covers the full operational lifecycle, a quote builder, clients, a company map, site documentation, and a mock Integration Centre.
> See [`docs/CALL_FEATURES.md`](docs/CALL_FEATURES.md) for what is working vs simulated, mock or future, plus assumptions and verification commands.
> Data is localStorage-only: no sign-in, no backups, no real integrations.
>
> **Demo data disclaimer:** every client, person, address, phone number, email, supplier and dollar figure in this
> app is made-up example data. No real client, job or financial data is included. There is no backend, no accounts and no network
> calls (integrations are mock and disconnected).

## What's in it

| Area | What it does |
| --- | --- |
| **Pipeline** | Filter by service type (Residential / Commercial / Expert Advice / Drone Services, plus a drone-survey add-on flag). Kanban: Enquiry → Quote → Approved → Job in progress → Invoiced → Paid → Google review requested. Drag-and-drop *or* ◀ / ▶ buttons on every card. Column count + total value. New enquiries get an auto-generated fixed code (`LC-2026-015`…). |
| **Job detail** | Header with job code, service type and stage stepper; profit panel with quote-vs-COGS bar; tabs for Kit (editable, from the catalogue), Expenses, Packing and Activity (stage changes auto-logged). |
| **Expenses** | Always-visible quick-add form; job is picked from a searchable list of existing job codes (never free text, cannot be empty). Captures when / where / who / what / category / why / amount. Filter by job + category, totals, profit rolls up instantly. |
| **Dashboard** | KPI cards, pipeline value by stage, 12-month revenue vs target, sortable job profitability table, Xero sync placeholder. |
| **Truck packing** | Moving a job to **Approved** (drag, button or stepper) auto-generates a checklist from the kit list (never clobbers existing ticks; "Regenerate" available). Greedy heaviest-first zone balancing, per-line zone dropdown, front/rear + left/right split with top-down truck diagram, red flag if either split is worse than 60/40, tick state persisted, **Print checklist** → clean A4 sheet. |
| **Kit catalogue** | Component list with unit weights (feeds the load-balance maths). |

Data lives in `localStorage` (key `lionco-crm-demo:v2`). Use **Reset demo data** (sidebar footer) to restore the seed.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck (tsc -b) + production build into dist/
npm run typecheck
npm test             # vitest: logic, migration, lifecycle and route smoke tests
npm run test:ui      # optional real-browser smoke (needs local Chrome; see docs/CALL_FEATURES.md)
npx vite preview     # serve the production build locally
```

## Branding

Logo files live in `public/brand/` (white variants on the dark sidebar, dark variants on print/light spots, lion mark for the
favicon and empty states). Palette: near-black ink, slate `#626E81`, navy `#172566` as the single accent; green / amber / red
are used *only* for status (margins, load balance). Josefin Sans (headings/nav) and Inter (body) are self-hosted via
`@fontsource` — no runtime calls to Google Fonts. The roadmap card on the dashboard lists v2 ideas (Xero sync, Google review
automation, mobile receipt capture, drone survey uploads, customer portal) and is clearly marked as **not built**.

Stack: Vite + React + TypeScript + Tailwind v4 + react-router (HashRouter) + recharts. Frontend only — `dist/` is
static and deploys as-is to Cloudflare Pages (`public/_redirects` is included too).

Business logic is kept out of the components: `src/lib/loadBalance.ts`, `profit.ts`, `jobCodes.ts`, `checklist.ts`,
`state.ts` (pure state transitions), `seed.ts` (demo data, generated relative to today's date).

## Suggested demo script (~5 min)

1. **Dashboard** – open pipeline value, revenue vs target, and the profitability table sorted worst-first. Point out
   `LC-2026-005` (red, loss-making) and the unbalanced truck alert. Click **Sync with Xero** → "Coming soon… planned for v2".
2. **Pipeline** – walk the stages and try the service-type filter (e.g. Commercial, Drone Services). Click **＋ New enquiry**, note the auto-assigned code that can't be typed, create one.
3. **Approve a job** – on `LC-2026-011` (Quote) click ▶ (or drag it into *Approved*). A toast says "Packing checklist
   generated — view"; click *view*.
4. **Truck Packing** – show the auto-balanced zones (green), change one item's zone with the dropdown and watch the
   percentages/diagram update, then **Regenerate from kit list**. Open `LC-2026-009` to show the **red 75/25 warning**.
   Tick some lines, hit **Print checklist** for the A4 sheet (sidebar and buttons disappear; the dark Lion & Co logo heads the sheet).
5. **Expenses** – the *Fixed job codes* callout; use the quick-add form: try saving with no job (blocked), search "brook" in
   the job picker, pick `LC-2026-007 — 12 Brook St, Marrickville`, save, and jump to the job to see profit drop immediately.
6. **Dashboard roadmap** – the Xero card and the v2 roadmap strip (clearly marked as not built).
7. **Reset demo data** (sidebar) to put everything back before the next run.

## Known limits (it's an MVP demo)

- Single browser, no login, no multi-user sync; data is per-browser `localStorage`.
- Revenue counts jobs in *Paid* / *Google review requested* in the month they were paid, on top of seeded history.
- GST is not modelled — expenses are entered ex GST in AUD.
- The Xero button is a placeholder only.
