import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
      if (this.token) {
        this.setToken(this.token);
      }
    }

    // Add token to all requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
    delete this.client.defaults.headers.common['Authorization'];
  }

  // ========== AUTH ==========
  async register(email: string, displayName: string, password: string) {
    const res = await this.client.post('/auth/register', {
      email,
      display_name: displayName,
      password,
    });
    return res.data;
  }

  async login(email: string, password: string) {
    const res = await this.client.post('/auth/login', {
      email,
      password,
    });
    if (res.data.access_token) {
      this.setToken(res.data.access_token);
    }
    return res.data;
  }

  async getCurrentUser() {
    try {
      const res = await this.client.get('/auth/me');
      return res.data;
    } catch (error) {
      this.clearToken();
      throw error;
    }
  }

  // ========== ISSUES ==========
  async createIssue(data: {
    title: string;
    description: string;
    category: string;
    state_id: number;
    district_id?: number;
    block_id?: number;
    ward_id?: number;
    estimated_affected_people?: number;
    latitude?: number;
    longitude?: number;
  }) {
    const res = await this.client.post('/issues', data);
    return res.data;
  }

  async listIssues(filters?: {
    category?: string;
    status?: string;
    state_id?: number;
    page?: number;
    per_page?: number;
  }) {
    const res = await this.client.get('/issues', { params: filters });
    return res.data;
  }

  async getIssue(id: number) {
    const res = await this.client.get(`/issues/${id}`);
    return res.data;
  }

  async updateIssue(id: number, data: any) {
    const res = await this.client.put(`/issues/${id}`, data);
    return res.data;
  }

  async deleteIssue(id: number) {
    await this.client.delete(`/issues/${id}`);
  }

  async getSpendingContext(id: number) {
    const res = await this.client.get(`/issues/${id}/spending`);
    return res.data;
  }

  // ========== EVIDENCE ==========
  async uploadEvidence(
    issueId: number,
    file: File,
    evidenceType: string,
    title?: string,
    description?: string
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidence_type', evidenceType);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('user_id', '1'); // TODO: Get from auth context

    const res = await this.client.post(`/issues/${issueId}/evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  async listEvidence(issueId: number, includeRejected?: boolean) {
    const res = await this.client.get(`/issues/${issueId}/evidence`, {
      params: { include_rejected: includeRejected },
    });
    return res.data;
  }

  // ========== CONFIRMATIONS ==========
  async addConfirmation(
    issueId: number,
    confirmationType: 'affected' | 'resolved' | 'witnessed',
    description?: string
  ) {
    const res = await this.client.post(`/issues/${issueId}/confirm`, {
      confirmation_type: confirmationType,
      description,
    });
    return res.data;
  }

  async getConfirmationsSummary(issueId: number) {
    const res = await this.client.get(`/issues/${issueId}/confirmations`);
    return res.data;
  }

  // ========== COMMENTS ==========
  async addComment(issueId: number, text: string) {
    const res = await this.client.post(`/issues/${issueId}/comments`, {
      text,
    });
    return res.data;
  }

  async listComments(issueId: number, page?: number, perPage?: number) {
    const res = await this.client.get(`/issues/${issueId}/comments`, {
      params: { page, per_page: perPage },
    });
    return res.data;
  }

  // ========== GOVERNMENT CLAIMS ==========
  async addGovernmentClaim(
    issueId: number,
    claimText: string,
    claimedBy?: string,
    sourceUrl?: string
  ) {
    const res = await this.client.post(`/issues/${issueId}/claims`, {
      claim_text: claimText,
      claimed_by: claimedBy,
      source_url: sourceUrl,
    });
    return res.data;
  }

  async listGovernmentClaims(issueId: number) {
    const res = await this.client.get(`/issues/${issueId}/claims`);
    return res.data;
  }

  // ========== SPENDING DATA ==========
  async listSchemes(filters?: {
    state_id?: number;
    category?: string;
    financial_year?: string;
    page?: number;
    per_page?: number;
  }) {
    const res = await this.client.get('/spending/schemes', { params: filters });
    return res.data;
  }

  async getScheme(schemeId: string) {
    const res = await this.client.get(`/spending/schemes/${schemeId}`);
    return res.data;
  }

  async getSchemeBudgetVsOutcome(schemeId: string, financialYear?: string) {
    const res = await this.client.get(
      `/spending/schemes/${schemeId}/budget-vs-outcome`,
      { params: { financial_year: financialYear } }
    );
    return res.data;
  }

  async listTenders(filters?: {
    state_id?: number;
    category?: string;
    page?: number;
    per_page?: number;
  }) {
    const res = await this.client.get('/spending/tenders', { params: filters });
    return res.data;
  }

  async listProjects(filters?: {
    state_id?: number;
    category?: string;
    page?: number;
    per_page?: number;
  }) {
    const res = await this.client.get('/spending/projects', { params: filters });
    return res.data;
  }

  async listAudits(filters?: {
    state_id?: number;
    scheme_id?: string;
    page?: number;
    per_page?: number;
  }) {
    const res = await this.client.get('/spending/audits', { params: filters });
    return res.data;
  }

  // ========== ADMIN ==========
  async getModerationQueue(queueType: 'issues' | 'evidence' | 'comments' | 'reports' = 'issues', page?: number) {
    const res = await this.client.get('/admin/moderation-queue', {
      params: { queue_type: queueType, page },
    });
    return res.data;
  }

  async moderateIssue(
    issueId: number,
    status: string,
    visibility: string,
    moderationNotes?: string
  ) {
    const res = await this.client.put(`/admin/issues/${issueId}/moderate`, {
      status,
      visibility,
      moderation_notes: moderationNotes,
    });
    return res.data;
  }

  async getAdminDashboard() {
    const res = await this.client.get('/admin/analytics/dashboard');
    return res.data;
  }

  async listUsers(filters?: {
    role?: string;
    is_active?: boolean;
    is_banned?: boolean;
    page?: number;
    per_page?: number;
  }) {
    const res = await this.client.get('/admin/users', { params: filters });
    return res.data;
  }

  async banUser(userId: number, reason: string) {
    const res = await this.client.put(`/admin/users/${userId}/ban`, { reason });
    return res.data;
  }

  async getAuditLogs(filters?: {
    action?: string;
    entity_type?: string;
    user_id?: number;
    page?: number;
    per_page?: number;
  }) {
    const res = await this.client.get('/admin/audit-logs', { params: filters });
    return res.data;
  }
}

export const api = new ApiClient();
