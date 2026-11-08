import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { buildSeed } from './lib/seed'
import { StoreProvider } from './store/StoreProvider'

const seed = buildSeed(new Date())
const render = (path: string) =>
  renderToString(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  )

const jobTabs = ['kit', 'quote', 'variations', 'expenses', 'packing', 'return', 'site', 'activity']
const routes: [string, RegExp][] = [
  ['/', /Operations attention/],
  ['/pipeline', /Declined/],
  ['/jobs', /Jobs/],
  ...seed.jobs.slice(0, 19).map((j): [string, RegExp] => [`/jobs/${j.id}`, new RegExp(j.code)]),
  ...jobTabs.map((t): [string, RegExp] => [`/jobs/job-6?tab=${t}`, /LC-2026-006/]),
  ['/jobs/job-6/docs/folder', /NOT COMPLIANCE-APPROVED/],
  ['/jobs/job-6/docs/handover', /NOT A SAFETY CERTIFICATE/],
  ['/jobs/job-6/docs/neighbour', /Neighbouring-property consent/],
  ['/clients', /LTV booked/],
  ...seed.clients.map((c): [string, RegExp] => [`/clients/${c.id}`, /Contacts/]),
  ['/quotes', /Quotes/],
  ...seed.quotes.map((q): [string, RegExp] => [`/quotes/${q.id}`, /SIMULATED/]),
  ['/quotes/q-6/preview', /CUSTOMER PREVIEW/],
  ['/map', /ILLUSTRATIVE/],
  ['/site', /DEMO REMINDER/],
  ['/catalogue', /Crew formula calculator/],
  ['/packing', /Truck Packing/],
  ['/packing/job-6', /Packing checklist/],
  ['/expenses', /Expenses/],
  ['/roadmap', /no secure authentication/i],
  ...['sop', 'drone', 'bi', 'followup'].map((t): [string, RegExp] => [`/roadmap?tab=${t}`, /Future Scope/]),
  ...['xero', 'gmail', 'whatsapp', 'capture', 'myob'].map((t): [string, RegExp] => [`/integrations?tab=${t}`, /disconnected/i]),
]

describe('every route renders against the seed state', () => {
  it.each(routes)('%s', (path, expected) => {
    const html = render(path)
    expect(html).toMatch(expected)
    expect(html).not.toMatch(/NaN|Infinity|undefined/)
  })

  it('customer quote preview never leaks internal costs, profit or margin', () => {
    const html = render('/quotes/q-6/preview')
    const doc = html.slice(html.indexOf('<article'), html.indexOf('</article>'))
    expect(doc.length).toBeGreaterThan(500)
    expect(doc).not.toMatch(/margin|profit|cost|expense total/i)
    expect(doc).toMatch(/Total \(ex GST\)/)
  })

  it('unknown quote / job ids redirect rather than crash', () => {
    expect(() => render('/quotes/nope')).not.toThrow()
    expect(() => render('/jobs/nope')).not.toThrow()
    expect(() => render('/clients/nope')).not.toThrow()
  })
})
