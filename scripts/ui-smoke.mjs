#!/usr/bin/env node
/**
 * Local UI smoke test (not part of `npm test`): drives the real app in headless Chrome against a local Vite dev server.
 * Covers: create fictional client → job → kit → quote → issue → approve → packing link → client/map link →
 * customer print preview (no costs/margins) → localStorage persistence → 390px mobile overflow check.
 *
 *   npm run test:ui                 # uses CHROME_PATH or a system Chrome/Chromium
 *   CHROME_PATH=/path/to/chrome npm run test:ui
 *
 * No network, accounts or external services are used. Exits 0 with a SKIP message if no Chrome is installed.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const PORT = Number(process.env.UI_SMOKE_PORT ?? 5391)
const BASE = `http://127.0.0.1:${PORT}/`
const CHROME = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && existsSync(p))
if (!CHROME) {
  console.log('SKIP ui-smoke: no Chrome/Chromium found (set CHROME_PATH).')
  process.exit(0)
}

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? `  → ${detail}` : ''}`)
  if (!ok) throw new Error(`Check failed: ${name} ${detail}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
let browser
const cleanup = async () => {
  try { await browser?.close() } catch { /* ignore */ }
  server.kill()
}
process.on('SIGINT', () => cleanup().then(() => process.exit(130)))

