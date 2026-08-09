import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import {
  getCaseById,
  getCaseEvidence,
  getCaseComments,
  getCaseConfirmations,
  getUserById,
  isFollowing,
} from '@/lib/queries'
import { getSessionUser } from '@/lib/session'
import { StatusBadge } from '@/components/status-badge'
import { FollowButton } from '@/components/follow-button'
import { ConfirmationButtons } from '@/components/confirmation-buttons'
import { addComment, updateCaseStatus, updateEvidenceStatus } from '@/lib/actions'
import { Users, FileText, CheckCircle, Clock, Shield } from 'lucide-react'

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const c = await getCaseById(params.id)
  if (!c) notFound()

  const [evidence, comments, confirmations, creator, session] = await Promise.all([
    getCaseEvidence(c.id),
    getCaseComments(c.id),
    getCaseConfirmations(c.id),
    getUserById(c.creatorId),
    getSessionUser(),
  ])

  const affectedCount = confirmations.filter((x) => x.type === 'affected').length
  const resolvedCount = confirmations.filter((x) => x.type === 'resolved').length
  const following = await isFollowing(c.id)
  const isAdmin = session?.role === 'SuperAdmin'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusBadge status={c.status} />
            <h1 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">{c.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {c.institution} • {c.category} • {c.location}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{c.resolutionConfidence}%</div>
            <div className="text-xs text-muted-foreground">resolution confidence</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 border-y py-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground" />
            {c.affectedCount.toLocaleString()} estimated affected
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="size-4 text-muted-foreground" />
            {affectedCount} confirmed affected
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="size-4 text-muted-foreground" />
            {resolvedCount} confirmed resolved
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="size-4 text-muted-foreground" />
            {evidence.length} evidence files
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 text-muted-foreground" />
            {format(new Date(c.createdAt), 'MMM d, yyyy')}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {session ? <FollowButton caseId={c.id} initial={following} /> : null}
          {session ? <ConfirmationButtons caseId={c.id} initialAffected={confirmations.some((x) => x.userId === session.id && x.type === 'affected')} initialResolved={confirmations.some((x) => x.userId === session.id && x.type === 'resolved')} /> : null}
          {!session && (
            <a href="/login" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Log in to participate
            </a>
          )}
        </div>

        {isAdmin && (
          <div className="mt-6 rounded-lg bg-muted p-4">
            <h4 className="text-sm font-semibold">Admin controls</h4>
            <form action={updateCaseStatus.bind(null, c.id)} className="mt-2 flex gap-2">
              <select name="status" defaultValue={c.status} className="rounded-lg border bg-background px-3 py-2 text-sm">
                <option>Unverified</option>
                <option>Confirmed Problem</option>
                <option>Evidence Collection</option>
                <option>Expert Review</option>
                <option>Action Initiated</option>
                <option>Authority Response</option>
                <option>Partially Resolved</option>
                <option>Mostly Resolved</option>
                <option>Resolved</option>
                <option>Reopened</option>
              </select>
              <button type="submit" className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Update status
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-lg font-semibold">What happened?</h2>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{c.description}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Evidence</h2>
            {evidence.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No evidence uploaded.</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {evidence.map((ev) => (
                  <div key={ev.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ev.filename}</span>
                      <span className="text-xs text-muted-foreground">{ev.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{ev.type}</p>
                    <a href={ev.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">
                      View file
                    </a>
                    {isAdmin && (
                      <form action={updateEvidenceStatus.bind(null, ev.id)} className="mt-2 flex gap-2">
                        <select name="status" defaultValue={ev.status} className="rounded border bg-background px-2 py-1 text-xs">
                          <option>Community Submitted</option>
                          <option>Under Review</option>
                          <option>Verified</option>
                          <option>Official Source</option>
                          <option>Expert Verified</option>
                          <option>Disputed</option>
                          <option>Rejected</option>
                        </select>
                        <button type="submit" className="rounded bg-primary px-2 text-xs font-medium text-primary-foreground">
                          Set
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Discussion</h2>
            {session ? (
              <form action={addComment.bind(null, c.id)} className="mt-3 flex gap-2">
                <input name="text" required className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Add a comment..." />
                <button type="submit" className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Post
                </button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Log in to comment.</p>
            )}
            <div className="mt-4 space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{comment.user?.name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <p className="mt-1 text-sm">{comment.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Resolution</h2>
            <div className="mt-2 rounded-xl border bg-muted/50 p-4">
              <p className="text-sm">
                <strong>Resolution confidence:</strong> {c.resolutionConfidence}%
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on {affectedCount} affected confirmations and {resolvedCount} resolved confirmations.
              </p>
            </div>
          </section>

          {c.authorityResponse && (
            <section>
              <h2 className="text-lg font-semibold">Authority response</h2>
              <p className="mt-2 whitespace-pre-line rounded-xl border bg-muted/50 p-4 text-sm">{c.authorityResponse}</p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Impact</h3>
            <p className="mt-2 text-3xl font-bold">{c.affectedCount.toLocaleString()}</p>
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
            <h3 className="font-semibold">Case creator</h3>
            <p className="mt-2 text-sm font-medium">{creator?.name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{creator?.institution}</p>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Timeline</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span>Created on {format(new Date(c.createdAt), 'MMM d, yyyy')}</span>
              </li>
              <li className="flex gap-2">
                <Shield className="size-4 text-muted-foreground" />
                <span>Status: {c.status}</span>
              </li>
              <li className="flex gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <span>{evidence.length} evidence files</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
