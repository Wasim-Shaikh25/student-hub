'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { compareSync, hashSync } from 'bcryptjs'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getDb } from './db'
import { getSessionUser, setSessionUser, clearSessionUser } from './session'
import type { Case, CaseStatus, Evidence, User, UserRole } from './types'

const RESOLUTION_RESOLVED_THRESHOLD = 100
const RESOLUTION_MOSTLY_THRESHOLD = 50
const RESOLUTION_PARTIALLY_THRESHOLD = 1

function now() {
  return new Date().toISOString()
}

function audit(action: string, actorId: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
  const db = getDb()
  db.data.auditLogs.push({
    id: uuidv4(),
    action,
    actorId,
    targetType,
    targetId,
    metadata,
    createdAt: now(),
  })
  db.write()
}

function recalculateResolution(caseId: string) {
  const db = getDb()
  const affected = db.data.confirmations.filter((c) => c.caseId === caseId && c.type === 'affected').length
  const resolved = db.data.confirmations.filter((c) => c.caseId === caseId && c.type === 'resolved').length
  const confidence = affected > 0 ? Math.round((resolved / affected) * 100) : 0

  const c = db.data.cases.find((x) => x.id === caseId)
  if (!c) return

  c.resolutionConfidence = confidence

  if (affected > 0) {
    if (confidence >= RESOLUTION_RESOLVED_THRESHOLD) c.status = 'Resolved'
    else if (confidence >= RESOLUTION_MOSTLY_THRESHOLD) c.status = 'Mostly Resolved'
    else if (confidence >= RESOLUTION_PARTIALLY_THRESHOLD) c.status = 'Partially Resolved'
    else c.status = 'Confirmed Problem'
  }

  db.write()
}

export async function register(formData: FormData) {
  const email = String(formData.get('email') || '')
  const name = String(formData.get('name') || '')
  const password = String(formData.get('password') || '')
  const institution = String(formData.get('institution') || '')
  const location = String(formData.get('location') || '')

  if (!email || !name || !password) {
    return { error: 'Email, name and password are required' }
  }

  const db = getDb()
  if (db.data.users.find((u) => u.email === email)) {
    return { error: 'Email already registered' }
  }

  const isFirstUser = db.data.users.length === 0
  const role: UserRole = isFirstUser ? 'SuperAdmin' : 'Student'

  const user: User = {
    id: uuidv4(),
    email,
    name,
    role,
    institution,
    location,
    passwordHash: hashSync(password, 10),
    createdAt: now(),
  }

  db.data.users.push(user)
  db.write()

  audit('USER_REGISTERED', user.id, 'user', user.id, { role })

  await setSessionUser({ id: user.id, email: user.email, name: user.name, role: user.role })
  return { success: true, userId: user.id }
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')

  const db = getDb()
  const user = db.data.users.find((u) => u.email === email)
  if (!user || !user.passwordHash || !compareSync(password, user.passwordHash)) {
    return { error: 'Invalid email or password' }
  }

  await setSessionUser({ id: user.id, email: user.email, name: user.name, role: user.role })
  return { success: true, userId: user.id }
}

export async function logout() {
  await clearSessionUser()
  redirect('/login')
}

export async function createCase(formData: FormData) {
  const session = await getSessionUser()
  if (!session) return { error: 'Unauthorized' }

  const title = String(formData.get('title') || '')
  const description = String(formData.get('description') || '')
  const institution = String(formData.get('institution') || '')
  const category = String(formData.get('category') || '')
  const location = String(formData.get('location') || '')
  const affectedCount = Number(formData.get('affectedCount') || 0)

  const evidenceFiles = formData.getAll('evidence').filter((f): f is File => f instanceof File)

  if (!title || !description || !institution || !category) {
    return { error: 'Title, description, institution and category are required' }
  }

  if (evidenceFiles.length === 0) {
    return { error: 'At least one evidence file is required' }
  }

  const db = getDb()
  const id = uuidv4()
  const c: Case = {
    id,
    title,
    description,
    institution,
    category,
    location,
    affectedCount,
    status: 'Unverified',
    resolutionConfidence: 0,
    creatorId: session.id,
    createdAt: now(),
    updatedAt: now(),
  }

  db.data.cases.push(c)

  const uploadBase = process.env.STUDENTSHUB_UPLOAD_DIR
    ? process.env.STUDENTSHUB_UPLOAD_DIR.startsWith('/')
      ? process.env.STUDENTSHUB_UPLOAD_DIR
      : join(process.cwd(), process.env.STUDENTSHUB_UPLOAD_DIR)
    : process.env.NETLIFY
      ? '/tmp/studentshub/uploads'
      : join(process.cwd(), 'public', 'uploads')
  const uploadPublicPath = process.env.STUDENTSHUB_UPLOAD_PUBLIC_PATH || '/uploads'
  const uploadDir = join(uploadBase, 'cases', id)
  await mkdir(uploadDir, { recursive: true })

  for (const file of evidenceFiles) {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const filePath = join(uploadDir, safeName)
    await writeFile(filePath, buffer)

    const ev: Evidence = {
      id: uuidv4(),
      caseId: id,
      uploaderId: session.id,
      filename: safeName,
      type: file.type || 'application/octet-stream',
      url: `${uploadPublicPath}/cases/${id}/${safeName}`,
      status: 'Community Submitted',
      createdAt: now(),
    }
    db.data.evidence.push(ev)
  }

  db.write()
  audit('CASE_CREATED', session.id, 'case', c.id, { evidenceCount: evidenceFiles.length })
  revalidatePath('/')
  return { success: true, caseId: c.id }
}

