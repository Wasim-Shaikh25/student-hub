'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/actions'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.push(result?.role === 'admin' ? '/admin' : '/')
      router.refresh()
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Log in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back to studentshub.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input name="password" type="password" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
