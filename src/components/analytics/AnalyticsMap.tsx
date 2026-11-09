import { useEffect, useState, type ComponentType } from 'react'
import type { SydneyMapProps } from './SydneyMap'

/**
 * Loads Leaflet only after the page is in the browser. renderToString (route smoke tests)
 * and the first HTML from Cloudflare Pages never execute this import.
 */
export default function AnalyticsMap(props: SydneyMapProps) {
  const [MapView, setMapView] = useState<ComponentType<SydneyMapProps> | null>(null)
  useEffect(() => {
    let live = true
    void import('./SydneyMap').then((mod) => {
      if (live) setMapView(() => mod.SydneyMap)
    })
    return () => {
      live = false
    }
  }, [])
  if (!MapView) {
    return (
      <div className="grid h-full place-items-center bg-[#e8eef6] px-6 text-center text-sm text-slate-600" role="status">
        Loading the Sydney map…
      </div>
    )
  }
  return <MapView {...props} />
}
