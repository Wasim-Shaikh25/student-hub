import Link from 'next/link'
import { Plus, Newspaper, Landmark, ClipboardList, ArrowRight } from 'lucide-react'
import { getCases } from '@/lib/queries'
import { getSessionUser } from '@/lib/session'
import { CaseCard } from '@/components/case-card'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getSessionUser()
  const cases = await getCases({ status: 'resolved' })

  const recent = (await getCases()).slice(0, 6)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <section className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          PublicWatch — Hold public money and public claims to account
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          A citizens-first platform to verify news against evidence, track government scheme spending, and report issues that affect your community.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Link
              href="/raise"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="size-4" />
              Raise an Issue
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Get started
              <ArrowRight className="size-4" />
            </Link>
          )}
          <Link
            href="/discover"
            className="inline-flex h-11 items-center rounded-xl border bg-background px-6 text-sm font-semibold hover:bg-muted"
          >
            Browse public cases
          </Link>
        </div>
      </section>

      <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/investigations"
          className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
        >
          <Newspaper className="size-6 text-primary" />
          <h3 className="mt-3 font-semibold group-hover:text-primary">Verify the News</h3>
          <p className="mt-1 text-sm text-muted-foreground">See which claims are supported, misleading, or contradicted by evidence.</p>
        </Link>
        <Link
          href="/schemes"
          className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
        >
          <Landmark className="size-6 text-primary" />
          <h3 className="mt-3 font-semibold group-hover:text-primary">Track Government Schemes</h3>
          <p className="mt-1 text-sm text-muted-foreground">Explore budget allocations, releases, and spending for education and civic schemes.</p>
        </Link>
        <Link
          href={user ? '/raise' : '/discover'}
          className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
        >
          <ClipboardList className="size-6 text-primary" />
          <h3 className="mt-3 font-semibold group-hover:text-primary">Raise & Track Issues</h3>
          <p className="mt-1 text-sm text-muted-foreground">Report public problems with evidence and follow them through resolution.</p>
        </Link>
      </section>

      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recently resolved</h2>
          <Link href="/discover?status=resolved" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {cases.length === 0 ? (
          <p className="text-muted-foreground">No resolved cases yet. Be the first to raise one.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.slice(0, 6).map((c) => (
              <CaseCard key={c.id} case={c} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Latest cases</h2>
          <Link href="/discover" className="text-sm font-medium text-primary hover:underline">
            Browse
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((c) => (
            <CaseCard key={c.id} case={c} />
          ))}
        </div>
      </section>
    </div>
  )
}
