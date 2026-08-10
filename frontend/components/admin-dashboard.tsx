'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  getAdminDashboard,
  getAdminUsers,
  getAdminCases,
  getModerationQueue,
  moderateCase,
  banUser,
  unbanUser,
  getInvestigationsList,
  getSchemesList,
} from '@/lib/actions'
import { formatDate } from '@/lib/utils'

type DashboardData = Record<string, unknown>

interface CaseItem {
  id?: string | number
  title?: string
  description?: string
  category?: string
  status?: string
  created_at?: string
}

interface UserItem {
  id?: string | number
  display_name?: string
  name?: string
  email?: string
  role?: string
  is_active?: boolean
  is_banned?: boolean
}

interface QueueItem {
  id?: string | number
  title?: string
  category?: string
  description?: string
  created_at?: string
}

interface InvestigationItem {
  id?: string | number
  title?: string
  article?: { title?: string }
  verdict?: string
  confidence?: number
  summary?: string
}

interface SchemeItem {
  scheme_id?: string | number
  id?: string | number
  scheme_name?: string
  financial_year?: string
  source_name?: string
  data_confidence?: number
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'cases', label: 'Cases' },
  { id: 'users', label: 'Users' },
  { id: 'news', label: 'News' },
  { id: 'schemes', label: 'Schemes' },
  { id: 'moderation', label: 'Moderation' },
]

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [investigations, setInvestigations] = useState<InvestigationItem[]>([])
  const [schemes, setSchemes] = useState<SchemeItem[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'overview') {
        const result = await getAdminDashboard()
        if (result?.error) throw new Error(result.error)
        setDashboard(result.data as DashboardData)
      } else if (activeTab === 'cases') {
        const result = await getAdminCases()
        if (result?.error) throw new Error(result.error)
        setCases(((result.data as { items?: CaseItem[] })?.items) || [])
      } else if (activeTab === 'users') {
        const result = await getAdminUsers()
        if (result?.error) throw new Error(result.error)
        setUsers(((result.data as { users?: UserItem[] })?.users) || [])
      } else if (activeTab === 'moderation') {
        const result = await getModerationQueue('issues')
        if (result?.error) throw new Error(result.error)
        setQueue(((result.data as { items?: QueueItem[] })?.items) || [])
      } else if (activeTab === 'news') {
        setInvestigations((await getInvestigationsList()) as InvestigationItem[])
      } else if (activeTab === 'schemes') {
        setSchemes((await getSchemesList()) as SchemeItem[])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleModerate(issueId: number, status: string, visibility: string) {
    setError(null)
    const result = await moderateCase(issueId, status, visibility, 'Reviewed by admin')
    if (result?.error) {
      setError(result.error)
    } else {
      await loadData()
    }
  }

  async function handleBan(userId: number, isBanned: boolean) {
    setError(null)
    const result = isBanned
      ? await unbanUser(userId)
      : await banUser(userId, 'Banned from admin dashboard')
    if (result?.error) {
      setError(result.error)
    } else {
      await loadData()
    }
  }

  function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </div>
    )
  }

  const issuesStats = (dashboard?.issues as DashboardData) || {}
  const usersStats = (dashboard?.users as DashboardData) || {}
  const evidenceStats = (dashboard?.evidence as DashboardData) || {}
  const moderationStats = (dashboard?.moderation as DashboardData) || {}

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
      <p className="text-muted-foreground mt-2">Manage users, cases, news and schemes from one place.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-muted-foreground">Loading...</p>
      ) : (
        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Cases" value={String(issuesStats?.['total'] ?? 0)} />
                <StatCard label="Total Users" value={String(usersStats?.['total'] ?? 0)} />
                <StatCard label="Evidence" value={String(evidenceStats?.['total'] ?? 0)} />
                <StatCard label="Pending Moderation" value={String(moderationStats?.['issues_pending'] ?? 0)} />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <h2 className="font-semibold">Cases by status</h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {Object.entries((issuesStats?.['by_status'] as Record<string, number>) || {}).map(([status, count]) => (
                      <li key={status} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{status.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <h2 className="font-semibold">Users by role</h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {Object.entries((usersStats?.['by_role'] as Record<string, number>) || {}).map(([role, count]) => (
                      <li key={role} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{role.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cases' && (
            <div className="space-y-4">
              {cases.length === 0 ? (
                <p className="text-muted-foreground">No cases found.</p>
              ) : (
                cases.map((c) => (
                  <div key={String(c.id)} className="rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{c.title || 'Untitled'}</h3>
                        <p className="text-sm text-muted-foreground">{c.category || ''} • {(c.status || '').replace(/_/g, ' ')}</p>
                        <p className="mt-2 text-sm">{String(c.description || '').slice(0, 160)}{(c.description || '').length > 160 ? '...' : ''}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/cases/${c.id}`} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">View</Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={String(u.id)} className="border-t">
                      <td className="px-4 py-3">{u.display_name || u.name || ''}</td>
                      <td className="px-4 py-3">{u.email || ''}</td>
                      <td className="px-4 py-3 capitalize">{(u.role || '').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">{u.is_banned ? 'Banned' : u.is_active ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-3">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleBan(Number(u.id), Boolean(u.is_banned))}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${u.is_banned ? 'border hover:bg-muted' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                          >
                            {u.is_banned ? 'Unban' : 'Ban'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="p-4 text-muted-foreground">No users found.</p>}
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-4">
              {investigations.length === 0 ? (
                <p className="text-muted-foreground">No investigations found.</p>
              ) : (
                investigations.map((item) => (
                  <div key={String(item.id)} className="rounded-xl border bg-card p-4">
                    <h3 className="font-semibold">{item.title || item.article?.title || 'Untitled'}</h3>
                    <p className="text-sm text-muted-foreground">Verdict: {item.verdict || ''} • Confidence: {String(Number(item.confidence || 0) * 100)}%</p>
                    <p className="mt-2 text-sm">{String(item.summary || '').slice(0, 200)}{(item.summary || '').length > 200 ? '...' : ''}</p>
                    <Link href={`/investigations/${item.id}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">View investigation</Link>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'schemes' && (
            <div className="space-y-4">
              {schemes.length === 0 ? (
                <p className="text-muted-foreground">No schemes found.</p>
              ) : (
                schemes.map((s) => (
                  <div key={String(s.scheme_id || s.id)} className="rounded-xl border bg-card p-4">
                    <h3 className="font-semibold">{s.scheme_name || ''}</h3>
                    <p className="text-sm text-muted-foreground">{s.financial_year || ''} • {s.source_name || ''}</p>
                    <p className="mt-2 text-sm">Data confidence: {String(s.data_confidence || 0)}%</p>
                    <Link href={`/schemes/${s.scheme_id || s.id}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">View scheme</Link>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="space-y-4">
              {queue.length === 0 ? (
                <p className="text-muted-foreground">No items pending moderation.</p>
              ) : (
                queue.map((item) => (
                  <div key={String(item.id)} className="rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{item.title || 'Untitled'}</h3>
                        <p className="text-sm text-muted-foreground">{item.category || ''}</p>
                        <p className="mt-2 text-sm">{item.description || ''}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleModerate(Number(item.id), 'confirmed_problem', 'public')}
                          className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleModerate(Number(item.id), 'evidence_review', 'draft')}
                          className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted"
                        >
                          Request changes
                        </button>
                        <button
                          onClick={() => handleModerate(Number(item.id), 'draft', 'hidden')}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
