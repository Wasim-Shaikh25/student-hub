import { getSessionUser } from './session'
import type { Case } from './types'
import { DEMO_INVESTIGATIONS, DEMO_SCHEME_RECORDS, getDemoInvestigationById, getDemoSchemeById } from './demo-data'

interface ApiResponse {
  [key: string]: unknown
}

class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

function isConnectionError(error: unknown): boolean {
  if (error instanceof ApiError) return false
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  if (message.includes('fetch failed')) return true
  if (message.includes('econnrefused') || message.includes('enotfound') || message.includes('eai_again')) return true
  const cause = (error as { cause?: { code?: string } }).cause
  if (cause && typeof cause === 'object') {
    const code = cause.code
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') return true
  }
  return false
}

class ServerApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
  }

  async request(method: string, path: string, token?: string): Promise<ApiResponse> {
    const headers: Record<string, string> = {}

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new ApiError(`API error: ${response.statusText}`, response.status)
    }

    return response.json() as Promise<ApiResponse>
  }

  async listIssues(filters?: ApiResponse, token?: string): Promise<ApiResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value))
      })
    }
    const queryString = params.toString()
    return this.request('GET', `/issues${queryString ? '?' + queryString : ''}`, token)
  }

  async getIssue(id: number, token?: string): Promise<ApiResponse> {
    return this.request('GET', `/issues/${id}`, token)
  }

  async listEvidence(issueId: number, token?: string): Promise<ApiResponse> {
    return this.request('GET', `/issues/${issueId}/evidence`, token)
  }

  async listComments(issueId: number, token?: string): Promise<ApiResponse> {
    return this.request('GET', `/issues/${issueId}/comments`, token)
  }

  async getConfirmations(issueId: number, token?: string): Promise<ApiResponse> {
    return this.request('GET', `/issues/${issueId}/confirmations/details`, token)
  }
}

const serverApi = new ServerApiClient()

export async function getCategories() {
  return [
    'Health & Sanitation',
    'Education',
    'Infrastructure',
    'Water & Electricity',
    'Government Services',
    'Other'
  ]
}

export async function getInstitutions() {
  return []
}

export async function getLocations() {
  return []
}

export async function getCases(filters?: { status?: string; category?: string }): Promise<Case[]> {
  try {
    const session = await getSessionUser()
    const result = await serverApi.listIssues(filters, session?.accessToken)
    return (result.items as unknown[] || []) as Case[]
  } catch (error) {
    console.error('Failed to fetch cases:', error)
    return []
  }
}

export async function getCaseById(id: string): Promise<Case | undefined> {
  try {
    const session = await getSessionUser()
    const result = await serverApi.getIssue(Number(id), session?.accessToken)
    return result as Case
  } catch (error) {
    console.error('Failed to fetch case:', error)
    return undefined
  }
}

export async function getCaseEvidence(caseId: string) {
  try {
    const session = await getSessionUser()
    const result = await serverApi.listEvidence(Number(caseId), session?.accessToken)
    return (result.items as unknown[] || [])
  } catch (error) {
    console.error('Failed to fetch evidence:', error)
    return []
  }
}

export async function getCaseComments(caseId: string) {
  try {
    const session = await getSessionUser()
    const result = await serverApi.listComments(Number(caseId), session?.accessToken)
    return (result.items as unknown[] || [])
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('Failed to fetch comments:', error)
    return []
  }
}

export async function getCaseConfirmations(caseId: string) {
  try {
    const session = await getSessionUser()
    const result = await serverApi.getConfirmations(Number(caseId), session?.accessToken)
    return (result as unknown as unknown[]) || []
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('Failed to fetch confirmations:', error)
    return []
  }
}

export async function getUserById(id: string) {
  return { id, name: 'User', email: '' }
}

export async function isFollowing(): Promise<boolean> {
  return false
}

export async function getMyCases(): Promise<{ created: Case[]; joined: Case[]; following: Case[] }> {
  return { created: [], joined: [], following: [] }
}

export async function getModerationQueue() {
  return {
    cases: [],
    evidence: [],
    users: [],
    reports: [],
    expertProfiles: [],
  }
}

export async function getSchemes(filters?: { state_id?: number; financial_year?: string }): Promise<Record<string, unknown>[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.state_id) params.append('state_id', String(filters.state_id))
    if (filters?.financial_year) params.append('financial_year', filters.financial_year)
    const queryString = params.toString()
    const result = await serverApi.request('GET', `/spending/schemes${queryString ? '?' + queryString : ''}`)
    return (result.items as unknown[] || []) as Record<string, unknown>[]
  } catch (error) {
    if (!isConnectionError(error)) {
      console.error('Failed to fetch schemes:', error)
      return []
    }
    console.error('Backend unreachable, using demo schemes fallback:', error)
    let fallback = [...DEMO_SCHEME_RECORDS]
    if (filters?.state_id !== undefined) {
      fallback = fallback.filter((s) => String(s.applicable_state_id) === String(filters.state_id))
    }
    if (filters?.financial_year) {
      fallback = fallback.filter((s) => s.financial_year === filters.financial_year)
    }
    return fallback as Record<string, unknown>[]
  }
}

export async function getSchemeById(id: string): Promise<Record<string, unknown> | undefined> {
  try {
    const result = await serverApi.request('GET', `/spending/schemes/${encodeURIComponent(id)}`)
    return result as Record<string, unknown>
  } catch (error) {
    if (!isConnectionError(error)) {
      console.error('Failed to fetch scheme:', error)
      return undefined
    }
    console.error('Backend unreachable, using demo scheme fallback:', error)
    return getDemoSchemeById(id) as Record<string, unknown> | undefined
  }
}

export async function getInvestigations(filters?: { verdict?: string; page?: number; per_page?: number }) {
  try {
    const params = new URLSearchParams()
    if (filters?.verdict) params.append('verdict', filters.verdict)
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.per_page) params.append('per_page', String(filters.per_page))

    const queryString = params.toString()
    const result = await serverApi.request('GET', `/investigations${queryString ? '?' + queryString : ''}`)
    return (result.items as unknown[] || []) as ApiResponse[]
  } catch (error) {
    if (!isConnectionError(error)) {
      console.error('Failed to fetch investigations:', error)
      return []
    }
    console.error('Backend unreachable, using demo investigations fallback:', error)
    let fallback = [...DEMO_INVESTIGATIONS]
    if (filters?.verdict) {
      fallback = fallback.filter((inv) => inv.verdict === filters.verdict)
    }
    const page = filters?.page ?? 1
    const per_page = filters?.per_page ?? 20
    const start = (page - 1) * per_page
    return fallback.slice(start, start + per_page) as ApiResponse[]
  }
}

export async function getInvestigationById(id: string) {
  try {
    const result = await serverApi.request('GET', `/investigations/${id}`)
    return result as ApiResponse
  } catch (error) {
    if (!isConnectionError(error)) {
      console.error('Failed to fetch investigation:', error)
      return undefined
    }
    console.error('Backend unreachable, using demo investigation fallback:', error)
    return getDemoInvestigationById(id) as ApiResponse
  }
}
