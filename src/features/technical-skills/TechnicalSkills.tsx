import { LayoutGroup, motion } from 'motion/react'
import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PortfolioSection } from '../../components/shared/PortfolioSection'
import { useLanguage } from '../../i18n/language'
import { relatedSkills } from './skillDetails'
import { groupForSkill, skillGroups, skillLogo } from './skillGroups'
import type { SkillGroupId, SkillName } from './skillGroups'
import { SkillDetailPanel } from './SkillDetailPanel'
import './TechnicalSkills.css'

type Selection = { group: SkillGroupId; skill?: SkillName }
const layoutTransition = { duration: 0.36, ease: [0.22, 1, 0.36, 1] } as const
const motionPreference = '(prefers-reduced-motion: reduce)'
const compactLayout = '(max-width: 40rem)'

function subscribeToMotionMode(update: () => void) {
  const media = [window.matchMedia?.(motionPreference), window.matchMedia?.(compactLayout)]
  media.forEach(query => query?.addEventListener('change', update))
  return () => media.forEach(query => query?.removeEventListener('change', update))
}

function getMotionMode() {
  if (window.matchMedia?.(motionPreference).matches) return 'reduced'
  return window.matchMedia?.(compactLayout).matches ? 'compact' : 'full'
}

function focusInSkills(target: HTMLElement, readingDetails: boolean, context: HTMLElement | null) {
  if (target !== document.activeElement) target.focus({ preventScroll: true })
  const scroller = document.scrollingElement
  scroller?.scrollTo({ top: scroller.scrollTop, behavior: 'instant' })
  const anchor = context ?? target
  const top = anchor.getBoundingClientRect().top
  const bottom = target.getBoundingClientRect().bottom
  const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0
  const readingSpace = readingDetails ? 160 : 0
  if (top < header || bottom + readingSpace > window.innerHeight) {
    anchor.scrollIntoView({ block: context || readingDetails ? 'start' : 'nearest', behavior: 'instant' })
  }
}

