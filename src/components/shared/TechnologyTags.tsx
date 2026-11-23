import type { MouseEventHandler } from 'react'
import './TechnologyTags.css'

type Props = {
  label: string
  tools: readonly string[]
  linkFor?: (tool: string) => { href: string; id: string } | undefined
  onLinkClick?: MouseEventHandler<HTMLAnchorElement>
}

export function TechnologyTags({ label, tools, linkFor, onLinkClick }: Props) {
  return (
    <ul className="technology-tags" aria-label={label}>
      {tools.map(tool => {
        const link = linkFor?.(tool)
        return <li key={tool}>{link ? <a href={link.href} id={link.id} onClick={onLinkClick}>{tool}</a> : tool}</li>
      })}
    </ul>
  )
}
