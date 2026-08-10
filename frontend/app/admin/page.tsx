import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { AdminDashboard } from '@/components/admin-dashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getSessionUser()
  if (!session || session.role !== 'admin') {
    redirect('/login')
  }

  return <AdminDashboard />
}
