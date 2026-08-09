import { notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getModerationQueue } from '@/lib/queries'
import { getDb } from '@/lib/db'
import { updateCaseStatus, updateEvidenceStatus, approveExpertProfile, updateUserRole } from '@/lib/actions'
import { format } from 'date-fns'

export default async function AdminPage() {
  const session = await getSessionUser()
  if (!session || session.role !== 'SuperAdmin') {
    notFound()
  }

  const queue = await getModerationQueue()
  const db = getDb()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Super Admin Control Room</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Case moderation queue</h2>
        {queue.cases.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No cases awaiting moderation.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {queue.cases.map((c) => (
              <div key={c.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted-foreground">{c.institution} • {c.category}</p>
                  </div>
                  <form action={updateCaseStatus.bind(null, c.id)} className="flex gap-2">
                    <select name="status" defaultValue={c.status} className="rounded-lg border bg-background px-2 py-1 text-sm">
                      <option>Unverified</option>
                      <option>Confirmed Problem</option>
                      <option>Rejected</option>
                    </select>
                    <button type="submit" className="rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Update</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Evidence review queue</h2>
        {queue.evidence.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No evidence awaiting review.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {queue.evidence.map((ev) => (
              <div key={ev.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{ev.filename}</p>
                    <p className="text-xs text-muted-foreground">Case: {ev.caseId}</p>
                  </div>
                  <form action={updateEvidenceStatus.bind(null, ev.id)} className="flex gap-2">
                    <select name="status" defaultValue={ev.status} className="rounded-lg border bg-background px-2 py-1 text-sm">
                      <option>Community Submitted</option>
                      <option>Under Review</option>
                      <option>Verified</option>
                      <option>Rejected</option>
                    </select>
                    <button type="submit" className="rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Update</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Users</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2">
                    <form action={updateUserRole.bind(null, u.id)} className="flex gap-2">
                      <select name="role" defaultValue={u.role} className="rounded border bg-background px-2 py-1 text-xs">
                        <option>Student</option>
                        <option>Expert</option>
                        <option>NGO</option>
                        <option>Lawyer</option>
                        <option>SuperAdmin</option>
                      </select>
                      <button type="submit" className="rounded bg-primary px-2 text-xs font-medium text-primary-foreground">Set</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Expert applications</h2>
        {queue.expertProfiles.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No expert applications.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {queue.expertProfiles.map((p) => (
              <div key={p.id} className="rounded-xl border bg-card p-4">
                <p className="font-medium">{p.organization || 'No organization'}</p>
                <p className="text-sm text-muted-foreground">{p.bio}</p>
                <p className="text-xs text-muted-foreground">Status: {p.status}</p>
                {p.status === 'pending' && (
                  <form action={approveExpertProfile.bind(null, p.id)} className="mt-2">
                    <button type="submit" className="rounded-lg bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">Approve</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Reports</h2>
        {queue.reports.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No reports.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {queue.reports.map((r) => (
              <div key={r.id} className="rounded-xl border bg-card p-4 text-sm">
                <p><strong>{r.targetType}</strong> • {r.targetId}</p>
                <p className="text-muted-foreground">{r.reason}</p>
                <p className="text-xs text-muted-foreground">Status: {r.status}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Audit log</h2>
        <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border bg-card p-4 text-sm space-y-2">
          {db.data.auditLogs.slice().reverse().map((log) => (
            <div key={log.id} className="border-b pb-2 last:border-0">
              <p className="font-medium">{log.action}</p>
              <p className="text-xs text-muted-foreground">
                {log.targetType} {log.targetId} • {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          ))}
          {db.data.auditLogs.length === 0 && <p className="text-muted-foreground">No actions logged yet.</p>}
        </div>
      </section>
    </div>
  )
}
