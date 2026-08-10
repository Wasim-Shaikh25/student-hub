import { Suspense } from 'react'
import { getInvestigations } from '@/lib/queries'
import { InvestigationCard } from '@/components/investigation-card'

async function InvestigationsList() {
  const investigations = await getInvestigations()

  if (!investigations || investigations.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No investigations published yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {investigations.map((inv: any) => (
        <InvestigationCard
          key={inv.id}
          id={inv.id}
          headline={inv.article?.title || 'Untitled'}
          verdict={inv.verdict}
          summary={inv.summary}
          confidence={inv.confidence}
          sourceCount={inv.sources?.length || 0}
          publishedAt={new Date(inv.published_at)}
        />
      ))}
    </div>
  )
}

export default async function InvestigationsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">News Investigations</h1>
        <p className="text-lg text-muted-foreground">
          Evidence-based analysis of news claims with verified sources and expert assessment.
        </p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex gap-2">
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">All</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Supported</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Misleading</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Contradicted</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Unverified</button>
        </div>
      </div>

      <Suspense fallback={<div className="text-center text-muted-foreground">Loading investigations...</div>}>
        <InvestigationsList />
      </Suspense>
    </div>
  )
}