try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) break } catch { /* not up yet */ }
    await sleep(250)
    if (i === 59) throw new Error('dev server did not start')
  }
  browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  page.on('dialog', (d) => d.dismiss())

  const go = async (hash) => { await page.evaluate((h) => { location.hash = h }, hash); await sleep(350) }
  const clickText = async (sel, text) => {
    for (let i = 0; i < 40; i++) {
      const ok = await page.evaluate((s, t) => {
        const el = [...document.querySelectorAll(s)].find((e) => e.textContent.replace(/\s+/g, ' ').includes(t) && e.getBoundingClientRect().width > 0 && !e.disabled)
        if (!el) return false
        el.click()
        return true
      }, sel, text)
      if (ok) return sleep(250)
      await sleep(100)
    }
    throw new Error(`no element ${sel} with text "${text}"`)
  }
  const setValue = async (sel, value, blur = false) => {
    for (let i = 0; i < 40; i++) {
      const ok = await page.evaluate((s, v, b) => {
        const el = document.querySelector(s)
        if (!el) return false
        el.focus()
        const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
        el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
        if (b) el.blur()
        return true
      }, sel, value, blur)
      if (ok) return sleep(150)
      await sleep(100)
    }
    throw new Error(`no element ${sel}`)
  }
  const store = () => page.evaluate(() => JSON.parse(localStorage.getItem('lionco-crm-demo:v2')))

  // ---- fresh start on the seed ----
  await page.goto(BASE, { waitUntil: 'load' })
  await page.evaluate(() => localStorage.clear())
  await go('#/clients')
  await page.reload()
  await sleep(500)
  check('clients page renders seed clients', (await page.$$eval('tbody tr', (r) => r.length)) >= 10)

  // ---- create fictional client ----
  await clickText('button', 'New client')
  await setValue('[role=dialog] input', 'UI Smoke Builders (fictional)')
  await setValue('[role=dialog] input[type=email]', 'smoke@example.com')
  await page.evaluate(() => { const el = document.querySelectorAll('[role=dialog] .grid input')[0]; el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'Sam Smoke'); el.dispatchEvent(new Event('input', { bubbles: true })) })
  await clickText('[role=dialog] button', 'Create client')
  check('client created and detail opened', /#\/clients\/cl-/.test(await page.evaluate(() => location.hash)))
  const clientId = (await page.evaluate(() => location.hash)).split('/').pop()
  check('new client has zero LTV, no NaN', !(await page.evaluate(() => document.body.innerText)).includes('NaN'))

  // ---- create job for that client (buyer prefilled), site manager ----
  await clickText('button', 'New job for this client')
  await setValue('[role=dialog] input[placeholder="12 Example St"]', '9 Smoke Test Rd')
  await setValue('[role=dialog] input[placeholder="Marrickville"]', 'Newtown')
  await clickText('[role=dialog] button', 'Create enquiry')
  const jobId = (await page.evaluate(() => location.hash)).split('/').pop()
  check('job created with next sequential demo number', /^LC-2026-0\d\d$/.test(await page.$eval('[data-testid=job-code]', (e) => e.textContent)))
  let s = await store()
  const job0 = s.jobs.find((j) => j.id === jobId)
  check('job linked to client with buyer contact role', job0.clientId === clientId && s.clients.find((c) => c.id === clientId).contacts.some((c) => c.id === job0.buyerContactId && c.role === 'Buyer'))

  // ---- kit ----
  for (const [item, qty] of [['std20', '10'], ['plank24', '20'], ['base', '12']]) {
    await setValue('select[aria-label="Add kit item"]', item)
    await setValue('input[aria-label="Quantity to add"]', qty)
    await clickText('button', 'Add')
    await page.evaluate(() => {})
  }
  s = await store()
  check('kit has 3 lines', s.jobs.find((j) => j.id === jobId).kit.length === 3)

  // ---- quote from kit ----
  await clickText('[role=tab]', 'Quote')
  await clickText('button', 'Build quote from kit')
  check('quote builder opened', /#\/quotes\//.test(await page.evaluate(() => location.hash)))
  const quoteId = (await page.evaluate(() => location.hash)).split('/').pop()
  const margin1 = await page.$eval('[data-testid=quote-margin]', (e) => e.textContent)
  check('margin shown as a percentage', /^\d+(\.\d)?%$/.test(margin1), margin1)
  await setValue('input[aria-label="Hire period in weeks"]', '6', true)
  await setValue('input[aria-label="Rental weeks for Standard 2.0m"]', '2', true)
  await clickText('button', '＋ Transport')
  await setValue('input[aria-label="Sell price for Truck delivery & collection"]', '400', true)
  await setValue('input[aria-label="Cost for Truck delivery & collection"]', '230', true)
  await clickText('label', 'Request a deposit')
  await clickText('button', 'Save quote')
  s = await store()
  const q = s.quotes.find((x) => x.id === quoteId)
  check('quote saved with hire weeks, per-line weeks override, transport line and deposit', q.hireWeeks === 6 && q.lines.find((l) => l.itemId === 'std20').weeks === 2 && q.lines.some((l) => l.kind === 'transport' && l.unitPrice === 400 && l.unitCost === 230) && q.depositEnabled)
  const body1 = await page.evaluate(() => document.body.innerText)
  check('deposit shown on builder', /Deposit \$[\d,.]+ · balance \$[\d,.]+/.test(body1))

  // ---- issue → approve ----
  await clickText('button', 'Issue quote (simulated)')
  s = await store()
  check('issue is simulated: job at Quote, quote issued, mock Xero queue item', s.jobs.find((j) => j.id === jobId).stage === 'Quote' && s.quotes.find((x) => x.id === quoteId).status === 'issued' && s.syncQueue.some((x) => x.jobId === jobId))
  check('toast says simulated / no email sent', /SIMULATED, no email sent/.test(await page.evaluate(() => document.body.innerText)))
  await clickText('button', 'Customer approves')
  s = await store()
  const jobA = s.jobs.find((j) => j.id === jobId)
  check('approved: job Approved, kit from quote, packing list generated', jobA.stage === 'Approved' && jobA.kit.length === 3 && !!s.checklists[jobId])

  // ---- packing link from toast ----
  await clickText('[role=status] a', 'Open packing')
  check('packing checklist page opened', (await page.evaluate(() => location.hash)).includes(`/packing/${jobId}`) && /Packing checklist/.test(await page.$eval('h1', (e) => e.textContent)))

  // ---- client link + map bubble ----
  await go(`#/jobs/${jobId}`)
  await clickText('dl a', 'UI Smoke Builders')
  check('client link from job', (await page.evaluate(() => location.hash)).endsWith(clientId))
  const t = await page.$$eval('main .tabular', (e) => e.slice(0, 3).map((x) => x.textContent))
  check('client LTV counts the approved job', t[0] !== '$0', t.join(','))
  const jobCode = await page.evaluate((id) => JSON.parse(localStorage.getItem('lionco-crm-demo:v2')).jobs.find((j) => j.id === id).code, jobId)
  await clickText('button', jobCode)
  await sleep(300)
  check('map list opens the job', (await page.evaluate(() => location.hash)).endsWith(jobId))
  await go('#/map')
  await sleep(800)
  check('company map is OpenStreetMap with job pins', await page.evaluate(() => !!document.querySelector('.leaflet-container') && /openstreetmap\.org\/copyright/.test(document.body.innerHTML) && document.querySelectorAll('.leaflet-interactive, .job-count-marker').length >= 1))

  // ---- Kanban: columns, buttons and real HTML5 drag/drop ----
  await go('#/pipeline')
  await sleep(300)
  const code = await page.evaluate((id) => JSON.parse(localStorage.getItem('lionco-crm-demo:v2')).jobs.find((j) => j.id === id).code, jobId)
  check('kanban has a column per stage + Declined (13)', (await page.$$eval('[data-testid^=col-]', (c) => c.length)) === 13)
  check('new job card sits in the Approved column', await page.evaluate((c) => !!document.querySelector(`[data-testid="col-Approved"] [data-testid="card-${c}"]`), code))
  await page.evaluate((c) => document.querySelector(`[data-testid="card-${c}"] button[aria-label*="forward"]`).click(), code)
  await sleep(300)
  check('▶ button advances the job to Job in progress', (await store()).jobs.find((j) => j.id === jobId).stage === 'Job in progress')
  await page.evaluate((c) => {
    const card = document.querySelector(`[data-testid="card-${c}"]`)
    const col = document.querySelector('[data-testid="col-Build booked"]')
    const dt = new DataTransfer()
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
    col.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
    col.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
  }, code)
  await sleep(400)
  s = await store()
  const jb = s.jobs.find((j) => j.id === jobId)
  check('drag-and-drop moves the card to Build booked and stamps a build date', jb.stage === 'Build booked' && !!jb.dates.buildDate)
  await page.evaluate((c) => {
    const card = document.querySelector(`[data-testid="card-${c}"]`)
    const dt = new DataTransfer()
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
    const col = document.querySelector('[data-testid="col-Declined"]')
    col.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
    col.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
  }, code)
  await sleep(400)
  check('dropping on Declined asks for a reason (dialog)', await page.evaluate(() => !!document.querySelector('[role=dialog]')))
  await clickText('[role=dialog] button', 'Cancel')

  // ---- customer preview excludes internals ----
  await go(`#/quotes/${quoteId}/preview`)
  const doc = await page.$eval('article', (e) => e.innerText)
  check('print preview has total and no cost/margin/profit text', /Total \(ex GST\)/.test(doc) && !/margin|profit|cost|expense total/i.test(doc), doc.slice(0, 80))

  // ---- persistence across reload ----
  await page.reload()
  await sleep(500)
  s = await store()
  check('state persists across reload', s.jobs.some((j) => j.id === jobId && j.stage === 'Build booked'))

  // ---- mobile 390px: no horizontal page overflow, menu opens ----
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  const routes = ['/', '/pipeline', '/jobs', `/jobs/${jobId}`, `/jobs/${jobId}?tab=quote`, `/jobs/${jobId}?tab=site`, `/jobs/${jobId}?tab=variations`, '/clients', `/clients/${clientId}`, '/quotes', `/quotes/${quoteId}`, `/quotes/${quoteId}/preview`, '/map', '/analytics', '/site', '/catalogue', '/packing', `/packing/${jobId}`, '/expenses', '/integrations?tab=xero', '/integrations?tab=capture', '/roadmap', '/roadmap?tab=bi', `/jobs/${jobId}/docs/handover`]
  for (const r of routes) {
    await go(`#${r}`)
    await sleep(150)
    const sw = await page.evaluate(() => document.documentElement.scrollWidth)
    check(`390px no horizontal overflow: ${r}`, sw <= 391, `scrollWidth=${sw}`)
  }
  await go('#/')
  await clickText('header button', 'Menu')
  check('mobile menu opens with navigation', (await page.$$eval('#mobile-nav a', (a) => a.length)) >= 10)

  check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '))
  console.log(`\nui-smoke OK — ${results.length} checks passed`)
  await cleanup()
  process.exit(0)
} catch (e) {
  console.error(`\nui-smoke FAILED: ${e.message}`)
  await cleanup()
  process.exit(1)
}
