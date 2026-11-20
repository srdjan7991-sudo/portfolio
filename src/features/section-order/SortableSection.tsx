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
  moveActive: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onStep: (direction: -1 | 1, control: HTMLButtonElement) => void
  onPointerStart: (cancel: () => void) => void
  onPointerEnd: (commit: boolean) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  onClick: MouseEventHandler<HTMLButtonElement>
}

export function SortableSection({
  sectionKey, children, editing, saving, bounds, reduced, pickedUp,
  moveActive, canMoveUp, canMoveDown, onStep,
  onPointerStart, onPointerEnd, onKeyDown, onClick,
}: ItemProps) {
  const { text } = useLanguage()
  const controls = useDragControls()
  const y = useMotionValue(0)
  const title = text.sections[sectionKey].title
  const steps = [
    { direction: -1, label: text.order.moveUp(title), arrow: '↑', available: canMoveUp },
    { direction: 1, label: text.order.moveDown(title), arrow: '↓', available: canMoveDown },
  ] as const
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
        <div className="portfolio-order-controls">
          <button className="portfolio-order-handle" type="button" data-admin-control data-section-order-control
            aria-disabled={saving || undefined} aria-label={text.order.reorder(title)} aria-pressed={pickedUp}
            aria-describedby="section-order-instructions"
            onPointerDown={event => { if (!saving) controls.start(event) }}
            onKeyDown={event => { if (!saving) onKeyDown(event) }} onClick={event => { if (!saving) onClick(event) }}>
            <span className="portfolio-order-grip" aria-hidden="true" />
            {text.order.move}
          </button>
          {steps.map(({ direction, label, arrow, available }) => (
            <button key={direction} className="portfolio-order-step" type="button" data-admin-control
              data-section-order-control aria-label={label} title={label}
              disabled={moveActive} aria-disabled={saving || !available || undefined}
              onClick={event => onStep(direction, event.currentTarget)}>
              <span aria-hidden="true">{arrow}</span>
            </button>
          ))}
        </div>
      )}
    </Reorder.Item>
  )
}
