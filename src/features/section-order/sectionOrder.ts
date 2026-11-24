import { defaultSectionOrder, isSectionKey } from '../../sections'
import type { SectionKey } from '../../sections'

const endpoint = '/api/sections/order'

export function readSectionOrderKeys(value: unknown): SectionKey[] | undefined {
  if (!value || typeof value !== 'object' || !('keys' in value) || !Array.isArray(value.keys)) return
  const keys: unknown[] = value.keys
  if (keys.length === defaultSectionOrder.length && new Set(keys).size === defaultSectionOrder.length &&
    keys.every(isSectionKey)) return keys
}

async function withOrderDeadline<T>(operation: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal) {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  const deadline = setTimeout(cancel, 10000)
  try {
    return await operation(controller.signal)
  } finally {
    clearTimeout(deadline)
    signal?.removeEventListener('abort', cancel)
  }
}

export async function readSectionOrder(signal?: AbortSignal) {
  if (signal?.aborted) return
  return withOrderDeadline(async requestSignal => {
    const response = await fetch(endpoint, { signal: requestSignal, cache: 'no-store' })
    return response.ok ? readSectionOrderKeys(await response.json()) : undefined
  }, signal)
}

export function saveSectionOrder(keys: SectionKey[], expectedKeys: SectionKey[], token: string) {
  return withOrderDeadline(async signal => {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys, expectedKeys }),
      signal,
    })
    if (response.status === 401) return { kind: 'unauthorized' } as const
    if (response.status === 409) {
      const latest = readSectionOrderKeys(await response.json())
      if (!latest) throw new Error('The latest order could not be read.')
      return { kind: 'conflict', order: latest } as const
    }
    if (!response.ok && response.status < 500) return { kind: 'rejected' } as const
    const saved = response.ok ? readSectionOrderKeys(await response.json()) : undefined
    if (!saved) throw new Error('The saved order could not be confirmed.')
    return { kind: 'saved', order: saved } as const
  })
}
