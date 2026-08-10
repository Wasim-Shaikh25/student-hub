import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getMyCases } from '@/lib/queries'
import { CaseCard } from '@/components/case-card'

export const dynamic = 'force-dynamic'

export default async function MyCasesPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { created, joined } = await getMyCases()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">My cases</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Created</h2>
        {created.length === 0 ? (
          <p className="mt-2 text-muted-foreground">You haven&apos;t created any cases yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {created.map((c) => (
              <CaseCard key={c.id} case={c} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Joined / Following</h2>
        {joined.length === 0 ? (
          <p className="mt-2 text-muted-foreground">You haven&apos;t joined any cases yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {joined.map((c) => (
              <CaseCard key={c.id} case={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
