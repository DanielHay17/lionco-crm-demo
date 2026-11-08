import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ClientDetail from './pages/ClientDetail'
import Clients from './pages/Clients'
import MapPage from './pages/MapPage'
import Catalogue from './pages/Catalogue'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import JobDetail from './pages/JobDetail'
import Jobs from './pages/Jobs'
import Packing from './pages/Packing'
import PackingChecklist from './pages/PackingChecklist'
import Pipeline from './pages/Pipeline'
import Roadmap from './pages/Roadmap'
import Integrations from './pages/Integrations'
import SiteOverview from './pages/SiteOverview'
import SiteDocs from './pages/SiteDocs'
import QuoteBuilder from './pages/QuoteBuilder'
import QuotePreview from './pages/QuotePreview'
import Quotes from './pages/Quotes'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:jobId" element={<JobDetail />} />
        <Route path="jobs/:jobId/docs/:kind" element={<SiteDocs />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="site" element={<SiteOverview />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="packing" element={<Packing />} />
        <Route path="packing/:jobId" element={<PackingChecklist />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:clientId" element={<ClientDetail />} />
        <Route path="map" element={<MapPage />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="quotes/:quoteId" element={<QuoteBuilder />} />
        <Route path="quotes/:quoteId/preview" element={<QuotePreview />} />
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
