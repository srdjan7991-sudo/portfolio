import './TechnologyTags.css'

export function TechnologyTags({ label, tools }: { label: string; tools: readonly string[] }) {
  return (
    <ul className="technology-tags" aria-label={label}>
      {tools.map((tool) => <li key={tool}>{tool}</li>)}
    </ul>
  )
}
