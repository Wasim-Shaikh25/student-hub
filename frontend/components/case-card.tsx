import Link from 'next/link'
import { StatusBadge } from './status-badge'
import { FileText, Users } from 'lucide-react'
import type { Case } from '@/lib/types'

export function CaseCard({ case: c }: { case: Case }) {
  const status = c.status || 'Unverified'
  const confidence = c.resolution_confidence || c.resolutionConfidence || 0

  return (
    <Link
      href={`/cases/${c.id}`}
      className="group flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <StatusBadge status={status} />
        <span className="text-xs font-semibold text-primary">{confidence}% resolved</span>
      </div>
      <h3 className="line-clamp-2 text-lg font-semibold leading-snug group-hover:text-primary">
        {c.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-1">{c.category}</span>
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="size-4" />
          {(c.estimated_affected_people || 0).toLocaleString()} affected
        </span>
      </div>
    </Link>
  )
}
