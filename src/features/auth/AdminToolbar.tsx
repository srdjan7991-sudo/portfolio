import './AdminToolbar.css'
import { useLanguage } from '../../i18n/language'

type Props = {
  editing: boolean
  editingAvailable: boolean
  busy: boolean
  orderStatus?: string
  onToggleEditing: () => void
  onLogout: () => void
}

export function AdminToolbar({ editing, editingAvailable, busy, orderStatus, onToggleEditing, onLogout }: Props) {
  const { text: { order } } = useLanguage()
  const orderUnavailable = !editingAvailable && Boolean(orderStatus)
  return (
    <aside className="portfolio-admin-toolbar" aria-label={order.admin} data-reordering={editing || undefined}
      data-order-unavailable={orderUnavailable || undefined}>
      <div className="portfolio-admin-toolbar-inner">
        <p className="portfolio-admin-status">
          <span className="portfolio-admin-dot" aria-hidden="true" />
          <span>{order.mode}</span>
        </p>
        <output id="portfolio-order-status" className="portfolio-order-status" tabIndex={-1}>
          {editing || !editingAvailable ? orderStatus : ''}
        </output>
        <div className="portfolio-admin-actions">
          <button type="button" data-admin-control disabled={!editingAvailable} aria-pressed={editing} onClick={onToggleEditing}>
            <span className="portfolio-admin-switch" aria-hidden="true" />
            {order.editing}
          </button>
          <button type="button" data-admin-control disabled={busy} onClick={onLogout}>{order.logout}</button>
        </div>
      </div>
    </aside>
  )
}
