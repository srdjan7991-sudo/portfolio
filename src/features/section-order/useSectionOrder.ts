import { useEffect, useRef, useState } from 'react'
import { defaultSectionOrder } from '../../sections'
import type { SectionKey } from '../../sections'
import { haveSameOrder } from '../../utils/arrays'
import { readSectionOrder, saveSectionOrder } from './sectionOrder'
import { useLanguage } from '../../i18n/language'
import type { Messages } from '../../i18n/en'

export function useSectionOrder(apiEnabled: boolean, onUnconfirmed?: () => void) {
  const { text } = useLanguage()
  const [order, setOrder] = useState(defaultSectionOrder)
  const [ready, setReady] = useState(!apiEnabled)
  const [orderLoaded, setOrderLoaded] = useState(false)
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
        if (abort.signal.aborted) return
        if (keys) {
          confirmed.current = keys
          show(keys)
          setOrderLoaded(true)
        } else {
          setStatus('loadFailed')
        }
      })
      .catch(() => { if (!abort.signal.aborted) setStatus('loadFailed') })
      .finally(() => { if (!abort.signal.aborted) setReady(true) })
    return () => abort.abort()
  }, [apiEnabled])

  function cancel() {
    show(confirmed.current)
    setStatus('idle')
  }

  function preview(keys: SectionKey[]) {
    if (!orderLoaded || pending.current) return
    show(keys)
    setStatus(haveSameOrder(keys, confirmed.current) ? 'idle' : 'unsaved')
  }

  async function save(token: string, renew?: () => Promise<string | undefined>) {
    const keys = current.current
    const expected = confirmed.current
    if (!orderLoaded || pending.current || haveSameOrder(keys, expected)) return
    pending.current = true
    setSaving(true)
    setStatus('saving')
    try {
      let result = await saveSectionOrder(keys, expected, token)
      if (result.kind === 'unauthorized' && renew) {
        const renewed = await renew().catch(() => undefined)
        if (renewed) result = await saveSectionOrder(keys, expected, renewed)
      }
      if (result.kind === 'conflict') {
        confirmed.current = result.order
        show(result.order)
        setStatus('conflict')
        return
      }
      if (result.kind !== 'saved') {
        show(confirmed.current)
        setStatus('failed')
        return
      }
      if (!haveSameOrder(result.order, keys)) throw new Error('The returned order differs from the submitted order.')
      confirmed.current = result.order
      setStatus('saved')
    } catch {
      const authoritative = await readSectionOrder().catch(() => undefined)
      if (authoritative) confirmed.current = authoritative
      show(confirmed.current)
      if (authoritative && haveSameOrder(authoritative, keys)) {
        setStatus('saved')
      } else {
        // A read can finish before an interrupted upstream write commits.
        onUnconfirmed?.()
        setOrderLoaded(false)
        setStatus('saveUnknown')
      }
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return { order, ready, orderLoaded, saving, status: text.order.status[status], preview, cancel, save }
}
