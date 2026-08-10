import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getCategories } from '@/lib/queries'
import { CaseForm } from '@/components/case-form'

export default async function RaisePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const categories = await getCategories()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Raise an issue</h1>
      <p className="text-muted-foreground">You are submitting a formal case. Evidence is mandatory and will be reviewed before publication.</p>
      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <CaseForm categories={categories} />
      </div>
    </div>
  )
}
