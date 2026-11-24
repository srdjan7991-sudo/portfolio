import { Reorder, useReducedMotion } from 'motion/react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { ScreenReaderStatus } from '../../components/shared/ScreenReaderStatus'
import { useLanguage } from '../../i18n/language'
import type { SectionKey } from '../../sections'
import { SortableSection } from './SortableSection'
import './PortfolioSections.css'

type Move =
  | { key: SectionKey; type: 'pointer'; cancel: () => void }
  | { key: SectionKey; type: 'keyboard'; handle: HTMLButtonElement }
type MoveAnnouncement =
  | { kind: 'picked'; key: SectionKey }
  | { kind: 'moved'; key: SectionKey; position: number; total: number }
  | { kind: 'cancelled' }
type Props = {
  sections: Record<SectionKey, ReactNode>
  order: SectionKey[]
  editing: boolean
  saving: boolean
  onPreview: (order: SectionKey[]) => void
  onCancel: (beforeMove: SectionKey[]) => void
  onSave?: () => void
}

export function PortfolioSections({ sections, order, editing, saving, onPreview, onCancel, onSave }: Props) {
  const { text } = useLanguage()
  const bounds = useRef<HTMLDivElement>(null)
  const moving = useRef<Move | null>(null)
  const beforeMove = useRef(order)
  const [pickedUp, setPickedUp] = useState<SectionKey>()
  const [announcement, setAnnouncement] = useState<MoveAnnouncement>()
  const reduced = useReducedMotion()

  function start(move: Move) {
    if (!editing || saving || moving.current) return
    moving.current = move
    beforeMove.current = order
    setPickedUp(move.key)
    setAnnouncement({ kind: 'picked', key: move.key })
  }

  function finish(commit: boolean) {
    const move = moving.current
    if (!move) return
    moving.current = null
    setPickedUp(undefined)
    if (commit) onSave?.()
    else {
      if (move.type === 'pointer') move.cancel()
      onCancel(beforeMove.current)
      setAnnouncement({ kind: 'cancelled' })
    }
  }

  const cancelMove = useEffectEvent(() => finish(false))

  // Escape must also cancel a pointer drag, even if focus is outside its handle.
  useEffect(() => {
    if (!editing) {
      if (!moving.current) return
      const frame = requestAnimationFrame(cancelMove)
      return () => cancelAnimationFrame(frame)
    }

    function onEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape' || !moving.current) return
      event.preventDefault()
      cancelMove()
    }
    function belongsToMove(target: EventTarget | null, handle: HTMLButtonElement) {
      return target === handle || (target instanceof HTMLElement && target.hasAttribute('data-language-switch'))
    }
    function onFocusOut(event: FocusEvent) {
      const move = moving.current
      if (move?.type !== 'keyboard') return
      if (event.relatedTarget) {
        if (!belongsToMove(event.relatedTarget, move.handle)) cancelMove()
        return
      }
      queueMicrotask(() => {
        if (moving.current !== move) return
        // React can temporarily move focus while repositioning the keyed handle.
        if (!belongsToMove(document.activeElement, move.handle)) cancelMove()
      })
    }
    window.addEventListener('keydown', onEscape)
    window.addEventListener('focusout', onFocusOut)
    return () => {
      window.removeEventListener('keydown', onEscape)
      window.removeEventListener('focusout', onFocusOut)
    }
  }, [editing])

  function toggleKeyboardMove(key: SectionKey, handle: HTMLButtonElement) {
    const move = moving.current
    if (move?.key === key && move.type === 'keyboard') finish(true)
    else start({ key, type: 'keyboard', handle })
  }

  function previewStep(key: SectionKey, direction: -1 | 1, control: HTMLButtonElement) {
    const from = order.indexOf(key)
    const to = from + direction
    if (from < 0 || to < 0 || to >= order.length) return false
    const next = [...order]
    next.splice(to, 0, ...next.splice(from, 1))
    const hadFocus = document.activeElement === control
    onPreview(next)
    setAnnouncement({ kind: 'moved', key, position: to + 1, total: order.length })
    requestAnimationFrame(() => {
      if (!control.isConnected) return
      if (hadFocus && document.activeElement === document.body) control.focus({ preventScroll: true })
      if (!hadFocus || document.activeElement === control) {
        control.scrollIntoView({ block: 'nearest', behavior: 'instant' })
      }
    })
    return true
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, key: SectionKey) {
    if (!['Enter', ' ', 'ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)) return
    event.stopPropagation()
    event.preventDefault()
    if (event.key === 'Escape') {
      finish(false)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      toggleKeyboardMove(key, event.currentTarget)
      return
    }
    const move = moving.current
    if (move?.key !== key || move.type !== 'keyboard') return
    previewStep(key, event.key === 'ArrowUp' ? -1 : 1, event.currentTarget)
  }

  const message = !announcement ? '' : announcement.kind === 'cancelled' ? text.order.cancelled
    : announcement.kind === 'picked' ? text.order.picked(text.sections[announcement.key].title)
    : text.order.moved(text.sections[announcement.key].title, announcement.position, announcement.total)

  return (
    <Reorder.Group as="div" ref={bounds} className="portfolio-order-group" axis="y" values={order}
      onReorder={keys => { if (editing && moving.current?.type === 'pointer') onPreview(keys) }}
      data-editing={editing || undefined}>
      {editing && (
        <>
          <p id="section-order-instructions" className="visually-hidden">
            {onSave ? text.order.instructions : text.order.local.instructions}
          </p>
          <ScreenReaderStatus message={message} />
        </>
      )}
      {order.map((key, index) => (
        <SortableSection key={key} sectionKey={key} editing={editing} saving={saving}
          bounds={bounds} reduced={Boolean(reduced)} pickedUp={pickedUp === key}
          moveActive={pickedUp !== undefined} canMoveUp={index > 0} canMoveDown={index < order.length - 1}
          onStep={(direction, control) => {
            if (editing && !saving && !moving.current && previewStep(key, direction, control)) onSave?.()
          }}
          onPointerStart={cancel => start({ key, type: 'pointer', cancel })}
          onPointerEnd={commit => { if (moving.current?.type === 'pointer') finish(commit) }}
          onKeyDown={event => handleKey(event, key)}
          onClick={event => toggleKeyboardMove(key, event.currentTarget)}>
          {sections[key]}
        </SortableSection>
      ))}
    </Reorder.Group>
  )
}
