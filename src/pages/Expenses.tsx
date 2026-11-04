import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ExpenseForm from '../components/ExpenseForm'
import { Badge, Button, Card, CardHeader, EmptyState, inputCls, PageHeader } from '../components/ui'
import { fmtDate, money, money2 } from '../lib/format'
import { EXPENSE_CATEGORIES } from '../lib/types'
import { useStore } from '../store/StoreProvider'

export default function Expenses() {
  const { state, deleteExpense } = useStore()
  const [jobId, setJobId] = useState('')
  const [category, setCategory] = useState('')

  const jobById = useMemo(() => new Map(state.jobs.map((j) => [j.id, j])), [state.jobs])
  const rows = useMemo(
    () =>
      state.expenses
        .filter((e) => (!jobId || e.jobId === jobId) && (!category || e.category === category))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.expenses, jobId, category],
  )
  const total = rows.reduce((s, e) => s + e.amount, 0)
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ c, v: rows.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) })).filter((x) => x.v > 0)
  const person = (id: string) => state.people.find((p) => p.id === id)?.name ?? '—'
  const jobs = [...state.jobs].sort((a, b) => b.code.localeCompare(a.code))

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Job costs: who spent what, where, when and why" />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">#</span>
        <div className="text-sm text-brand-900">
          <span className="font-bold">Fixed job codes — no more split costs from typos.</span> Every expense is tied to a job code picked from a list, so
          "Brook Street", "Brook St" and "Brook Street 000" can't become three different jobs. Job profit updates the moment an expense is saved.
        </div>
      </div>

      <Card className="mb-5">
        <CardHeader title="Quick add" sub="Job, who, category and date stay put after saving so you can key in a stack of receipts" />
        <div className="p-5">
          <ExpenseForm inline />
        </div>
      </Card>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select className={`${inputCls} max-w-sm`} value={jobId} onChange={(e) => setJobId(e.target.value)} aria-label="Filter by job">
          <option value="">All jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.code} — {j.siteAddress}, {j.suburb}
            </option>
          ))}
        </select>
        <select className={`${inputCls} max-w-[14rem]`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {(jobId || category) && (
          <Button variant="ghost" onClick={() => { setJobId(''); setCategory('') }}>
            Clear filters
          </Button>
        )}
        <div className="ml-auto text-right">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {rows.length} expense{rows.length === 1 ? '' : 's'} {jobId || category ? '(filtered)' : ''}
          </div>
          <div className="tabular text-2xl font-bold text-ink" data-testid="expenses-total">
            {money2(total)}
          </div>
        </div>
      </div>

      {byCat.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {byCat.map((x) => (
            <span key={x.c} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
              {x.c} <span className="tabular font-bold text-ink">{money(x.v)}</span>
            </span>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">When</th>
              <th className="px-3 py-2.5">Job</th>
              <th className="px-3 py-2.5">What</th>
              <th className="px-3 py-2.5">Where</th>
              <th className="px-3 py-2.5">Who</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">Why</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((e) => {
              const j = jobById.get(e.jobId)
              return (
                <tr key={e.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{fmtDate(e.date)}</td>
                  <td className="px-3 py-2">
                    {j ? (
                      <Link to={`/jobs/${j.id}`} className="whitespace-nowrap font-mono text-xs font-bold text-slate-700 hover:text-brand-600">
                        {j.code}
                        <div className="font-sans font-normal text-slate-500">{j.siteAddress}</div>
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">{e.description}</td>
                  <td className="px-3 py-2 text-slate-600">{e.supplier}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{person(e.personId)}</td>
                  <td className="px-3 py-2">
                    <Badge>{e.category}</Badge>
                  </td>
                  <td className="max-w-[14rem] px-3 py-2 text-xs text-slate-500">{e.reason || '—'}</td>
                  <td className="tabular px-4 py-2 text-right font-semibold text-ink">{money2(e.amount)}</td>
                  <td className="pr-3">
                    <button onClick={() => deleteExpense(e.id)} aria-label="Delete expense" title="Delete" className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600">
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState title="No expenses match">Try clearing a filter, or add one above.</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={7} className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">
                  Total
                </td>
                <td className="tabular px-4 py-2.5 text-right text-base font-bold text-ink">{money2(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  )
}
