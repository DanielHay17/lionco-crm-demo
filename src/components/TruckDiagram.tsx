import { kg } from '../lib/format'
import type { Balance } from '../lib/loadBalance'
import { ZONE_LABEL, type Zone } from '../lib/types'

const QUADS: Record<Zone, { x: number; y: number }> = {
  FL: { x: 58, y: 68 },
  FR: { x: 184, y: 68 },
  RL: { x: 58, y: 176 },
  RR: { x: 184, y: 176 },
}

/** Simple top-down truck: cab at the top (front), tray split into four quadrants. */
export default function TruckDiagram({ balance }: { balance: Balance }) {
  const { zoneKg, totalKg } = balance
  const col = (ok: boolean) => (totalKg === 0 ? '#94a3b8' : ok ? '#059669' : '#dc2626')
  const frCol = col(balance.frontRearOk)
  const lrCol = col(balance.leftRightOk)
  return (
    <svg viewBox="0 0 372 336" className="mx-auto w-full max-w-[360px]" role="img" aria-label={`Truck load ${kg(totalKg)}`}>
      <rect x={100} y={4} width={160} height={48} rx={14} fill="#334155" />
      <text x={180} y={33} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fbbf24" letterSpacing="2">
        CAB · FRONT
      </text>
      {[80, 200].map((y) => (
        <g key={y}>
          <rect x={38} y={y} width={11} height={40} rx={3} fill="#1e293b" />
          <rect x={311} y={y} width={11} height={40} rx={3} fill="#1e293b" />
        </g>
      ))}
      <rect x={50} y={60} width={260} height={218} rx={10} fill="#f1f5f9" stroke="#334155" strokeWidth={2} />
      {(Object.keys(QUADS) as Zone[]).map((z) => {
        const { x, y } = QUADS[z]
        const share = totalKg > 0 ? zoneKg[z] / totalKg : 0
        const heavy = share > 0.3
        return (
          <g key={z} data-testid={`quad-${z}`}>
            <rect
              x={x}
              y={y}
              width={118}
              height={102}
              rx={6}
              fill={`rgba(245,158,11,${0.1 + share * 1.1})`}
              stroke={heavy ? '#b45309' : '#94a3b8'}
              strokeWidth={heavy ? 2 : 1}
            />
            <text x={x + 59} y={y + 24} textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">
              {ZONE_LABEL[z]}
            </text>
            <text x={x + 59} y={y + 55} textAnchor="middle" fontSize="19" fontWeight="800" fill="#0f172a">
              {zoneKg[z].toLocaleString('en-AU', { maximumFractionDigits: 0 })} kg
            </text>
            <text x={x + 59} y={y + 78} textAnchor="middle" fontSize="12" fill="#475569">
              {(share * 100).toFixed(0)}%
            </text>
          </g>
        )
      })}
      <text x={180} y={296} textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b" letterSpacing="2">
        REAR
      </text>
      {[
        { y: 118, a: 'FRONT', b: balance.frontPct },
        { y: 228, a: 'REAR', b: balance.rearPct },
      ].map((t) => (
        <text key={t.a} x={346} y={t.y} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={frCol}>
          <tspan x={346}>{t.a}</tspan>
          <tspan x={346} dy={14} fontSize="13">
            {t.b.toFixed(0)}%
          </tspan>
        </text>
      ))}
      <text x={117} y={326} textAnchor="middle" fontSize="11" fontWeight="700" fill={lrCol}>
        Left {balance.leftPct.toFixed(0)}%
      </text>
      <text x={243} y={326} textAnchor="middle" fontSize="11" fontWeight="700" fill={lrCol}>
        Right {balance.rightPct.toFixed(0)}%
      </text>
    </svg>
  )
}
