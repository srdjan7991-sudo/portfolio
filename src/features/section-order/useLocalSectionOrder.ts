import { useState } from 'react'
import { defaultSectionOrder } from '../../sections'
import type { SectionKey } from '../../sections'
import { haveSameOrder } from '../../utils/arrays'
import { readSectionOrderKeys } from './sectionOrder'

const storageKey = 'portfolio-windows-section-order'

function loadOrder() {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) return readSectionOrderKeys(JSON.parse(stored)) ?? defaultSectionOrder
  } catch {
    // Storage can be disabled or contain an invalid value.
  }
  return defaultSectionOrder
}

export function useLocalSectionOrder() {
  const [saved, setSaved] = useState(loadOrder)
  const [draft, setDraft] = useState<SectionKey[]>()
  const [status, setStatus] = useState<'saved' | 'failed'>()
  const order = draft ?? saved
  const dirty = !haveSameOrder(order, saved)

  function preview(next: SectionKey[]) {
    setDraft(next)
    setStatus(undefined)
  }

  function cancel() {
    setDraft(undefined)
    setStatus(undefined)
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ keys: order }))
      setSaved(order)
      setStatus('saved')
    } catch {
      setStatus('failed')
    }
  }

  const localStatus: 'idle' | 'unsaved' | 'saved' | 'failed' = status ?? (dirty ? 'unsaved' : 'idle')
  return { order, dirty, status: localStatus, preview, cancel, save }
}