export function TechnicalSkills() {
  const { text: { skills } } = useLanguage()
  const id = useId()
  const motionMode = useSyncExternalStore(subscribeToMotionMode, getMotionMode)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [hovered, setHovered] = useState<SkillName | null>(null)
  const [focused, setFocused] = useState<SkillName | null>(null)
  const [revealComplete, setRevealComplete] = useState(false)
  const explorer = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const activeGroup = selection?.group
  const current = selection?.skill
  const highlighted = hovered ?? focused ?? current
  const matches = highlighted ? relatedSkills[highlighted] ?? [] : []
  const groups = activeGroup
    ? [...skillGroups.filter(group => group.id === activeGroup), ...skillGroups.filter(group => group.id !== activeGroup)]
    : skillGroups
  const groupButtonIds = `${id}-group-`
  const groupButtonId = (group: SkillGroupId) => groupButtonIds + group
  const skillButtonId = (name: SkillName) => `${id}-tool-${name.replaceAll(' ', '-')}`
  const detailHeadingId = `${id}-detail-heading`
  const detailId = `${id}-detail`

  useLayoutEffect(() => {
    if (!pendingFocus.current) return
    const focusId = pendingFocus.current
    const target = document.getElementById(focusId)
    pendingFocus.current = null
    if (target) focusInSkills(target, focusId === detailHeadingId, focusId.startsWith(groupButtonIds) ? back.current : null)
  }, [detailHeadingId, groupButtonIds, selection])

  function updateSelection(next: Selection | null, focusId: string) {
    setRevealComplete(true)
    setHovered(null)
    setFocused(skill => skill && skillButtonId(skill) === focusId ? skill : null)
    pendingFocus.current = focusId
    setSelection(next)
  }

  function openSkill(name: SkillName) {
    const group = groupForSkill(name)
    if (group) updateSelection({ group: group.id, skill: name }, detailHeadingId)
  }

  function clearSkill() {
    if (activeGroup && current) updateSelection({ group: activeGroup }, skillButtonId(current))
  }

  function showOverview() {
    if (activeGroup) updateSelection(null, groupButtonId(activeGroup))
  }

  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !activeGroup) return
    event.preventDefault()
    if (current) clearSkill()
    else showOverview()
  })

  useEffect(() => {
    const node = explorer.current
    if (!node) return

    function finishReveal(event: AnimationEvent) {
      if (event.animationName === 'skills-index-in' && event.target instanceof HTMLElement &&
          event.target.dataset.group === 'delivery') setRevealComplete(true)
    }

    node.addEventListener('keydown', handleEscape)
    node.addEventListener('animationend', finishReveal)
    node.addEventListener('animationcancel', finishReveal)
    return () => {
      node.removeEventListener('keydown', handleEscape)
      node.removeEventListener('animationend', finishReveal)
      node.removeEventListener('animationcancel', finishReveal)
    }
  }, [])

  return (
    <PortfolioSection id="skills" intro={skills.intro}>
      <LayoutGroup id={id}>
        <div className="skills-explorer" ref={explorer}
          data-view={activeGroup ? 'category' : 'overview'} data-reveal-complete={revealComplete}>
          {activeGroup && (
            <button className="skills-back" type="button" onClick={showOverview} ref={back}>
              <span aria-hidden="true">←</span> {skills.explorer.all}
            </button>
          )}
          <div className="skills-groups">
            {groups.map(group => {
              const { id: groupId, tools } = group
              const selected = groupId === activeGroup
              const expanded = !activeGroup || selected
              const title = skills[groupId].title
              const description = skills[groupId].description
              const detail = selected && current ? tools.find(([name]) => name === current) : undefined
              const related = tools.some(([name]) => matches.includes(name))
              const panelId = `${id}-panel-${groupId}`
              const featured = groupId === (activeGroup ?? 'frontend')

              return (
                <div className="skills-group" key={groupId} data-group={groupId} data-related={related}
                  data-active={selected} data-expanded={expanded} data-detail={Boolean(detail)}>
                  {featured && (
                    <motion.span className="skills-featured-surface" aria-hidden="true"
                      layoutId={motionMode === 'reduced' ? undefined : 'skills-featured-surface'}
                      layoutDependency={selection} transition={layoutTransition} />
                  )}
                  <h3 className="skills-category">
                    <button type="button" className="skills-category-button" id={groupButtonId(groupId)}
                      aria-pressed={selected} aria-controls={panelId}
                      onClick={() => {
                        if (!selected) updateSelection({ group: groupId }, groupButtonId(groupId))
                      }}>
                      <motion.span className="skills-category-name" layout={motionMode === 'full' ? 'position' : false}
                        layoutDependency={selection} transition={layoutTransition}>
                        {title}
                      </motion.span>
                      <span className="skills-category-arrow" aria-hidden="true">{selected ? '↓' : '→'}</span>
                    </button>
                  </h3>
                  <div className="skills-group-body" id={panelId} hidden={!expanded}>
                    {expanded && (
                      <>
                        <p className="skills-group-description">{description}</p>
                        <ul className="skills-tools">
                          {tools.map(([name, logo], index) => {
                            const source = skillLogo(logo)
                            const active = name === current
                            const relation = name === highlighted ? 'highlighted' : matches.includes(name) ? 'related' : undefined
                            return (
                              <li key={name} className={groupId === 'frontend' && index < 2 ? 'skills-primary-tool' : undefined}>
                                <motion.button className="skills-tool" type="button" id={skillButtonId(name)}
                                  layout={motionMode === 'full' && selected ? 'position' : false}
                                  layoutDependency={selection} transition={layoutTransition}
                                  aria-pressed={active} aria-controls={active ? detailId : undefined}
                                  data-relation={relation} data-muted={Boolean(highlighted && !relation && !active)}
                                  onPointerMove={event => {
                                    if (event.pointerType === 'mouse' && hovered !== name) setHovered(name)
                                  }}
                                  onPointerLeave={() => setHovered(null)}
                                  onFocus={() => { setFocused(name); setHovered(null) }}
                                  onBlur={() => setFocused(null)}
                                  onClick={() => { if (active) clearSkill(); else openSkill(name) }}>
                                  {source && <img src={source} alt="" width="18" height="18" />}
                                  <span>{name}</span>
                                </motion.button>
                              </li>
                            )
                          })}
                        </ul>
                        {detail && (
                          <SkillDetailPanel key={detail[0]} tool={detail} id={detailId} headingId={detailHeadingId}
                            onClose={clearSkill} onSelect={openSkill} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </LayoutGroup>
    </PortfolioSection>
  )
}
