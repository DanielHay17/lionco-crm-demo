import { kg } from '../lib/format'
import type { Balance } from '../lib/loadBalance'
import { ZONE_LABEL, type Zone } from '../lib/types'

const QUADS: Record<Zone, { x: number; y: number }> = {
  FL: { x: 82, y: 88 },
  FR: { x: 196, y: 88 },
  RL: { x: 82, y: 206 },
  RR: { x: 196, y: 206 },
}
const GREEN = '#059669'
const RED = '#dc2626'

/** Top-down truck: cab at the top (front), tray split into four weighed quadrants. */
export default function TruckDiagram({ balance, compact = false }: { balance: Balance; compact?: boolean }) {
  const { zoneKg, totalKg } = balance
  const axisCol = (ok: boolean) => (totalKg === 0 ? '#94a3b8' : ok ? GREEN : RED)
  const frCol = axisCol(balance.frontRearOk)
  const lrCol = axisCol(balance.leftRightOk)
  const heavyFront = balance.frontPct > balance.rearPct
  const heavyLeft = balance.leftPct > balance.rightPct
  const inHeavyHalf = (z: Zone) =>
    (!balance.frontRearOk && (z[0] === 'F') === heavyFront) || (!balance.leftRightOk && (z[1] === 'L') === heavyLeft)

  return (
    <svg viewBox="0 0 390 352" className={`mx-auto w-full ${compact ? 'max-w-[250px]' : 'max-w-[380px]'}`} role="img" aria-label={`Truck load ${kg(totalKg)}`}>
      {/* cab */}
      <rect x={112} y={6} width={162} height={66} rx={18} fill="#1f2430" />
      <rect x={126} y={14} width={134} height={20} rx={8} fill="#cbd5e1" opacity={0.9} />
      <rect x={96} y={24} width={14} height={10} rx={3} fill="#1f2430" />
      <rect x={276} y={24} width={14} height={10} rx={3} fill="#1f2430" />
      <text x={193} y={58} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" letterSpacing="2.5">
        ▲ FRONT
      </text>
      {/* wheels */}
      {[104, 250].map((y) => (
        <g key={y}>
          <rect x={64} y={y} width={13} height={46} rx={4} fill="#1f2430" />
          <rect x={311} y={y} width={13} height={46} rx={4} fill="#1f2430" />
        </g>
      ))}
      {/* tray */}
      <rect x={72} y={78} width={246} height={248} rx={10} fill="#e8eaee" stroke="#1f2430" strokeWidth={3} />
      {(Object.keys(QUADS) as Zone[]).map((z) => {
        const { x, y } = QUADS[z]
        const share = totalKg > 0 ? zoneKg[z] / totalKg : 0
        const dark = share > 0.3
        const flagged = inHeavyHalf(z)
        return (
          <g key={z} data-testid={`quad-${z}`}>
            <rect
              x={x}
              y={y}
              width={112}
              height={112}
              rx={7}
              fill={`rgba(23,37,102,${0.07 + share * 1.15})`}
              stroke={flagged ? RED : '#8a94a6'}
              strokeWidth={flagged ? 2.5 : 1}
              className="transition-all duration-300"
            />
            <text x={x + 56} y={y + 26} textAnchor="middle" fontSize="11" fontWeight="600" fill={dark ? '#dbe0f5' : '#475569'}>
              {ZONE_LABEL[z]}
            </text>
            <text x={x + 56} y={y + 59} textAnchor="middle" fontSize="20" fontWeight="800" fill={dark ? '#fff' : '#101215'}>
              {zoneKg[z].toLocaleString('en-AU', { maximumFractionDigits: 0 })} kg
            </text>
            <text x={x + 56} y={y + 82} textAnchor="middle" fontSize="13" fontWeight="600" fill={dark ? '#dbe0f5' : '#475569'}>
              {(share * 100).toFixed(0)}%
            </text>
          </g>
        )
      })}
      <text x={195} y={344} textAnchor="middle" fontSize="10" fontWeight="700" fill="#64748b" letterSpacing="2.5">
        REAR ▼
      </text>
      {[
        { y: 150, a: 'FRONT', b: balance.frontPct },
        { y: 268, a: 'REAR', b: balance.rearPct },
      ].map((t) => (
        <text key={t.a} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={frCol}>
          <tspan x={356} y={t.y}>
            {t.a}
          </tspan>
          <tspan x={356} dy={16} fontSize="15">
            {t.b.toFixed(0)}%
          </tspan>
        </text>
      ))}
      <text x={20} y={150} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={lrCol}>
        <tspan x={30} y={150}>
          LEFT
        </tspan>
        <tspan x={30} dy={16} fontSize="15">
          {balance.leftPct.toFixed(0)}%
        </tspan>
      </text>
      <text x={20} y={268} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={lrCol}>
        <tspan x={30} y={268}>
          RIGHT
        </tspan>
        <tspan x={30} dy={16} fontSize="15">
          {balance.rightPct.toFixed(0)}%
        </tspan>
      </text>
    </svg>
  )
}
