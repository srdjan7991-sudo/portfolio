const sectionKeys = ['work', 'skills', 'expertise', 'experience', 'education', 'contact'] as const
export type SectionKey = typeof sectionKeys[number]

export function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === 'string' && sectionKeys.some(key => key === value)
}

export const defaultSectionOrder: SectionKey[] = [...sectionKeys]
