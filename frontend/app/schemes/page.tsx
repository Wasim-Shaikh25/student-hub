import { getSchemes } from '@/lib/queries'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function toCrores(paise: number | undefined): string {
  if (!paise) return '0'
  return (paise / 1000000000).toFixed(2)
}

export default async function SchemesPage() {
  const schemes = (await getSchemes()) as {
    id?: number
    scheme_name?: string
    scheme_id?: string
    source_name?: string
    financial_year?: string
    amount_allocated?: number
    amount_spent?: number
    applicable_state_id?: number
    data_confidence?: number
    extracted_at?: string
  }[]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Government Schemes</h1>
        <p className="text-muted-foreground">Explore budget allocations and spending for education and school-related schemes.</p>
      </div>

      {schemes.length === 0 ? (
        <p className="text-muted-foreground">No scheme data available yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.map((s) => (
            <Link
              key={s.scheme_id || s.id}
              href={`/schemes/${encodeURIComponent(s.scheme_id || String(s.id))}`}
              className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <h3 className="text-lg font-semibold group-hover:text-primary">{s.scheme_name}</h3>
              <p className="text-sm text-muted-foreground">{s.source_name} • {s.financial_year}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Allocated</p>
                  <p className="font-semibold">₹{toCrores(s.amount_allocated)} Cr</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Spent</p>
                  <p className="font-semibold">₹{toCrores(s.amount_spent)} Cr</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Data confidence: {Number(s.data_confidence || 0).toFixed(0)}%
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
