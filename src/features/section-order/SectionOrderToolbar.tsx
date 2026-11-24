import { useRef } from 'react'
import type { ReactNode, Ref } from 'react'
import { useLanguage } from '../../i18n/language'
import './SectionOrderToolbar.css'

type Props = {
  label: string
  mode: string
  toggleLabel: string
  editing: boolean
  editingAvailable?: boolean
  orderStatus?: string
  onToggleEditing: () => void
  toggleRef?: Ref<HTMLButtonElement>
  action?: ReactNode
  draftActions?: ReactNode
}

export function SectionOrderToolbar({
  label, mode, toggleLabel, editing, editingAvailable = true, orderStatus, onToggleEditing, toggleRef, action, draftActions,
}: Props) {
  const orderUnavailable = !editingAvailable && Boolean(orderStatus)
  return (
    <aside className="portfolio-admin-toolbar" aria-label={label} data-reordering={editing || undefined}
      data-order-unavailable={orderUnavailable || undefined} data-draft-actions={Boolean(draftActions) || undefined}>
      <div className="portfolio-admin-toolbar-inner">
        <p className="portfolio-admin-status">
          <span className="portfolio-admin-dot" aria-hidden="true" />
          <span>{mode}</span>
        </p>
        <output id="portfolio-order-status" className="portfolio-order-status" tabIndex={-1}>
          {editing || !editingAvailable ? orderStatus : ''}
        </output>
        <div className="portfolio-admin-actions">
          <button ref={toggleRef} type="button" data-admin-control disabled={!editingAvailable}
            aria-pressed={editing} onClick={onToggleEditing}>
            <span className="portfolio-admin-switch" aria-hidden="true" />
            {toggleLabel}
          </button>
          {action}
        </div>
        {draftActions && <div className="portfolio-admin-actions portfolio-draft-actions">{draftActions}</div>}
      </div>
    </aside>
  )
}

export function LocalLayoutToolbar({
  editing, dirty, orderStatus, onToggleEditing, onSave, onCancel, onReset,
}: {
  editing: boolean; dirty: boolean; orderStatus: string
  onToggleEditing: () => void; onSave: () => void; onCancel: () => void; onReset: () => void
}) {
  const { text: { order: { local } } } = useLanguage()
  const toggle = useRef<HTMLButtonElement>(null)
  return (
    <SectionOrderToolbar label={local.label} mode={local.mode} toggleLabel={local.editing} editing={editing}
      orderStatus={orderStatus} onToggleEditing={onToggleEditing} toggleRef={toggle}
      draftActions={editing ? (
        <>
          <button type="button" onClick={onReset}>{local.reset}</button>
          <button type="button" onClick={() => {
            toggle.current?.focus({ preventScroll: true })
            onCancel()
          }}>{local.cancel}</button>
          <button type="button" aria-disabled={!dirty} onClick={() => { if (dirty) onSave() }}>{local.save}</button>
        </>
      ) : undefined} />
  )
}
