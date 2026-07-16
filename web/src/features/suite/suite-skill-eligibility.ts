import type { SkillSummary, SuiteSkillItem } from '@/api/types'

/** Only active, visible skills with a published version can be added to an expert suite. */
export function isSelectableSuiteSkill(skill: SkillSummary): boolean {
  return skill.status === 'ACTIVE'
    && skill.hidden !== true
    && skill.publishedVersion?.status === 'PUBLISHED'
}

/** Suite skill status is the skill entity status; publication lives on the headline version. */
export function isUnavailableSuiteSkill(skill: SuiteSkillItem): boolean {
  return skill.status !== 'ACTIVE'
    || skill.hidden === true
    || skill.headlineVersion?.status !== 'PUBLISHED'
}