export async function updateCaseStatus(caseId: string, formData: FormData) {
  const session = await getSessionUser()
  if (!session || session.role !== 'SuperAdmin') return

  const status = String(formData.get('status') || '') as CaseStatus
  const db = getDb()
  const c = db.data.cases.find((x) => x.id === caseId)
  if (!c) return

  c.status = status
  c.updatedAt = now()
  db.write()
  audit('CASE_STATUS_UPDATED', session.id, 'case', caseId, { status })
  revalidatePath(`/cases/${caseId}`)
}

export async function updateEvidenceStatus(evidenceId: string, formData: FormData) {
  const session = await getSessionUser()
  if (!session || session.role !== 'SuperAdmin') return

  const status = String(formData.get('status') || '')
  const db = getDb()
  const ev = db.data.evidence.find((e) => e.id === evidenceId)
  if (!ev) return

  ev.status = status as Evidence['status']
  db.write()
  audit('EVIDENCE_STATUS_UPDATED', session.id, 'evidence', evidenceId, { status })
  revalidatePath(`/cases/${ev.caseId}`)
}

export async function addConfirmation(caseId: string, type: 'affected' | 'resolved') {
  const session = await getSessionUser()
  if (!session) return { error: 'Unauthorized' }

  const db = getDb()
  const existing = db.data.confirmations.find((c) => c.caseId === caseId && c.userId === session.id && c.type === type)
  if (existing) return { error: 'Already confirmed' }

  db.data.confirmations.push({
    id: uuidv4(),
    caseId,
    userId: session.id,
    type,
    createdAt: now(),
  })
  db.write()
  recalculateResolution(caseId)
  audit('CONFIRMATION_ADDED', session.id, 'case', caseId, { type })
  revalidatePath(`/cases/${caseId}`)
  return { success: true }
}

export async function addComment(caseId: string, formData: FormData) {
  const session = await getSessionUser()
  if (!session) return

  const text = String(formData.get('text') || '').trim()
  if (!text) return

  const db = getDb()
  db.data.comments.push({
    id: uuidv4(),
    caseId,
    userId: session.id,
    text,
    createdAt: now(),
  })
  db.write()
  audit('COMMENT_ADDED', session.id, 'case', caseId)
  revalidatePath(`/cases/${caseId}`)
}

export async function followCase(caseId: string) {
  const session = await getSessionUser()
  if (!session) return

  const db = getDb()
  const exists = db.data.follows.find((f) => f.caseId === caseId && f.userId === session.id)
  if (exists) {
    db.data.follows = db.data.follows.filter((f) => f.id !== exists.id)
  } else {
    db.data.follows.push({ id: uuidv4(), caseId, userId: session.id, createdAt: now() })
  }
  db.write()
  revalidatePath(`/cases/${caseId}`)
}

export async function addExpertProfile(formData: FormData) {
  const session = await getSessionUser()
  if (!session) return

  const organization = String(formData.get('organization') || '')
  const bio = String(formData.get('bio') || '')
  const credentials = String(formData.get('credentials') || '')

  const db = getDb()
  db.data.expertProfiles.push({
    id: uuidv4(),
    userId: session.id,
    organization,
    bio,
    credentials,
    status: 'pending',
    createdAt: now(),
  })
  db.write()
  revalidatePath('/profile')
}

export async function approveExpertProfile(profileId: string) {
  const session = await getSessionUser()
  if (!session || session.role !== 'SuperAdmin') return

  const db = getDb()
  const profile = db.data.expertProfiles.find((p) => p.id === profileId)
  if (!profile) return

  profile.status = 'approved'
  const user = db.data.users.find((u) => u.id === profile.userId)
  if (user) {
    user.role = 'Expert'
    db.write()
  }
  db.write()
  audit('EXPERT_APPROVED', session.id, 'expertProfile', profileId)
  revalidatePath('/admin')
}

export async function addReport(targetType: 'case' | 'evidence' | 'comment' | 'user', targetId: string, reason: string) {
  const session = await getSessionUser()
  if (!session) return

  const db = getDb()
  db.data.reports.push({
    id: uuidv4(),
    targetType,
    targetId,
    reporterId: session.id,
    reason,
    status: 'open',
    createdAt: now(),
  })
  db.write()
  audit('REPORT_CREATED', session.id, targetType, targetId, { reason })
}

export async function updateUserRole(userId: string, formData: FormData) {
  const session = await getSessionUser()
  if (!session || session.role !== 'SuperAdmin') return

  const role = String(formData.get('role') || '') as UserRole
  const db = getDb()
  const user = db.data.users.find((u) => u.id === userId)
  if (!user) return

  user.role = role
  db.write()
  audit('USER_ROLE_UPDATED', session.id, 'user', userId, { role })
  revalidatePath('/admin')
}
