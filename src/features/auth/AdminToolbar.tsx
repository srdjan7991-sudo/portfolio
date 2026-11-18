import './AdminToolbar.css'
import { useLanguage } from '../../i18n/language'

type Props = {
  editing: boolean
  busy: boolean
  orderStatus?: string
  onToggleEditing: () => void
  onLogout: () => void
}

export function AdminToolbar({ editing, busy, orderStatus, onToggleEditing, onLogout }: Props) {
  const { text: { order } } = useLanguage()
  return (
    <aside className="portfolio-admin-toolbar" aria-label={order.admin} data-reordering={editing || undefined}>
      <div className="portfolio-admin-toolbar-inner">
        <p className="portfolio-admin-status">
          <span className="portfolio-admin-dot" aria-hidden="true" />
          <span>{order.mode}</span>
        </p>
        <output className="portfolio-order-status">{editing ? orderStatus : ''}</output>
        <div className="portfolio-admin-actions">
          <button type="button" aria-pressed={editing} onClick={onToggleEditing}>
            <span className="portfolio-admin-switch" aria-hidden="true" />
            {order.editing}
          </button>
          <button type="button" disabled={busy} onClick={onLogout}>{order.logout}</button>
        </div>
      </div>
    </aside>
  )
}
