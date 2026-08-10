import { getCases, getCategories, getLocations } from '@/lib/queries'
import { CaseCard } from '@/components/case-card'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { status?: string; category?: string; location?: string }
}) {
  const [cases, categories, locations] = await Promise.all([
    getCases(searchParams),
    getCategories(),
    getLocations(),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Discover cases</h1>
      <p className="text-muted-foreground">Find issues by your university, city, or category.</p>

      <form className="mt-6 grid gap-3 sm:grid-cols-4">
        <select name="status" className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="evidence_review">Evidence Review</option>
          <option value="confirmed_problem">Confirmed Problem</option>
          <option value="investigating">Investigating</option>
          <option value="awaiting_response">Awaiting Response</option>
          <option value="partially_resolved">Partially Resolved</option>
          <option value="mostly_resolved">Mostly Resolved</option>
          <option value="resolved">Resolved</option>
          <option value="reopened">Reopened</option>
        </select>
        <select name="category" className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="location" className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Filter
        </button>
      </form>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((c) => (
          <CaseCard key={c.id} case={c} />
        ))}
      </div>

      {cases.length === 0 && <p className="mt-8 text-muted-foreground">No cases match these filters.</p>}
    </div>
  )
}
