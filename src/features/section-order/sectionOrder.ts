import { defaultSectionOrder, isSectionKey } from '../../sections'
import type { SectionKey } from '../../sections'

const endpoint = '/api/sections/order'

function readKeys(value: unknown): SectionKey[] | undefined {
  if (!value || typeof value !== 'object' || !('keys' in value) || !Array.isArray(value.keys)) return
  const keys: unknown[] = value.keys
  if (keys.length === defaultSectionOrder.length && new Set(keys).size === defaultSectionOrder.length &&
    keys.every(isSectionKey)) return keys
}

export async function readSectionOrder(signal: AbortSignal) {
  const response = await fetch(endpoint, { signal, cache: 'no-store' })
  return response.ok ? readKeys(await response.json()) : undefined
}

export async function saveSectionOrder(keys: SectionKey[], token: string) {
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
  })
  return response.ok ? readKeys(await response.json()) : undefined
}
