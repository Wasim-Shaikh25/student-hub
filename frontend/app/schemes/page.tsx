import { getSchemes } from '@/lib/queries'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function toCrores(paise: number | undefined): string {
  if (!paise) return '0'
  return (paise / 1000000000).toFixed(2)
}

interface SchemesPageProps {
  searchParams: { state_id?: string; financial_year?: string }
}

interface SchemeRecord {
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
}

function parseStateId(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export default async function SchemesPage({ searchParams }: SchemesPageProps) {
  const state_id = parseStateId(searchParams.state_id)
  const financial_year = searchParams.financial_year?.trim() || undefined

  // Fetch facets from the full, unfiltered list so the dropdowns stay populated.
  const allSchemes = (await getSchemes()) as SchemeRecord[]
  const schemes = (await getSchemes({ state_id, financial_year })) as SchemeRecord[]

  const states = Array.from(new Set(allSchemes.map((s) => s.applicable_state_id).filter(Boolean)))
  const years = Array.from(new Set(allSchemes.map((s) => s.financial_year).filter(Boolean)))

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Government Schemes</h1>
        <p className="text-muted-foreground">Explore budget allocations and spending for education and school-related schemes.</p>
      </div>

      <form method="get" action="/schemes" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label htmlFor="state_id" className="text-xs font-medium text-muted-foreground">State</label>
          <select
            id="state_id"
            name="state_id"
            defaultValue={searchParams.state_id || ''}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">All states</option>
            {states.map((id) => (
              <option key={id} value={id}>State ID {id}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <label htmlFor="financial_year" className="text-xs font-medium text-muted-foreground">Financial year</label>
          <select
            id="financial_year"
            name="financial_year"
            defaultValue={financial_year || ''}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">All years</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Filter
        </button>

        {(searchParams.state_id || financial_year) && (
          <Link
            href="/schemes"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Clear
          </Link>
        )}
      </form>

      {schemes.length === 0 ? (
        <p className="text-muted-foreground">No scheme data matches these filters.</p>
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
