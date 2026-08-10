import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'

export default async function ProfilePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{user.role}</span>
          </div>
        </div>
        <div className="mt-6 grid gap-3 text-sm">
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Role</span>
            <span>{user.role}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
