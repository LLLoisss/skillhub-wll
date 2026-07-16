import type { SuiteSummary } from '@/api/types'

/** Public suite discovery must never expose archived or administratively hidden suites. */
export function isPublicSuite(suite: Pick<SuiteSummary, 'status' | 'hidden'>) {
  return suite.status === 'ACTIVE' && !suite.hidden
}
