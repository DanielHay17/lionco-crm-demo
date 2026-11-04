# Lionco CRM Demo

Clickable MVP demo of a simple in-house "pseudo-Salesforce" CRM/ERP for **Lionco Scaffolding** (Sydney):
pipeline, job costing with fixed job codes, a CEO dashboard and truck packing checklists.

> **Demo data disclaimer:** every client, person, address, phone number, email, supplier and dollar figure in this
> app is made-up example data. No real Lionco data is included. There is no backend, no accounts and no network
> calls (the "Xero sync" button is a placeholder).

## What's in it

| Area | What it does |
| --- | --- |
| **Pipeline** | Kanban: Enquiry → Quote → Approved → Job in progress → Invoiced → Paid → Google review requested. Drag-and-drop *or* ◀ / ▶ buttons on every card. Column count + total value. New enquiries get an auto-generated fixed code (`LC-2026-015`…). |
| **Job detail** | Client/contact, site, stage stepper, editable quote, editable kit list (from the catalogue), expenses, profit & margin, packing checklist link, activity timeline (stage changes auto-logged). |
| **Expenses** | Job is picked from existing job codes (never free text, cannot be empty). Captures when / where / who / what / category / why / amount. Filter by job + category, totals, profit rolls up instantly. |
| **Dashboard** | KPI cards, pipeline value by stage, 12-month revenue vs target, sortable job profitability table, Xero sync placeholder. |
| **Truck packing** | Moving a job to **Approved** (drag, button or stepper) auto-generates a checklist from the kit list (never clobbers existing ticks; "Regenerate" available). Greedy heaviest-first zone balancing, per-line zone dropdown, front/rear + left/right split with top-down truck diagram, red flag if either split is worse than 60/40, tick state persisted, **Print checklist** → clean A4 sheet. |
| **Kit catalogue** | Component list with unit weights (feeds the load-balance maths). |

Data lives in `localStorage` (key `lionco-crm-demo:v1`). Use **Reset demo data** (sidebar footer) to restore the seed.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck (tsc -b) + production build into dist/
npm run typecheck
npm test             # vitest: load-balance, profit, job-code and state tests
npx vite preview     # serve the production build locally
```

Stack: Vite + React + TypeScript + Tailwind v4 + react-router (HashRouter) + recharts. Frontend only — `dist/` is
static and deploys as-is to Cloudflare Pages (`public/_redirects` is included too).

Business logic is kept out of the components: `src/lib/loadBalance.ts`, `profit.ts`, `jobCodes.ts`, `checklist.ts`,
`state.ts` (pure state transitions), `seed.ts` (demo data, generated relative to today's date).

## Suggested demo script (~5 min)

1. **Dashboard** – open pipeline value, revenue vs target, and the profitability table sorted worst-first. Point out
   `LC-2026-005` (red, loss-making) and the unbalanced truck alert. Click **Sync with Xero** → "Coming soon… planned for v2".
2. **Pipeline** – walk the stages. Click **＋ New enquiry**, note the auto-assigned code that can't be typed, create one.
3. **Approve a job** – on `LC-2026-011` (Quote) click ▶ (or drag it into *Approved*). A toast says the packing
   checklist was generated; open it from the toast.
4. **Truck Packing** – show the auto-balanced zones (green), change one item's zone with the dropdown and watch the
   percentages/diagram update, then **Regenerate from kit list**. Open `LC-2026-009` to show the **red 75/25 warning**.
   Tick some lines, hit **Print checklist** for the A4 sheet (sidebar and buttons disappear).
5. **Expenses** – the *Fixed job codes* callout; **＋ Log expense**: try saving with no job (blocked), then pick
   `LC-2026-007 — 12 Brook St, Marrickville`, save, and jump to the job to see profit drop immediately.
6. **Reset demo data** (sidebar) to put everything back before the next run.

## Known limits (it's an MVP demo)

- Single browser, no login, no multi-user sync; data is per-browser `localStorage`.
- Revenue counts jobs in *Paid* / *Google review requested* in the month they were paid, on top of seeded history.
- GST is not modelled — expenses are entered ex GST in AUD.
- The Xero button is a placeholder only.
