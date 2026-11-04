import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import TruckDiagram from '../components/TruckDiagram'
import { Badge, Button, Card, CardHeader, ConfirmModal } from '../components/ui'
import { checklistBalance, checklistProgress } from '../lib/checklist'
import { fmtDate, kg } from '../lib/format'
import { lineWeight, MAX_SIDE_PCT } from '../lib/loadBalance'
import { checklistIsStale, findJob } from '../lib/state'
import { ZONE_LABEL, ZONES, type Zone } from '../lib/types'
import { useStore } from '../store/StoreProvider'

export default function PackingChecklist() {
  const { jobId } = useParams()
  const store = useStore()
  const { state } = store
  const [confirm, setConfirm] = useState(false)
  const job = findJob(state, jobId)
  const checklist = job ? state.checklists[job.id] : undefined

  if (!job || !checklist) {
    return (
      <Card className="p-8 text-center text-slate-600">
        <p>No packing checklist exists for this job yet.</p>
        {job && job.kit.length > 0 && (
          <Button className="mt-3" variant="primary" onClick={() => store.regenerateChecklist(job.id)}>
            Generate from kit list
          </Button>
        )}
        <div className="mt-3">
          <Link to="/packing" className="font-semibold text-amber-700">
            ← All checklists
          </Link>
        </div>
      </Card>
    )
  }

  const balance = checklistBalance(checklist)
  const progress = checklistProgress(checklist)
  const stale = checklistIsStale(state, job)
  const lines = checklist.lines
  const today = new Date()

  return (
    <div>
      {/* ---------------- screen UI ---------------- */}
      <div className="no-print">
        <div className="mb-4 text-sm text-slate-500">
          <Link to="/packing" className="hover:text-slate-800">
            Truck Packing
          </Link>{' '}
          / <span className="font-mono font-semibold text-slate-700">{job.code}</span>
        </div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Packing checklist · {job.client}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              <Link to={`/jobs/${job.id}`} className="font-mono font-bold text-slate-700 hover:text-amber-700">
                {job.code}
              </Link>{' '}
              · {job.siteAddress}, {job.suburb} · generated {fmtDate(checklist.generatedAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setConfirm(true)}>↻ Regenerate from kit list</Button>
            <Button variant="primary" onClick={() => window.print()}>
              🖨 Print checklist
            </Button>
          </div>
        </div>

        {stale && (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
            The job's kit list has changed since this checklist was generated. Use <b>Regenerate from kit list</b> to pick up the changes (this resets ticks).
          </div>
        )}

        <div className="grid grid-cols-5 gap-4">
          <Card className="col-span-3 overflow-hidden">
            <CardHeader
              title="Pack list"
              sub={`${progress.done}/${progress.total} lines ticked · ${kg(balance.totalKg)} total`}
              right={progress.total > 0 && progress.done === progress.total ? <Badge tone="green">✓ All packed</Badge> : undefined}
            />
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-2">✓</th>
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Unit kg</th>
                  <th className="px-2 py-2 text-right">Line kg</th>
                  <th className="px-3 py-2">Truck zone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l) => (
                  <tr key={l.id} className={l.ticked ? 'bg-emerald-50/50 text-slate-400' : ''}>
                    <td className="px-4 py-1.5">
                      <input
                        type="checkbox"
                        checked={l.ticked}
                        onChange={() => store.toggleLine(job.id, l.id)}
                        aria-label={`Packed: ${l.qty} × ${l.name} (${ZONE_LABEL[l.zone]})`}
                        className="h-[18px] w-[18px] cursor-pointer accent-amber-500"
                      />
                    </td>
                    <td className={`px-2 py-1.5 font-medium ${l.ticked ? 'line-through' : 'text-slate-800'}`}>{l.name}</td>
                    <td className="tabular px-2 py-1.5 text-right font-semibold">{l.qty}</td>
                    <td className="tabular px-2 py-1.5 text-right">{l.unitWeightKg}</td>
                    <td className="tabular px-2 py-1.5 text-right">{kg(lineWeight(l.unitWeightKg, l.qty))}</td>
                    <td className="px-3 py-1.5">
                      <select
                        value={l.zone}
                        onChange={(e) => store.setLineZone(job.id, l.id, e.target.value as Zone)}
                        aria-label={`Zone for ${l.name}`}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-amber-500 focus:outline-none"
                      >
                        {ZONES.map((z) => (
                          <option key={z} value={z}>
                            {ZONE_LABEL[z]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm font-bold">
                  <td colSpan={4} className="px-4 py-2 text-right text-xs uppercase text-slate-500">
                    Total weight
                  </td>
                  <td className="tabular px-2 py-2 text-right">{kg(balance.totalKg)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </Card>

          <div className="col-span-2 space-y-4">
            <Card>
              <CardHeader
                title="Truck balance"
                sub={`Limit: ${MAX_SIDE_PCT}/${100 - MAX_SIDE_PCT} front-rear and left-right`}
                right={balance.status === 'warning' ? <Badge tone="red">⚠ Unbalanced</Badge> : <Badge tone="green">✓ Balanced</Badge>}
              />
              <div className="p-4">
                <TruckDiagram balance={balance} />
                <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                  <Split label="Front / Rear" a={balance.frontPct} b={balance.rearPct} ok={balance.frontRearOk} />
                  <Split label="Left / Right" a={balance.leftPct} b={balance.rightPct} ok={balance.leftRightOk} />
                </div>
                {balance.warnings.map((w) => (
                  <p key={w} className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200" role="alert">
                    ⚠ {w} Move items between zones using the dropdowns, or regenerate to auto-balance.
                  </p>
                ))}
                {balance.status === 'ok' && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                    ✓ Load is within the {MAX_SIDE_PCT}/{100 - MAX_SIDE_PCT} limit on both axes.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ---------------- printable A4 sheet ---------------- */}
      <div className="print-sheet" data-testid="print-sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #000', paddingBottom: 6 }}>
          <div>
            <h1>LIONCO SCAFFOLDING</h1>
            <div style={{ fontSize: '11pt', fontWeight: 700 }}>Truck Packing Checklist</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10pt' }}>Printed {fmtDate(today.toISOString())}</div>
        </div>
        <table style={{ margin: '10px 0' }}>
          <tbody>
            <tr>
              <th style={{ width: '16%' }}>Job code</th>
              <td style={{ width: '34%', fontWeight: 700 }}>{job.code}</td>
              <th style={{ width: '16%' }}>Truck rego</th>
              <td style={{ width: '34%' }}>&nbsp;</td>
            </tr>
            <tr>
              <th>Client</th>
              <td>{job.client}</td>
              <th>Driver</th>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <th>Site</th>
              <td>
                {job.siteAddress}, {job.suburb} NSW
              </td>
              <th>Departure</th>
              <td>&nbsp;</td>
            </tr>
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }}>✓</th>
              <th>Item</th>
              <th className="num">Qty</th>
              <th className="num">Unit kg</th>
              <th className="num">Line kg</th>
              <th>Truck zone</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td style={{ textAlign: 'center' }}>
                  <span className="print-box">{l.ticked ? '✓' : ''}</span>
                </td>
                <td>{l.name}</td>
                <td className="num">{l.qty}</td>
                <td className="num">{l.unitWeightKg}</td>
                <td className="num">{lineWeight(l.unitWeightKg, l.qty).toFixed(1)}</td>
                <td>{ZONE_LABEL[l.zone]}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="num" style={{ fontWeight: 700 }}>
                TOTAL WEIGHT
              </td>
              <td className="num" style={{ fontWeight: 700 }}>
                {balance.totalKg.toFixed(1)} kg
              </td>
              <td />
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 12, breakInside: 'avoid' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Load balance — {balance.status === 'warning' ? 'WARNING: outside 60/40 limit' : 'within 60/40 limit'}
          </div>
          <table>
            <thead>
              <tr>
                {ZONES.map((z) => (
                  <th key={z} className="num">
                    {ZONE_LABEL[z]}
                  </th>
                ))}
                <th className="num">Front / Rear</th>
                <th className="num">Left / Right</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {ZONES.map((z) => (
                  <td key={z} className="num">
                    {balance.zoneKg[z].toFixed(1)} kg
                  </td>
                ))}
                <td className="num">
                  {balance.frontPct.toFixed(0)}% / {balance.rearPct.toFixed(0)}%
                </td>
                <td className="num">
                  {balance.leftPct.toFixed(0)}% / {balance.rightPct.toFixed(0)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 28, display: 'flex', gap: 24, breakInside: 'avoid' }}>
          {['Packed by', 'Checked by', 'Driver signature', 'Date'].map((l) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ borderBottom: '1px solid #000', height: 26 }} />
              <div style={{ fontSize: '9pt', marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Regenerate from kit list?"
        confirmLabel="Regenerate"
        message="This rebuilds the checklist from the job's current kit list, re-balances the truck zones and clears all tick-offs."
        onConfirm={() => store.regenerateChecklist(job.id)}
      />
    </div>
  )
}

function Split({ label, a, b, ok }: { label: string; a: number; b: number; ok: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ring-1 ${ok ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-red-50 text-red-800 ring-red-300'}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="tabular text-xl font-extrabold">
        {a.toFixed(0)} / {b.toFixed(0)}
      </div>
    </div>
  )
}
