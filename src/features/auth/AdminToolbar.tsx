import { useLanguage } from '../../i18n/language'
import { SectionOrderToolbar } from '../section-order/SectionOrderToolbar'

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
  return (
    <SectionOrderToolbar label={order.admin} mode={order.mode} toggleLabel={order.editing}
      editing={editing} editingAvailable={editingAvailable} orderStatus={orderStatus} onToggleEditing={onToggleEditing}
      action={<button type="button" data-admin-control disabled={busy} onClick={onLogout}>{order.logout}</button>} />
  )
}
