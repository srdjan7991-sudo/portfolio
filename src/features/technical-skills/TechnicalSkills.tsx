import { LayoutGroup, motion } from 'motion/react'
import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { MouseEvent } from 'react'
import { PortfolioSection } from '../../components/shared/PortfolioSection'
import { useLanguage } from '../../i18n/language'
import { relatedSkills } from './skillDetails'
import { groupForSkill, linkedSkill, skillAnchor, skillGroups, skillLogo } from './skillGroups'
import type { SkillGroupId, SkillName } from './skillGroups'
import { SkillDetailPanel } from './SkillDetailPanel'
import { skillLinkRequest } from './skillLinkNavigation'
import './TechnicalSkills.css'

type Selection = { group: SkillGroupId; skill?: SkillName; linked?: boolean }
type SkillReturn = { visit: string; id: string; top: number; selection: Selection | null }
type SkillView = { selection: Selection | null; focusId: string }
type ProjectReturn = { id: string; source: string; hash: string; selection: Selection }
let nextSkillVisit = 0
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

function focusInSkills(target: HTMLElement, readingDetails: boolean, context: HTMLElement | null, align = false) {
  if (target !== document.activeElement) target.focus({ preventScroll: true })
  const scroller = document.scrollingElement
  // Cancel a smooth scroll that may still be heading toward the activated link.
  scroller?.scrollTo({ top: scroller.scrollTop, behavior: 'instant' })
  const anchor = context ?? target
  const top = anchor.getBoundingClientRect().top
  const bottom = target.getBoundingClientRect().bottom
  const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0
  const readingSpace = readingDetails ? 160 : 0
  if (align || top < header || bottom + readingSpace > window.innerHeight) {
    anchor.scrollIntoView?.({ block: context || readingDetails ? 'start' : 'nearest', behavior: 'instant' })
  }
}

function initialSelection(): Selection | null {
  const skill = linkedSkill(location.hash)
  const group = skill && groupForSkill(skill)
  return group ? { group: group.id, skill, linked: true } : null
}

