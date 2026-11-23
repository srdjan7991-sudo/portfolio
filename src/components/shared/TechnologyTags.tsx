import type { MouseEventHandler } from 'react'
import './TechnologyTags.css'

type Props = {
  label: string
  tools: readonly string[]
  linkFor?: (tool: string) => string | undefined
  onLinkClick?: MouseEventHandler<HTMLAnchorElement>
}

export function TechnologyTags({ label, tools, linkFor, onLinkClick }: Props) {
  return (
    <ul className="technology-tags" aria-label={label}>
      {tools.map(tool => {
        const href = linkFor?.(tool)
        return <li key={tool}>{href ? <a href={href} onClick={onLinkClick}>{tool}</a> : tool}</li>
      })}
    </ul>
  )
}
