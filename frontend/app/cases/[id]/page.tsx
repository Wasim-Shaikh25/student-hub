import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import {
  getCaseById,
  getCaseEvidence,
  getCaseComments,
  getCaseConfirmations,
} from '@/lib/queries'
import { getSessionUser } from '@/lib/session'
import { StatusBadge } from '@/components/status-badge'
import { ConfirmationButtons } from '@/components/confirmation-buttons'
import { Users, Clock } from 'lucide-react'
import type { Case, CaseStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const c = (await getCaseById(params.id)) as Case | undefined
  if (!c) notFound()

  const [evidence, comments, confirmations, session] = await Promise.all([
    getCaseEvidence(String(c.id)),
    getCaseComments(String(c.id)),
    getCaseConfirmations(String(c.id)),
    getSessionUser(),
  ])

  const affectedCount = (confirmations as { confirmation_type?: string }[])
    .filter((x) => x.confirmation_type === 'affected').length
  const resolvedCount = (confirmations as { confirmation_type?: string }[])
    .filter((x) => x.confirmation_type === 'resolved').length
  const status = (c.status || 'draft') as CaseStatus
  const confidence = c.resolution_confidence || c.resolutionConfidence || 0
  const estimatedAffected = c.estimated_affected_people || 0
  const createdAt = c.created_at || c.createdAt || new Date().toISOString()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusBadge status={status} />
            <h1 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">{c.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{c.category}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{confidence}%</div>
            <div className="text-xs text-muted-foreground">resolution confidence</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 border-y py-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground" />
            {estimatedAffected.toLocaleString()} estimated affected
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground" />
            {affectedCount} confirmed affected
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground" />
            {resolvedCount} confirmed resolved
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground" />
            {(evidence as { id?: string | number }[]).length} evidence files
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 text-muted-foreground" />
            {format(new Date(createdAt), 'MMM d, yyyy')}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {session ? <ConfirmationButtons caseId={String(c.id)} /> : null}
          {!session && (
            <a href="/login" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Log in to participate
            </a>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-lg font-semibold">What happened?</h2>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{c.description}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Evidence</h2>
            {(evidence as { id?: string | number }[]).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No evidence uploaded.</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(evidence as Record<string, unknown>[]).map((ev) => {
                  const fileUrl = ev.file_url ? String(ev.file_url) : null
                  return (
                    <div key={String(ev.id)} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{String(ev.title || ev.original_filename || 'Evidence')}</span>
                        <span className="text-xs text-muted-foreground">{String(ev.status || 'submitted')}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{String(ev.evidence_type || 'photo')}</p>
                      {fileUrl && (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">
                          View file
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Discussion</h2>
            {session ? (
              <div className="mt-4 space-y-3">
                {(comments as { id?: string | number }[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
                ) : (
                  (comments as Record<string, unknown>[]).map((comment) => {
                    const user = (comment.user as Record<string, unknown>) || {}
                    return (
                      <div key={String(comment.id)} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{String(user.display_name || 'User')}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(String(comment.created_at || '')), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{String(comment.text)}</p>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Log in to comment.</p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Resolution</h2>
            <div className="mt-2 rounded-xl border bg-muted/50 p-4">
              <p className="text-sm">
                <strong>Resolution confidence:</strong> {confidence}%
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on {affectedCount} affected confirmations and {resolvedCount} resolved confirmations.
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Impact</h3>
            <p className="mt-2 text-3xl font-bold">{estimatedAffected.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">estimated affected</p>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmed affected</span>
                <span className="font-medium">{affectedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmed resolved</span>
                <span className="font-medium">{resolvedCount}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Timeline</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span>Created on {format(new Date(createdAt), 'MMM d, yyyy')}</span>
              </li>
              <li className="flex gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span>{(evidence as { id?: string | number }[]).length} evidence files</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
