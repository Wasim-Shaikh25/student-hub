import { getDb } from './db'
import { getSessionUser } from './session'
import type { Case, Evidence, Comment, User, Confirmation } from './types'

export async function getCategories() {
  return getDb().data.categories
}

export async function getInstitutions() {
  return getDb().data.institutions
}

export async function getLocations() {
  return getDb().data.locations
}

export async function getCases(filters?: { status?: string; category?: string; location?: string }) {
  const db = getDb()
  let cases = db.data.cases.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  if (filters?.status) cases = cases.filter((c) => c.status === filters.status)
  if (filters?.category) cases = cases.filter((c) => c.category === filters.category)
  if (filters?.location) cases = cases.filter((c) => c.location === filters.location)
  return cases
}

export async function getCaseById(id: string): Promise<Case | undefined> {
  return getDb().data.cases.find((c) => c.id === id)
}

export async function getCaseEvidence(caseId: string): Promise<Evidence[]> {
  return getDb().data.evidence.filter((e) => e.caseId === caseId)
}

export async function getCaseComments(caseId: string): Promise<(Comment & { user: User | undefined })[]> {
  const db = getDb()
  return db.data.comments
    .filter((c) => c.caseId === caseId)
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .map((c) => ({ ...c, user: db.data.users.find((u) => u.id === c.userId) }))
}

export async function getCaseConfirmations(caseId: string): Promise<Confirmation[]> {
  return getDb().data.confirmations.filter((c) => c.caseId === caseId)
}

export async function getUserById(id: string): Promise<User | undefined> {
  return getDb().data.users.find((u) => u.id === id)
}

export async function isFollowing(caseId: string): Promise<boolean> {
  const session = await getSessionUser()
  if (!session) return false
  return getDb().data.follows.some((f) => f.caseId === caseId && f.userId === session.id)
}

export async function getMyCases() {
  const session = await getSessionUser()
  if (!session) return { created: [], joined: [], following: [] }
  const db = getDb()
  const created = db.data.cases.filter((c) => c.creatorId === session.id)
  const followingIds = db.data.follows.filter((f) => f.userId === session.id).map((f) => f.caseId)
  const joined = db.data.cases.filter((c) => followingIds.includes(c.id))
  return { created, joined: [...created, ...joined], following: joined }
}

export async function getModerationQueue() {
  const db = getDb()
  return {
    cases: db.data.cases.filter((c) => c.status === 'Unverified'),
    evidence: db.data.evidence.filter((e) => e.status === 'Community Submitted' || e.status === 'Under Review'),
    users: db.data.users,
    reports: db.data.reports,
    expertProfiles: db.data.expertProfiles,
  }
}
