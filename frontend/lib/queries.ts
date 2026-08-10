import { getSessionUser } from './session'
import type { Case } from './types'

class ServerApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
  }

  private async request(method: string, path: string, token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    return response.json()
  }

  async listIssues(filters?: any, token?: string) {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value))
      })
    }
    const queryString = params.toString()
    return this.request('GET', `/issues${queryString ? '?' + queryString : ''}`, token)
  }

  async getIssue(id: number, token?: string) {
    return this.request('GET', `/issues/${id}`, token)
  }

  async listEvidence(issueId: number, token?: string) {
    return this.request('GET', `/issues/${issueId}/evidence`, token)
  }

  async listComments(issueId: number, token?: string) {
    return this.request('GET', `/issues/${issueId}/comments`, token)
  }
}

const serverApi = new ServerApiClient()

export async function getCases(filters?: { status?: string; category?: string }): Promise<Case[]> {
  try {
    const session = await getSessionUser()
    const result = await serverApi.listIssues(filters, session?.accessToken)
    return result.items || []
  } catch (error) {
    console.error('Failed to fetch cases:', error)
    return []
  }
}

export async function getCaseById(id: string): Promise<Case | undefined> {
  try {
    const session = await getSessionUser()
    const result = await serverApi.getIssue(Number(id), session?.accessToken)
    return result
  } catch (error) {
    console.error('Failed to fetch case:', error)
    return undefined
  }
}

export async function getCaseEvidence(caseId: string) {
  try {
    const session = await getSessionUser()
    const result = await serverApi.listEvidence(Number(caseId), session?.accessToken)
    return result.items || []
  } catch (error) {
    console.error('Failed to fetch evidence:', error)
    return []
  }
}

export async function getCaseComments(caseId: string) {
  try {
    const session = await getSessionUser()
    const result = await serverApi.listComments(Number(caseId), session?.accessToken)
    return result.items || []
  } catch (error) {
    console.error('Failed to fetch comments:', error)
    return []
  }
}
