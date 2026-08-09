import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getInstitutions, getLocations } from '@/lib/queries'
import { RegisterForm } from '@/components/register-form'

export default async function RegisterPage() {
  const user = await getSessionUser()
  if (user) redirect('/')

  const [institutions, locations] = await Promise.all([getInstitutions(), getLocations()])

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <RegisterForm institutions={institutions} locations={locations} />
    </div>
  )
}
