import type { LabelDefinition, LabelItem } from '@/api/types'

type HierarchicalRecord = {
  id?: number
  slug: string
  level?: 1 | 2
  parentId?: number
  children?: HierarchicalRecord[]
}

/**
 * Normalizes both the new nested API response and the transitional flat response
 * into a two-level tree while preserving the backend's primary and secondary
 * label order. Legacy records without level metadata remain top-level.
 */
export function normalizeLabelHierarchy<T extends HierarchicalRecord>(labels: T[]): T[] {
  const cloned = labels.map((label) => ({
    ...label,
    children: label.children?.map((child) => ({ ...child, children: undefined })) as T[] | undefined,
  }))
  const byId = new Map(cloned.filter((label) => label.id != null).map((label) => [label.id, label]))
  const nestedChildSlugs = new Set(cloned.flatMap((label) => label.children ?? []).map((child) => child.slug))
  const roots: T[] = []

  cloned.forEach((label) => {
    if (nestedChildSlugs.has(label.slug)) return
    if (label.level === 2 && label.parentId && byId.has(label.parentId)) {
      const parent = byId.get(label.parentId)!
      parent.children = [...(parent.children ?? []), label]
      return
    }
    roots.push(label)
  })

  return roots
}

export function flattenLabelHierarchy<T extends HierarchicalRecord>(labels: T[]): T[] {
  return normalizeLabelHierarchy(labels).flatMap((label) => [
    label,
    ...((label.children ?? []) as T[]),
  ])
}

export function findLabelBranch<T extends HierarchicalRecord>(labels: T[], slug: string) {
  const hierarchy = normalizeLabelHierarchy(labels)
  for (const parent of hierarchy) {
    if (parent.slug === slug) return { parent, selected: parent }
    const child = (parent.children ?? []).find((item) => item.slug === slug) as T | undefined
    if (child) return { parent, selected: child }
  }
  return { parent: undefined, selected: undefined }
}

/**
 * Expands the two cascading UI selections into the payload required by the
 * binding APIs: exactly one primary label followed by its selected children.
 */
export function buildHierarchicalBindingSlugs<T extends HierarchicalRecord>(
  labels: T[],
  selectedPrimarySlug: string,
  selectedChildSlugs: string[],
) {
  if (!selectedPrimarySlug) return []

  const parent = normalizeLabelHierarchy(labels)
    .find((label) => label.slug === selectedPrimarySlug)
  if (!parent) return []

  const selectedSet = new Set(selectedChildSlugs)
  const children = (parent.children ?? [])
    .filter((child) => selectedSet.has(child.slug)) as T[]
  if (children.length !== selectedSet.size) return []
  return [parent.slug, ...children.map((child) => child.slug)]
}

export function resolveLabelDisplayName(definition: LabelDefinition, locale: string) {
  const normalizedLocale = locale.toLowerCase()
  const exact = definition.translations.find((item) => item.locale.toLowerCase() === normalizedLocale)
  if (exact?.displayName) return exact.displayName
  const language = normalizedLocale.split('-')[0]
  const languageMatch = definition.translations.find(
    (item) => item.locale.toLowerCase().split('-')[0] === language,
  )
  return languageMatch?.displayName || definition.translations[0]?.displayName || definition.slug
}

export function definitionsToLabelItems(definitions: LabelDefinition[], locale: string): LabelItem[] {
  return normalizeLabelHierarchy(definitions).map((definition) => ({
    id: definition.id,
    slug: definition.slug,
    type: definition.type,
    displayName: resolveLabelDisplayName(definition, locale),
    level: definition.level ?? 1,
    parentId: definition.parentId ?? 0,
    children: (definition.children ?? []).map((child) => ({
      id: child.id,
      slug: child.slug,
      type: child.type,
      displayName: resolveLabelDisplayName(child, locale),
      level: 2,
      parentId: child.parentId ?? definition.id,
    })),
  }))
}
