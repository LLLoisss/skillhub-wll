import type {
  CreateSuiteRequest,
  LabelItem,
  PagedResponse,
  SuiteCreateResult,
  SuiteDeleteResult,
  SuiteDetail,
  SuiteLifecycleActionResult,
  SuiteRatingStatus,
  SuiteSearchParams,
  SuiteSummary,
  SuiteUpdateRequest,
} from './types'
import { fetchJson, getCsrfHeaders, WEB_API_PREFIX } from './client'

/**
 * Expert Suite API client.
 *
 * Mirrors the conventions used by the skill API helpers in `client.ts`: namespace segments strip
 * a leading `@`, writes attach CSRF headers, and responses are unwrapped by `fetchJson`.
 */
function cleanNamespace(namespace: string): string {
  return namespace.startsWith('@') ? namespace.slice(1) : namespace
}

function buildSuiteSearchUrl(params: SuiteSearchParams): string {
  const query = new URLSearchParams()

  if (params.q) {
    query.append('q', params.q)
  }
  if (params.namespace) {
    query.append('namespace', cleanNamespace(params.namespace))
  }
  const labels = Array.isArray(params.label) ? params.label : params.label ? [params.label] : []
  for (const label of labels) {
    query.append('label', label)
  }
  if (params.sort) {
    query.append('sort', params.sort)
  }
  if (params.page !== undefined) {
    query.append('page', String(params.page))
  }
  if (params.size !== undefined) {
    query.append('size', String(params.size))
  }

  const queryString = query.toString()
  return queryString ? `${WEB_API_PREFIX}/suites?${queryString}` : `${WEB_API_PREFIX}/suites`
}

function buildSuiteSkillsBatchUrl(namespace: string, slug: string, skillIds: number[]): string {
  const query = new URLSearchParams()
  for (const skillId of skillIds) {
    query.append('skillIds', String(skillId))
  }
  return `${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}/skills/batch?${query.toString()}`
}

/** Build the web download endpoint for the streamed ZIP response. */
export function buildSuiteDownloadPath(namespace: string, slug: string): string {
  return `${WEB_API_PREFIX}/suites/${encodeURIComponent(cleanNamespace(namespace))}/${encodeURIComponent(slug)}/download`
}

const httpSuiteApi = {
  async search(params: SuiteSearchParams): Promise<PagedResponse<SuiteSummary>> {
    return fetchJson<PagedResponse<SuiteSummary>>(buildSuiteSearchUrl(params))
  },

  async getMine(params: { status?: string; page?: number; size?: number } = {}): Promise<PagedResponse<SuiteSummary>> {
    const query = new URLSearchParams()
    if (params.status) query.append('status', params.status)
    if (params.page !== undefined) query.append('page', String(params.page))
    if (params.size !== undefined) query.append('size', String(params.size))
    const queryString = query.toString()
    return fetchJson<PagedResponse<SuiteSummary>>(`${WEB_API_PREFIX}/suites/mine${queryString ? `?${queryString}` : ''}`)
  },

  async getDetail(namespace: string, slug: string, signal?: AbortSignal): Promise<SuiteDetail> {
    return fetchJson<SuiteDetail>(`${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}`, { signal })
  },

  async create(request: CreateSuiteRequest): Promise<SuiteCreateResult> {
    return fetchJson<SuiteCreateResult>(`${WEB_API_PREFIX}/suites`, {
      method: 'POST',
      headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...request, namespace: cleanNamespace(request.namespace) }),
    })
  },

  async update(namespace: string, slug: string, request: SuiteUpdateRequest): Promise<SuiteDetail> {
    return fetchJson<SuiteDetail>(`${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(request),
    })
  },

  async addSkills(namespace: string, slug: string, skillIds: number[]): Promise<void> {
    await fetchJson<unknown>(buildSuiteSkillsBatchUrl(namespace, slug, skillIds), {
      method: 'PUT',
      headers: getCsrfHeaders(),
    })
  },

  async removeSkills(namespace: string, slug: string, skillIds: number[]): Promise<void> {
    await fetchJson<unknown>(buildSuiteSkillsBatchUrl(namespace, slug, skillIds), {
      method: 'DELETE',
      headers: getCsrfHeaders(),
    })
  },

  async remove(namespace: string, slug: string): Promise<SuiteDeleteResult> {
    return fetchJson<SuiteDeleteResult>(`${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      headers: getCsrfHeaders(),
    })
  },

  async archive(namespace: string, slug: string, reason?: string): Promise<SuiteLifecycleActionResult> {
    return fetchJson<SuiteLifecycleActionResult>(
      `${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}/archive`,
      {
        method: 'POST',
        headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
      },
    )
  },

  async unarchive(namespace: string, slug: string): Promise<SuiteLifecycleActionResult> {
    return fetchJson<SuiteLifecycleActionResult>(
      `${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}/unarchive`,
      {
        method: 'POST',
        headers: getCsrfHeaders(),
      },
    )
  },

  async hide(suiteId: number, reason?: string): Promise<void> {
    await fetchJson<void>(`/api/v1/suites/${suiteId}/hide`, {
      method: 'POST',
      headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ reason }),
    })
  },

  async unhide(suiteId: number): Promise<void> {
    await fetchJson<void>(`/api/v1/suites/${suiteId}/unhide`, {
      method: 'POST',
      headers: getCsrfHeaders(),
    })
  },

  async getLabels(namespace: string, slug: string, signal?: AbortSignal): Promise<LabelItem[]> {
    return fetchJson<LabelItem[]>(`${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}/labels`, { signal })
  },

  async putLabel(namespace: string, slug: string, labelSlug: string): Promise<void> {
    await fetchJson<void>(
      `${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}/labels/${encodeURIComponent(labelSlug)}`,
      {
        method: 'PUT',
        headers: getCsrfHeaders(),
      },
    )
  },

  async deleteLabel(namespace: string, slug: string, labelSlug: string): Promise<void> {
    await fetchJson<void>(
      `${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}/labels/${encodeURIComponent(labelSlug)}`,
      {
        method: 'DELETE',
        headers: getCsrfHeaders(),
      },
    )
  },

  async star(namespace: string, slug: string): Promise<void> {
    await fetchJson<void>(`${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}/star`, {
      method: 'POST',
      headers: getCsrfHeaders(),
    })
  },

  async unstar(namespace: string, slug: string): Promise<void> {
    await fetchJson<void>(`${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}/star`, {
      method: 'DELETE',
      headers: getCsrfHeaders(),
    })
  },

  async rate(namespace: string, slug: string, score: number): Promise<void> {
    await fetchJson<void>(`${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}/rating`, {
      method: 'POST',
      headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ score }),
    })
  },

  async getUserRating(namespace: string, slug: string, signal?: AbortSignal): Promise<SuiteRatingStatus> {
    return fetchJson<SuiteRatingStatus>(
      `${WEB_API_PREFIX}/suites/${cleanNamespace(namespace)}/${encodeURIComponent(slug)}/rating`,
      { signal },
    )
  },

  async getMyStars(): Promise<SuiteSummary[]> {
    const page = await fetchJson<PagedResponse<SuiteSummary>>(`${WEB_API_PREFIX}/me/suite-stars`)
    return page.items
  },
}

export const suiteApi = httpSuiteApi
