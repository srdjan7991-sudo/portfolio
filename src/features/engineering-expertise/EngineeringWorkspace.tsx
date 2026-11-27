import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useLanguage } from '../../i18n/language'
import { conceptExercises } from './conceptExercises'
import { engineeringAreas } from './engineeringAreas'
import type { EngineeringArea, EngineeringConcept } from './engineeringAreas'
import { ArchitectureDemo } from './ArchitectureDemo'
import { FrontendDemo } from './FrontendDemo'
import { QualityDemo } from './QualityDemo'
import { RequestDemo } from './RequestDemo'
import { VisualizationDemo } from './VisualizationDemo'

function renderDemo(area: EngineeringArea, index: number) {
  switch (area) {
    case 'frontend':
      return <FrontendDemo concept={engineeringAreas.frontend[index]} />
    case 'visualization':
      return <VisualizationDemo />
    case 'integration':
      return <RequestDemo key={engineeringAreas.integration[index]} />
    case 'architecture': {
      const concept = engineeringAreas.architecture[index]
      return <ArchitectureDemo key={concept} concept={concept} />
    }
    case 'quality': {
      const concept = engineeringAreas.quality[index]
      return <QualityDemo key={concept} concept={concept} />
    }
  }
}

export function EngineeringWorkspace({ area }: { area: EngineeringArea }) {
  const { language, text: { expertise } } = useLanguage()
  const concepts: readonly EngineeringConcept[] = engineeringAreas[area]
  const [selectedIndex, setSelectedIndex] = useState(0)
  const buttons = useRef<Partial<Record<EngineeringConcept, HTMLButtonElement | null>>>({})
  const selected = concepts[selectedIndex]
  const activeConcept = expertise.concepts[selected]
  const exercise = conceptExercises[language][selected]

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    let next: number
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % concepts.length; break
      case 'ArrowLeft': next = (index + concepts.length - 1) % concepts.length; break
      case 'Home': next = 0; break
      case 'End': next = concepts.length - 1; break
      default: return
    }
    event.preventDefault()
    setSelectedIndex(next)
    buttons.current[concepts[next]]?.focus()
  }

  return (
    <>
      <div className="engineer-concepts" role="tablist" aria-label={expertise.conceptsLabel}>
        {concepts.map((id, index) => (
          <button
            key={id}
            id={`engineer-concept-${id}`}
            ref={element => { buttons.current[id] = element }}
            type="button"
            role="tab"
            tabIndex={selected === id ? 0 : -1}
            aria-selected={selected === id}
            aria-controls="engineer-concept-panel"
            onKeyDown={event => onTabKey(event, index)}
            onClick={() => setSelectedIndex(index)}
          >
            {expertise.concepts[id].title}
          </button>
        ))}
      </div>
      <div id="engineer-concept-panel" className="engineer-concept-panel" role="tabpanel" tabIndex={0}
        aria-labelledby={`engineer-concept-${selected}`}>
        <div className="engineer-concept-content">
          <div className="engineer-concept-notes" key={selected}>
            <h4>{activeConcept.title}</h4>
            <p>{activeConcept.description}</p>
          </div>
          <div className="engineer-demo">
            <h5 className="engineer-label">{expertise.demo}</h5>
            {exercise && <p className="engineer-exercise">{exercise}</p>}
            {renderDemo(area, selectedIndex)}
          </div>
        </div>
      </div>
    </>
  )
}
