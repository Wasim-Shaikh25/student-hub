import { notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/session'

export default async function AdminPage() {
  const session = await getSessionUser()
  if (!session || session.role !== 'Moderator' && session.role !== 'Admin') {
    notFound()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground mt-2">Welcome to the admin control panel.</p>

      <div className="mt-8 rounded-xl border bg-card p-6">
        <p className="text-muted-foreground">
          Admin features are being developed. Check back soon for moderation controls, analytics, and user management.
        </p>
      </div>
    </div>
  )
}