export function TechnicalSkills() {
  const { text: { skills } } = useLanguage()
  const id = useId()
  const motionMode = useSyncExternalStore(subscribeToMotionMode, getMotionMode)
  const [selection, setSelection] = useState(initialSelection)
  const [returnToLink, setReturnToLink] = useState<SkillReturn | null>(null)
  const [hovered, setHovered] = useState<SkillName | null>(null)
  const [focused, setFocused] = useState<SkillName | null>(null)
  const explorer = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const selectionBeforeLink = useRef<Selection | null>(null)
  const currentSkillVisit = useRef<string | undefined>(history.state?.skillVisit)
  const handledHistoryUrl = useRef<string | null>(null)
  const visitFrame = useRef(0)
  const activeGroup = selection?.group
  const current = selection?.skill
  const animateSurface = !selection?.linked && motionMode !== 'reduced'
  const animatePositions = animateSurface && motionMode === 'full'
  const highlighted = hovered ?? focused ?? current
  const matches = highlighted ? relatedSkills[highlighted] ?? [] : []
  const groups = activeGroup
    ? [...skillGroups.filter(group => group.id === activeGroup), ...skillGroups.filter(group => group.id !== activeGroup)]
    : skillGroups
  const groupButtonIds = `${id}-group-`
  const groupButtonId = (group: SkillGroupId) => groupButtonIds + group
  const skillButtonId = (name: SkillName) => `${id}-tool-${name.replaceAll(' ', '-')}`
  const detailHeadingId = current ? skillAnchor(current) : undefined
  const detailId = `${id}-detail`

  useLayoutEffect(() => {
    if (!pendingFocus.current) return
    const focusId = pendingFocus.current
    const target = document.getElementById(focusId)
    pendingFocus.current = null
    if (!target) return
    focusInSkills(target, focusId === detailHeadingId,
      focusId.startsWith(groupButtonIds) ? back.current : null, selection?.linked)
  }, [detailHeadingId, groupButtonIds, selection])

  useLayoutEffect(() => {
    if (!returnToLink) return
    // Align after the previous Skills layout and the browser's history scroll have settled.
    const frame = requestAnimationFrame(() => {
      const link = document.getElementById(returnToLink.id)
      if (!link) return
      link.focus({ preventScroll: true })
      const bounds = link.getBoundingClientRect()
      const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0
      const targetTop = Math.max(header, Math.min(returnToLink.top, window.innerHeight - bounds.height))
      window.scrollTo({
        top: window.scrollY + bounds.top - targetTop,
        behavior: 'instant',
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [returnToLink])

  function updateSelection(next: Selection | null, focusId: string, remember = true) {
    const skillInUrl = linkedSkill(location.hash)
    const changedFragment = skillInUrl && skillInUrl !== next?.skill
    const rememberView = remember && !next?.linked && history.state?.skillVisit
    if (changedFragment || rememberView) {
      const skillView: SkillView = { selection: next, focusId }
      const state = rememberView ? { ...history.state, skillView } : history.state
      history.replaceState(state, '', changedFragment ? '#skills' : location.href)
    }
    setHovered(null)
    setFocused(skill => skill && skillButtonId(skill) === focusId ? skill : null)
    pendingFocus.current = focusId
    setSelection(next)
  }

  function openSkill(name: SkillName, fromLink = false) {
    const group = groupForSkill(name)
    if (group) updateSelection({ group: group.id, skill: name, linked: fromLink }, skillAnchor(name))
  }

  function openLinkedSkill(skill: SkillName) {
    if (!selection?.linked) selectionBeforeLink.current = selection
    openSkill(skill, true)
  }

  function clearSkill() {
    if (activeGroup && current) updateSelection({ group: activeGroup }, skillButtonId(current))
  }

  function showOverview() {
    if (activeGroup) updateSelection(null, groupButtonId(activeGroup))
  }

  function rememberProjectLink(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const { id: linkId, hash } = event.currentTarget
    if (!selection || hash === location.hash) return

    // Let the fragment link navigate natively and remember its origin on the current history entry.
    const skillProjectReturn: ProjectReturn = { id: linkId, source: location.href, hash, selection }
    history.replaceState({ ...history.state, skillProjectReturn }, '')
  }

  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !activeGroup) return
    event.preventDefault()
    if (current) clearSkill()
    else showOverview()
  })

  const followSkillLink = useEffectEvent((event: HashChangeEvent) => {
    currentSkillVisit.current = history.state?.skillVisit
    // The traversal already handled this URL before the browser dispatched hashchange.
    const handled = handledHistoryUrl.current === event.newURL
    handledHistoryUrl.current = null
    const project: ProjectReturn | undefined = history.state?.skillProjectReturn
    if (project?.source === event.newURL && event.oldURL && new URL(event.oldURL).hash === project.hash) {
      cancelAnimationFrame(visitFrame.current)
      pendingFocus.current = project.id
      setSelection({ ...project.selection })
      setHovered(null)
      setFocused(null)
      return
    }
    if (handled) return
    const skill = linkedSkill(location.hash)
    if (skill) {
      openLinkedSkill(skill)
    } else if (selection?.linked) {
      setSelection(selectionBeforeLink.current)
      setHovered(null)
      setFocused(null)
    }
  })

  const openRequestedSkill = useEffectEvent((event: Event) => {
    if (!(event instanceof CustomEvent) || !(event.detail instanceof HTMLAnchorElement)) return
    const link = event.detail
    const skill = linkedSkill(link.hash)
    if (!skill) return

    event.preventDefault()
    cancelAnimationFrame(visitFrame.current)
    setReturnToLink(null)
    const visit = `${performance.timeOrigin}-${++nextSkillVisit}`
    const state = { ...history.state }
    delete state.skillReturn
    const skillReturn: SkillReturn = { visit, id: link.id, top: link.getBoundingClientRect().top, selection }
    history.replaceState({ ...state, skillReturn }, '')
    delete state.skillView
    history.pushState({ ...state, skillVisit: visit }, '', link.hash)
    currentSkillVisit.current = visit
    openLinkedSkill(skill)
  })

  const resumeSkillVisit = useEffectEvent((visit: string) => {
    if (history.state?.skillVisit !== visit) return
    const skill = linkedSkill(location.hash)
    const view: SkillView | undefined = history.state?.skillView
    if (skill) openLinkedSkill(skill)
    else if (view) {
      const alreadyVisible = view.selection === selection && document.getElementById(view.focusId)
      if (alreadyVisible) focusInSkills(alreadyVisible, false, null)
      else updateSelection(view.selection, view.focusId, false)
    }
  })

  const traverseSkillHistory = useEffectEvent((event: PopStateEvent) => {
    cancelAnimationFrame(visitFrame.current)
    const origin: SkillReturn | undefined = event.state?.skillReturn
    const returning = origin?.visit === currentSkillVisit.current ? origin : undefined
    currentSkillVisit.current = event.state?.skillVisit
    handledHistoryUrl.current = null
    setReturnToLink(returning ?? null)
    if (returning) {
      handledHistoryUrl.current = location.href
      pendingFocus.current = null
      setSelection(returning.selection)
      setHovered(null)
      setFocused(null)
    } else if (currentSkillVisit.current) {
      handledHistoryUrl.current = location.href
      const visit = currentSkillVisit.current
      // The browser restores its scroll after popstate. Focus the destination after that.
      visitFrame.current = requestAnimationFrame(() => resumeSkillVisit(visit))
    }
  })

  useEffect(() => {
    const node = explorer.current
    if (!node) return

    node.addEventListener('keydown', handleEscape)
    window.addEventListener('hashchange', followSkillLink)
    window.addEventListener(skillLinkRequest, openRequestedSkill)
    window.addEventListener('popstate', traverseSkillHistory)
    return () => {
      cancelAnimationFrame(visitFrame.current)
      node.removeEventListener('keydown', handleEscape)
      window.removeEventListener('hashchange', followSkillLink)
      window.removeEventListener(skillLinkRequest, openRequestedSkill)
      window.removeEventListener('popstate', traverseSkillHistory)
    }
  }, [])

  return (
    <PortfolioSection id="skills" intro={skills.intro} customReveal>
      <LayoutGroup id={id}>
        <div className="skills-explorer" ref={explorer} data-view={activeGroup ? 'category' : 'overview'}>
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
                      layoutId={animateSurface ? 'skills-featured-surface' : undefined}
                      layoutDependency={selection} transition={layoutTransition} />
                  )}
                  <h3 className="skills-category">
                    <button type="button" className="skills-category-button" id={groupButtonId(groupId)}
                      aria-pressed={selected} aria-controls={panelId}
                      onClick={() => {
                        if (!selected) updateSelection({ group: groupId }, groupButtonId(groupId))
                      }}>
                      <motion.span className="skills-category-name" layout={animatePositions ? 'position' : false}
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
                                  layout={animatePositions && selected ? 'position' : false}
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
                          <SkillDetailPanel key={detail[0]} tool={detail} id={detailId} headingId={skillAnchor(detail[0])}
                            linked={selection?.linked} onClose={clearSkill} onSelect={openSkill} onProjectLink={rememberProjectLink} />
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
