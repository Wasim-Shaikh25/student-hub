import Link from 'next/link'
import { Plus, Shield, FileText, Users, CheckCircle } from 'lucide-react'
import { getCases } from '@/lib/queries'
import { getSessionUser } from '@/lib/session'
import { CaseCard } from '@/components/case-card'


export default async function HomePage() {
  const user = await getSessionUser()
  const cases = await getCases({ status: 'Resolved' })

  const recent = (await getCases()).slice(0, 6)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <section className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Turn problems into progress
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          studentshub is an evidence-first network where students raise, validate, and collectively resolve education problems.
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
            </Link>
          )}
          <Link
            href="/discover"
            className="inline-flex h-11 items-center rounded-xl border bg-background px-6 text-sm font-semibold hover:bg-muted"
          >
            Discover cases
          </Link>
        </div>
      </section>

      <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <Shield className="size-6 text-primary" />
          <h3 className="mt-3 font-semibold">No evidence, no case</h3>
          <p className="mt-1 text-sm text-muted-foreground">Every issue needs supporting documents before it goes live.</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <FileText className="size-6 text-primary" />
          <h3 className="mt-3 font-semibold">Evidence-first</h3>
          <p className="mt-1 text-sm text-muted-foreground">Official notices, emails, receipts, and screenshots.</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <Users className="size-6 text-primary" />
          <h3 className="mt-3 font-semibold">Collective action</h3>
          <p className="mt-1 text-sm text-muted-foreground">Other students confirm, experts review, authorities respond.</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <CheckCircle className="size-6 text-primary" />
          <h3 className="mt-3 font-semibold">Resolution confidence</h3>
          <p className="mt-1 text-sm text-muted-foreground">Verified by affected students, not likes.</p>
        </div>
      </section>

      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recently resolved</h2>
          <Link href="/discover?status=Resolved" className="text-sm font-medium text-primary hover:underline">
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
