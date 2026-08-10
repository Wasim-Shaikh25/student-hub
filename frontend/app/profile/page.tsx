import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getCurrentUser } from '@/lib/actions'
import { ProfileForm, type UserDetails } from '@/components/profile-form'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const details = (await getCurrentUser()) as UserDetails | null

  return <ProfileForm user={user} details={details || { email: user.email }} />
}
