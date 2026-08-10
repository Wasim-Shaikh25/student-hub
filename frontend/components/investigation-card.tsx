'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface InvestigationCardProps {
  id: number
  headline: string
  verdict: 'supported' | 'misleading' | 'contradicted' | 'unverified'
  summary: string
  confidence: number
  sourceCount: number
  publishedAt: Date
}

const verdictColors = {
  supported: 'bg-green-100 text-green-800',
  misleading: 'bg-yellow-100 text-yellow-800',
  contradicted: 'bg-red-100 text-red-800',
  unverified: 'bg-gray-100 text-gray-800',
}

const verdictLabels = {
  supported: 'Supported',
  misleading: 'Misleading',
  contradicted: 'Contradicted',
  unverified: 'Unverified',
}

export function InvestigationCard({ id, headline, verdict, summary, confidence, sourceCount, publishedAt }: InvestigationCardProps) {
  return (
    <Link href={`/investigations/${id}`}>
      <div className="group rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="line-clamp-2 text-lg font-semibold group-hover:text-primary">{headline}</h3>
          <span className={`self-start whitespace-nowrap rounded px-3 py-1 text-xs font-medium sm:text-sm ${verdictColors[verdict]}`}>
            {verdictLabels[verdict]}
          </span>
        </div>

        <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">{summary}</p>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Confidence:</span>
            <div className="w-24 rounded-full bg-muted sm:w-32">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(confidence * 100)}%` }} />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">{Math.round(confidence * 100)}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
          <span>{formatDate(publishedAt)}</span>
        </div>
      </div>
    </Link>
  )
}
