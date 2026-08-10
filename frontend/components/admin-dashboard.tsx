'use client'

import { useState, useEffect } from 'react'
import { getModerationQueue, moderateCase } from '@/lib/actions'
import { formatDate } from '@/lib/utils'

interface QueueItem {
  id?: number
  title?: string
  description?: string
  category?: string
  status?: string
  created_at?: string
}

export function AdminDashboard() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const result = await getModerationQueue('issues')
    if (result?.error) {
      setError(result.error)
    } else {
      const data = (result?.data as { items?: QueueItem[] }) || {}
      setItems(data.items || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleModerate(issueId: number, status: string, visibility: string) {
    const result = await moderateCase(issueId, status, visibility, 'Reviewed by admin')
    if (result?.error) {
      setError(result.error)
    } else {
      await load()
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground mt-2">Moderate issues and evidence.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Issues pending moderation</h2>
        {loading ? (
          <p className="mt-4 text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No items pending moderation.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                    <p className="mt-2 text-sm">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleModerate(item.id ?? 0, 'confirmed_problem', 'public')}
                      className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleModerate(item.id ?? 0, 'evidence_review', 'draft')}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      Request changes
                    </button>
                    <button
                      onClick={() => handleModerate(item.id ?? 0, 'draft', 'hidden')}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
