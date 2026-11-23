import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { PointerEvent, RefObject } from 'react'
import limestoneSmall from '../../assets/hero-limestone-480.webp'
import limestoneLarge from '../../assets/hero-limestone-960.webp'

const pointerMotion = '(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)'
const spring = { stiffness: 190, damping: 28, mass: 0.9, restDelta: 0.015, restSpeed: 0.05 }
// A portrait image covering by height may be wider than the desktop column.
const desktopCoverWidth = 'calc(0.8 * clamp(22rem, min(66svh, 52vw), 38rem))'

export function HeroPhoto({ frameRef }: { frameRef: RefObject<HTMLDivElement | null> }) {
  const x = useSpring(0, spring)
  const y = useSpring(0, spring)
  // Keep the layer through the spring's return and release it at rest.
  const willChange = useTransform([x, y], ([horizontal, vertical]) => horizontal || vertical ? 'transform' : 'auto')
  const pointer = useRef<MediaQueryList>(null)

  useEffect(() => {
    const query = window.matchMedia?.(pointerMotion)
    if (!query?.addEventListener) return
    pointer.current = query
    function reset(event: MediaQueryListEvent) {
      if (event.matches) return
      x.jump(0)
      y.jump(0)
    }
    query.addEventListener('change', reset)
    return () => {
      pointer.current = null
      query.removeEventListener('change', reset)
    }
  }, [x, y])

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!pointer.current?.matches || event.pointerType === 'touch' || event.currentTarget.dataset.heroWindow) return
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect()
    if (!width || !height) return
    const horizontal = (2 * (event.clientX - left)) / width - 1
    const vertical = (2 * (event.clientY - top)) / height - 1
    // Limit diagonal travel too. The image extends 6px past each edge of the frame.
    const range = Math.min(5.5, Math.min(width, height) * 0.024)
    const distance = Math.max(1, Math.hypot(horizontal, vertical))
    x.set(horizontal * range / distance)
    y.set(vertical * range / distance)
  }

  function center() {
    x.set(0)
    y.set(0)
  }

  return (
    <div className="hero-visual" ref={frameRef} aria-hidden="true"
      onPointerMove={move} onPointerLeave={center} onPointerCancel={center}>
      <div className="hero-window">
        <div className="hero-photo-crop">
          <motion.img
            src={limestoneLarge}
            srcSet={`${limestoneSmall} 480w, ${limestoneLarge} 960w`}
            sizes={`(max-width: 47.5rem) calc(100vw - clamp(2.5rem, 9.6vw, 9rem)), max(min(33vw, 451px), ${desktopCoverWidth})`}
            width={960}
            height={1200}
            fetchPriority="high"
            alt=""
            style={{ x, y, willChange }}
          />
        </div>
      </div>
    </div>
  )
}
