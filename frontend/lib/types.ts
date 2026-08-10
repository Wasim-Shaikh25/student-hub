export type UserRole = 'Student' | 'Expert' | 'NGO' | 'Lawyer' | 'SuperAdmin'

export type User = {
  id: string
  email: string
  name: string
  role: UserRole
  institution?: string
  location?: string
  passwordHash?: string
  createdAt: string
}

export type CaseStatus =
  | 'Unverified'
  | 'Confirmed Problem'
  | 'Evidence Collection'
  | 'Expert Review'
  | 'Action Initiated'
  | 'Authority Response'
  | 'Partially Resolved'
  | 'Mostly Resolved'
  | 'Resolved'
  | 'Reopened'

export type EvidenceStatus =
  | 'Community Submitted'
  | 'Under Review'
  | 'Verified'
  | 'Official Source'
  | 'Expert Verified'
  | 'Disputed'
  | 'Rejected'

export type Evidence = {
  id: string
  caseId: string
  uploaderId: string
  filename: string
  type: string
  url: string
  status: EvidenceStatus
  createdAt: string
}

export type Confirmation = {
  id: string
  caseId: string
  userId: string
  type: 'affected' | 'resolved'
  createdAt: string
}

export type Comment = {
  id: string
  caseId: string
  userId: string
  text: string
  createdAt: string
}

export type Follow = {
  id: string
  caseId: string
  userId: string
  createdAt: string
}

export type ExpertProfile = {
  id: string
  userId: string
  organization?: string
  bio?: string
  credentials?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export type Report = {
  id: string
  targetType: 'case' | 'evidence' | 'comment' | 'user'
  targetId: string
  reporterId: string
  reason: string
  status: 'open' | 'resolved'
  createdAt: string
}

export type AuditLog = {
  id: string
  action: string
  actorId: string
  targetType: string
  targetId: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export type Case = {
  id?: number | string
  title: string
  description: string
  category: string
  status?: CaseStatus
  resolution_confidence?: number
  resolutionConfidence?: number
  creator_id?: string | number
  creatorId?: string | number
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  estimated_affected_people?: number
  state_id?: number
  district_id?: number
  block_id?: number
  ward_id?: number
  latitude?: number
  longitude?: number
}

export type DbSchema = {
  users: User[]
  cases: Case[]
  evidence: Evidence[]
  confirmations: Confirmation[]
  comments: Comment[]
  follows: Follow[]
  expertProfiles: ExpertProfile[]
  reports: Report[]
  auditLogs: AuditLog[]
  categories: string[]
  institutions: string[]
  locations: string[]
}
