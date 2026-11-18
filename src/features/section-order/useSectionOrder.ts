import { useEffect, useRef, useState } from 'react'
import { defaultSectionOrder } from '../../sections'
import type { SectionKey } from '../../sections'
import { haveSameOrder } from '../../utils/arrays'
import { readSectionOrder, saveSectionOrder } from './sectionOrder'
import { useLanguage } from '../../i18n/language'
import type { Messages } from '../../i18n/en'

export function useSectionOrder(apiEnabled: boolean) {
  const { text } = useLanguage()
  const [order, setOrder] = useState(defaultSectionOrder)
  const [ready, setReady] = useState(!apiEnabled)
  const [status, setStatus] = useState<keyof Messages['order']['status']>('idle')
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const current = useRef(defaultSectionOrder)
  const confirmed = useRef(defaultSectionOrder)

  function show(keys: SectionKey[]) {
    current.current = keys
    setOrder(keys)
  }

  useEffect(() => {
    if (!apiEnabled) return
    const abort = new AbortController()
    void readSectionOrder(abort.signal)
      .then(keys => {
        if (keys && !abort.signal.aborted) {
          confirmed.current = keys
          show(keys)
        }
      })
      .catch(() => { /* Keep the bundled order when the API is unavailable. */ })
      .finally(() => { if (!abort.signal.aborted) setReady(true) })
    return () => abort.abort()
  }, [apiEnabled])

  function cancel() {
    show(confirmed.current)
    setStatus('idle')
  }

  function preview(keys: SectionKey[]) {
    if (pending.current) return
    show(keys)
    setStatus(haveSameOrder(keys, confirmed.current) ? 'idle' : 'unsaved')
  }

  async function save(token: string) {
    const keys = current.current
    if (pending.current || haveSameOrder(keys, confirmed.current)) return
    pending.current = true
    setSaving(true)
    setStatus('saving')
    try {
      const saved = await saveSectionOrder(keys, token)
      if (!saved || !haveSameOrder(saved, keys)) throw new Error()
      confirmed.current = saved
      setStatus('saved')
    } catch {
      show(confirmed.current)
      setStatus('failed')
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return { order, ready, saving, status: text.order.status[status], preview, cancel, save }
}
