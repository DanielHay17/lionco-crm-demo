import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Catalogue from './pages/Catalogue'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import JobDetail from './pages/JobDetail'
import Jobs from './pages/Jobs'
import Packing from './pages/Packing'
import PackingChecklist from './pages/PackingChecklist'
import Pipeline from './pages/Pipeline'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:jobId" element={<JobDetail />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="packing" element={<Packing />} />
        <Route path="packing/:jobId" element={<PackingChecklist />} />
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
