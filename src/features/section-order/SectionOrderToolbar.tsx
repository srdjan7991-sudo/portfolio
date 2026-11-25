import type { ReactNode } from 'react'
import './SectionOrderToolbar.css'

type Props = {
  label: string
  mode: string
  toggleLabel: string
  editing: boolean
  editingAvailable?: boolean
  orderStatus?: string
  onToggleEditing: () => void
  action?: ReactNode
}

export function SectionOrderToolbar({
  label, mode, toggleLabel, editing, editingAvailable = true, orderStatus, onToggleEditing, action,
}: Props) {
  const orderUnavailable = !editingAvailable && Boolean(orderStatus)
  return (
    <aside className="portfolio-admin-toolbar" aria-label={label} data-reordering={editing || undefined}
      data-order-unavailable={orderUnavailable || undefined}>
      <div className="portfolio-admin-toolbar-inner">
        <p className="portfolio-admin-status">
          <span className="portfolio-admin-dot" aria-hidden="true" />
          <span>{mode}</span>
        </p>
        <output id="portfolio-order-status" className="portfolio-order-status" tabIndex={-1}>
          {editing || !editingAvailable ? orderStatus : ''}
        </output>
        <div className="portfolio-admin-actions">
          <button type="button" data-admin-control disabled={!editingAvailable}
            aria-pressed={editing} onClick={onToggleEditing}>
            <span className="portfolio-admin-switch" aria-hidden="true" />
            {toggleLabel}
          </button>
          {action}
        </div>
      </div>
    </aside>
  )
}
