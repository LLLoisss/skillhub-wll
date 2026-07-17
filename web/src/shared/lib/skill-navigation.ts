/**
 * Helpers for constructing and validating navigation state around skill-detail pages.
 */
export function getSkillSquareSearch() {
  return {
    q: '',
    sort: 'relevance' as const,
    page: 0,
    starredOnly: false,
  }
}

export function normalizeSkillDetailReturnTo(returnTo?: string) {
  return returnTo && returnTo.startsWith('/') ? returnTo : undefined
}

export function getSuiteSkillReturnTo(namespace: string, slug: string) {
  const cleanNamespace = namespace.startsWith('@') ? namespace.slice(1) : namespace
  return `/suites/${encodeURIComponent(cleanNamespace)}/${encodeURIComponent(slug)}`
}
