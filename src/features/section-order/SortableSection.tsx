import { animate, Reorder, useDragControls, useMotionValue } from 'motion/react'
import type { KeyboardEvent, MouseEventHandler, ReactNode, RefObject } from 'react'
import { useLanguage } from '../../i18n/language'
import type { SectionKey } from '../../sections'

type ItemProps = {
  sectionKey: SectionKey
  children: ReactNode
  editing: boolean
  saving: boolean
  bounds: RefObject<HTMLDivElement | null>
  reduced: boolean
  pickedUp: boolean
  onPointerStart: (cancel: () => void) => void
  onPointerEnd: (commit: boolean) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  onClick: MouseEventHandler<HTMLButtonElement>
}

export function SortableSection({
  sectionKey, children, editing, saving, bounds, reduced, pickedUp,
  onPointerStart, onPointerEnd, onKeyDown, onClick,
}: ItemProps) {
  const { text } = useLanguage()
  const controls = useDragControls()
  const y = useMotionValue(0)
  return (
    <Reorder.Item as="div" className="portfolio-order-item" value={sectionKey}
      data-picked-up={pickedUp || undefined}
      tabIndex={undefined} drag={editing && !saving ? 'y' : false}
      dragListener={false} dragControls={controls} dragMomentum={false}
      dragConstraints={bounds} dragElastic={0}
      layout="position" style={{ y }}
      whileDrag={editing && !reduced ? { scale: 1.009 } : undefined}
      transition={reduced || !editing ? { duration: 0 } : {
        layout: { type: 'spring', stiffness: 345, damping: 30, mass: 0.85 },
        scale: { type: 'spring', stiffness: 360, damping: 30 },
      }}
      onDragStart={() => onPointerStart(() => {
        controls.cancel()
        if (reduced) y.jump(0)
        else void animate(y, 0, { type: 'spring', stiffness: 420, damping: 34 })
      })}
      onDragEnd={event => onPointerEnd(event.type !== 'pointercancel')}>
      {children}
      {editing && (
        <button className="portfolio-order-handle" type="button" disabled={saving}
          aria-label={text.order.reorder(text.sections[sectionKey].title)} aria-pressed={pickedUp}
          aria-describedby="section-order-instructions"
          onPointerDown={event => { if (!saving) controls.start(event) }}
          onKeyDown={onKeyDown} onClick={onClick}>
          <span className="portfolio-order-grip" aria-hidden="true" />
          {text.order.move}
        </button>
      )}
    </Reorder.Item>
  )
}
