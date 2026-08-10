'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSessionUser, setSessionUser, clearSessionUser } from './session'

// Server-side API client that doesn't require browser localStorage
interface ApiResponse {
  [key: string]: unknown
}

interface ApiError {
  detail?: string
}

class ServerApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
  }

  private async request(method: string, path: string, data?: ApiResponse, token?: string): Promise<ApiResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as ApiError
      throw new Error(error.detail || `API error: ${response.statusText}`)
    }

    return response.json() as Promise<ApiResponse>
  }

  async register(email: string, displayName: string, password: string): Promise<ApiResponse> {
    return this.request('POST', '/auth/register', { email, display_name: displayName, password })
  }

  async login(email: string, password: string): Promise<ApiResponse> {
    return this.request('POST', '/auth/login', { email, password })
  }

  async createIssue(data: ApiResponse, token: string): Promise<ApiResponse> {
    return this.request('POST', '/issues', data, token)
  }

  async listIssues(filters?: ApiResponse, token?: string): Promise<ApiResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value))
      })
    }
    const queryString = params.toString()
    return this.request('GET', `/issues${queryString ? '?' + queryString : ''}`, undefined, token)
  }

  async getIssue(id: number, token?: string): Promise<ApiResponse> {
    return this.request('GET', `/issues/${id}`, undefined, token)
  }

  async uploadEvidence(issueId: number, formData: FormData, token: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/issues/${issueId}/evidence`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload evidence: ${response.statusText}`)
    }

    return response.json() as Promise<ApiResponse>
  }

  async addConfirmation(issueId: number, confirmationType: 'affected' | 'resolved', token: string): Promise<ApiResponse> {
    return this.request('POST', `/issues/${issueId}/confirm`, { confirmation_type: confirmationType }, token)
  }

  async addComment(issueId: number, text: string, token: string): Promise<ApiResponse> {
    return this.request('POST', `/issues/${issueId}/comments`, { text }, token)
  }
}

const serverApi = new ServerApiClient()

export async function register(formData: FormData) {
  try {
    const email = String(formData.get('email') || '')
    const name = String(formData.get('name') || '')
    const password = String(formData.get('password') || '')

    if (!email || !name || !password) {
      return { error: 'Email, name and password are required' }
    }

    const result = await serverApi.register(email, name, password)

    const userId = String(result.id)
    const userRole = String(result.role) as 'Student' | 'Expert' | 'NGO' | 'Lawyer' | 'SuperAdmin'

    await setSessionUser({
      id: userId,
      email: String(result.email),
      name: String(result.display_name),
      role: userRole,
      accessToken: String(result.access_token),
    })

    return { success: true, userId }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Registration failed')
    return { error: error.message }
  }
}

export async function login(formData: FormData) {
  try {
    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')

    if (!email || !password) {
      return { error: 'Email and password are required' }
    }

    const result = await serverApi.login(email, password)

    const userId = String(result.id)
    const userRole = String(result.role) as 'Student' | 'Expert' | 'NGO' | 'Lawyer' | 'SuperAdmin'

    await setSessionUser({
      id: userId,
      email: String(result.email),
      name: String(result.display_name),
      role: userRole,
      accessToken: String(result.access_token),
    })

    return { success: true, userId }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Login failed')
    return { error: error.message }
  }
}

export async function logout() {
  await clearSessionUser()
  redirect('/login')
}

export async function followCase(): Promise<void> {
  // TODO: Implement following logic when API endpoint is available
}

export async function createCase(formData: FormData) {
  try {
    const session = await getSessionUser()
    if (!session?.accessToken) return { error: 'Unauthorized' }

    const title = String(formData.get('title') || '')
    const description = String(formData.get('description') || '')
    const category = String(formData.get('category') || '')
    const stateId = Number(formData.get('state_id') || 0)
    const estimatedAffectedPeople = Number(formData.get('estimated_affected_people') || 0)

    if (!title || !description || !category || !stateId) {
      return { error: 'Title, description, category and state are required' }
    }

    // Create the issue first
    const issueData = {
      title,
      description,
      category,
      state_id: stateId,
      estimated_affected_people: estimatedAffectedPeople,
    }

    const issueResult = await serverApi.createIssue(issueData, session.accessToken)

    // Handle evidence files if provided
    const evidenceFiles = formData.getAll('evidence').filter((f): f is File => f instanceof File)
    if (evidenceFiles.length > 0) {
      for (const file of evidenceFiles) {
        const evidenceFormData = new FormData()
        evidenceFormData.append('file', file)
        evidenceFormData.append('evidence_type', 'photo')
        evidenceFormData.append('title', file.name)

        try {
          await serverApi.uploadEvidence(Number(issueResult.id), evidenceFormData, session.accessToken)
        } catch (error) {
          console.error('Failed to upload evidence:', error)
        }
      }
    }

    revalidatePath('/')
    return { success: true, caseId: issueResult.id }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Failed to create issue')
    return { error: error.message }
  }
}

export async function addConfirmation(caseId: string, type: 'affected' | 'resolved') {
  try {
    const session = await getSessionUser()
    if (!session?.accessToken) return { error: 'Unauthorized' }

    await serverApi.addConfirmation(Number(caseId), type, session.accessToken)
    revalidatePath(`/cases/${caseId}`)
    return { success: true }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Failed to add confirmation')
    return { error: error.message }
  }
}

export async function addComment(caseId: string, formData: FormData) {
  try {
    const session = await getSessionUser()
    if (!session?.accessToken) return

    const text = String(formData.get('text') || '').trim()
    if (!text) return

    await serverApi.addComment(Number(caseId), text, session.accessToken)
    revalidatePath(`/cases/${caseId}`)
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Failed to add comment'
    console.error('Failed to add comment:', error)
  }
}

export async function uploadEvidence(caseId: string, formData: FormData) {
  try {
    const session = await getSessionUser()
    if (!session?.accessToken) return { error: 'Unauthorized' }

    const evidenceFiles = formData.getAll('evidence').filter((f): f is File => f instanceof File)

    if (evidenceFiles.length === 0) {
      return { error: 'No files provided' }
    }

    for (const file of evidenceFiles) {
      const evidenceFormData = new FormData()
      evidenceFormData.append('file', file)
      evidenceFormData.append('evidence_type', 'photo')
      evidenceFormData.append('title', file.name)

      await serverApi.uploadEvidence(Number(caseId), evidenceFormData, session.accessToken)
    }

    revalidatePath(`/cases/${caseId}`)
    return { success: true }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Failed to upload evidence')
    return { error: error.message }
  }
}
