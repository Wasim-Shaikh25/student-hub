import { notFound } from 'next/navigation'
import { getSchemeById } from '@/lib/queries'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function toCrores(paise: number | undefined): string {
  if (!paise) return '0'
  return (paise / 1000000000).toFixed(2)
}

export default async function SchemeDetailPage({ params }: { params: { id: string } }) {
  const scheme = (await getSchemeById(params.id)) as
    | {
        scheme_id?: string
        scheme_name?: string
        aliases?: string[]
        source_type?: string
        financial_years?: Record<string, {
          allocated?: number
          released?: number
          spent?: number
          source?: string
          data_confidence?: number
        }>
        states_covered?: number[]
        last_updated?: string
      }
    | undefined

  if (!scheme) notFound()

  const years = scheme.financial_years || {}

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">{scheme.scheme_name}</h1>
      <p className="text-muted-foreground">ID: {scheme.scheme_id}</p>

      {scheme.aliases && scheme.aliases.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Also known as: {scheme.aliases.join(', ')}</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(years).map(([year, data]) => (
          <div key={year} className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">{year}</h3>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Allocated</span>
                <span className="font-medium">₹{toCrores(data.allocated)} Cr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Released</span>
                <span className="font-medium">₹{toCrores(data.released)} Cr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spent</span>
                <span className="font-medium">₹{toCrores(data.spent)} Cr</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Confidence: {Number(data.data_confidence || 0).toFixed(0)}%</p>
          </div>
        ))}
      </div>

      {scheme.last_updated && (
        <p className="mt-8 text-sm text-muted-foreground">Last updated: {formatDate(scheme.last_updated)}</p>
      )}
    </div>
  )
}
