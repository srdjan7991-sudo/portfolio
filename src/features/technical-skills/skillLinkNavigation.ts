import type { MouseEvent } from 'react'

export const skillLinkRequest = 'portfolio:skill-link-request'

export function requestSkillLink(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

  // Skills mounts the destination heading. Keep native navigation if Skills is unavailable.
  const request = new CustomEvent(skillLinkRequest, { cancelable: true, detail: event.currentTarget })
  if (!window.dispatchEvent(request)) event.preventDefault()
}
