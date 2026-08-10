import { notFound } from 'next/navigation'
import { getInvestigationById } from '@/lib/queries'
import { formatDate } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

interface InvestigationPageProps {
  params: { id: string }
}

const verdictColors = {
  supported: 'bg-green-100 text-green-800 border-green-300',
  misleading: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  contradicted: 'bg-red-100 text-red-800 border-red-300',
  unverified: 'bg-gray-100 text-gray-800 border-gray-300',
}

const verdictLabels = {
  supported: 'Supported by Evidence',
  misleading: 'Misleading Context',
  contradicted: 'Contradicted by Evidence',
  unverified: 'Cannot Be Verified',
}

export default async function InvestigationDetailPage({ params }: InvestigationPageProps) {
  const investigation = await getInvestigationById(params.id)

  if (!investigation) {
    notFound()
  }

  const inv = investigation as any
  const verdict = inv.verdict as keyof typeof verdictColors
  const claims = inv.claims || []
  const sources = inv.sources || []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="mb-4 text-3xl font-bold">{inv.article?.title || 'Investigation'}</h1>
            <div className="flex items-center gap-4">
              <span className={`rounded-lg border px-4 py-2 text-sm font-semibold ${verdictColors[verdict]}`}>
                {verdictLabels[verdict]}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Confidence:</span>
                <div className="w-48 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(inv.confidence * 100)}%` }} />
                </div>
                <span className="text-sm font-semibold">{Math.round(inv.confidence * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b pb-4">
          <div className="text-sm text-muted-foreground">
            {inv.article?.source} • {formatDate(new Date(inv.published_at))}
          </div>
          {inv.article?.summary && (
            <p className="mt-2 text-base text-muted-foreground">{inv.article.summary}</p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">Summary</h2>
        <p className="mb-4 text-base leading-relaxed">{inv.summary}</p>
        {inv.detailed_explanation && (
          <div className="mt-4 border-t pt-4">
            <h3 className="mb-2 font-semibold">Detailed Explanation</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{inv.detailed_explanation}</p>
          </div>
        )}
      </div>

      {/* Quality Assessment */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Analysis Quality</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Quality Score</span>
            <div className="w-32 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(inv.quality_score * 100)}%` }} />
            </div>
            <span className="text-sm font-semibold">{Math.round(inv.quality_score * 100)}%</span>
          </div>
          {inv.conflicting_sources && (
            <div className="rounded bg-yellow-50 p-2 text-sm text-yellow-800">
              ⚠ Conflicting sources found - review evidence carefully
            </div>
          )}
          {inv.missing_citations && (
            <div className="rounded bg-yellow-50 p-2 text-sm text-yellow-800">
              ⚠ Some claims lack direct citations - see evidence section
            </div>
          )}
        </div>
      </div>

      {/* Claims */}
      {claims.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Key Claims</h2>
          <div className="space-y-4">
            {claims.map((claim: any) => (
              <div key={claim.id} className="rounded-lg border bg-card p-4">
                <h3 className="mb-3 font-semibold">{claim.claim_text}</h3>
                {claim.evidence_items && claim.evidence_items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Evidence</p>
                    {claim.evidence_items.map((evidence: any) => (
                      <div key={evidence.id} className="rounded bg-muted/30 p-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <a
                              href={evidence.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              {evidence.title}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <p className="mt-1 text-muted-foreground">{evidence.source_type}</p>
                          </div>
                          <span className="whitespace-nowrap rounded bg-primary/10 px-2 py-1 text-xs font-semibold">
                            {evidence.relation}
                          </span>
                        </div>
                        {evidence.excerpt && <p className="mt-2 italic text-muted-foreground">"{evidence.excerpt}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">All Sources ({sources.length})</h2>
          <div className="space-y-3">
            {sources.map((source: any) => (
              <div key={source.id} className="rounded-lg border bg-card p-4">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 inline-flex items-center gap-2 font-semibold text-primary hover:underline"
                >
                  {source.title}
                  <ExternalLink className="h-4 w-4" />
                </a>

                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="rounded bg-muted px-2 py-1 text-xs font-medium">{source.source_type}</span>
                  <span className="rounded bg-muted px-2 py-1 text-xs font-medium capitalize">{source.relation}</span>
                  {source.published_at && (
                    <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {formatDate(new Date(source.published_at))}
                    </span>
                  )}
                </div>

                <div className="mb-2 text-xs text-muted-foreground">
                  Authority: {Math.round(source.source_authority_score * 100)}% • Relevance: {Math.round(source.relevance_score * 100)}% •
                  Recency: {Math.round(source.recency_score * 100)}%
                </div>

                {source.excerpt && <p className="text-sm italic text-muted-foreground">"{source.excerpt}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Original Article */}
      {inv.article && (
        <div className="rounded-lg border bg-muted/30 p-6">
          <h2 className="mb-3 text-lg font-semibold">Original Article</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Source: <span className="font-medium">{inv.article.source}</span>
            </p>
            {inv.article.url && (
              <a
                href={inv.article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                View original article
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {inv.article.published_at && (
              <p className="text-sm text-muted-foreground">Published: {formatDate(new Date(inv.article.published_at))}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
