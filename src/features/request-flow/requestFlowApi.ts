type PublicSection = { key: string; title: string; body: string }

export type RequestResult =
  | { kind: 'guided' }
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success'; status: number; rows: PublicSection[] }
  | { kind: 'error'; status?: number }

function isPublicSection(value: unknown): value is PublicSection {
  return typeof value === 'object' && value !== null &&
    'key' in value && typeof value.key === 'string' &&
    'title' in value && typeof value.title === 'string' &&
    'body' in value && typeof value.body === 'string'
}

export async function readPublicSections(signal: AbortSignal): Promise<RequestResult> {
  const response = await fetch('/api/sections', { headers: { Accept: 'application/json' }, signal })
  if (!response.ok) return { kind: 'error', status: response.status }

  try {
    const rows: unknown = await response.json()
    return Array.isArray(rows) && rows.every(isPublicSection)
      ? { kind: 'success', status: response.status, rows }
      : { kind: 'error', status: response.status }
  } catch {
    return { kind: 'error', status: response.status }
  }
}
