import { useId, useState } from 'react'
import { useLanguage } from '../../i18n/language'
import type { engineeringAreas } from './engineeringAreas'

const reportParts = ['FilterBar', 'ResultSummary', 'ResultList'] as const
type ReportPart = 'ReportWorkspace' | typeof reportParts[number]

const filters = ['all', 'open', 'done'] as const
type Filter = typeof filters[number]

const reportItems = [
  { id: 'navigation', done: true },
  { id: 'contrast', done: false },
  { id: 'breakpoints', done: true },
  { id: 'loading', done: false },
] as const

const copy = {
  en: {
    tree: 'Report component hierarchy',
    parts: {
      ReportWorkspace: 'Owns the active filter and passes it to the controls, summary and results.',
      FilterBar: 'Receives the selected filter and a callback. The same controls can be used with another dataset.',
      ResultSummary: 'Turns the visible results into a count using the same filtered data as the list.',
      ResultList: 'Renders the visible results. It receives the data as props, so it can be reused in another report.',
    },
    filter: 'Filter review items',
    filters: { all: 'All', open: 'Open', done: 'Done' },
    items: { navigation: 'Keyboard navigation', contrast: 'Color contrast', breakpoints: 'Layout breakpoints', loading: 'Loading states' },
    visible: 'Visible',
    done: 'Done',
    layout: 'Preview width',
    compact: 'Narrow',
    wide: 'Wide',
    regions: ['Filters', 'Summary', 'Results'],
    compactNote: 'A single column preserves the reading order on narrow screens.',
    wideNote: 'A wider layout uses the extra space while keeping the same reading order.',
    disclosure: 'Filter options',
    includeDone: 'Include completed items',
    disclosureNote: 'Activate the button with Enter or Space. Its expanded state tells assistive technology when the options are visible.',
    renderMode: 'Rows to render',
    paged: 'Current page',
    full: 'All rows',
    rowsMounted: 'Rendered rows',
    pageStatus: (page: number, total: number) => `Page ${page} of ${total}`,
    nextPage: 'Next page',
    previousPage: 'Previous page',
    row: 'Result',
  },
  sr: {
    tree: 'Hijerarhija komponenti izveštaja',
    parts: {
      ReportWorkspace: 'Čuva aktivni filter i prosleđuje ga kontrolama, sažetku i rezultatima.',
      FilterBar: 'Prima izabrani filter i funkciju za njegovu promenu. Iste kontrole mogu da rade sa drugim skupom podataka.',
      ResultSummary: 'Računa broj prikazanih rezultata iz istih filtriranih podataka koje koristi lista.',
      ResultList: 'Prikazuje rezultate. Podatke prima kroz props, pa može da se koristi i u drugom izveštaju.',
    },
    filter: 'Filtriraj stavke pregleda',
    filters: { all: 'Sve', open: 'Otvorene', done: 'Završene' },
    items: { navigation: 'Navigacija tastaturom', contrast: 'Kontrast boja', breakpoints: 'Prelomne tačke rasporeda', loading: 'Stanja učitavanja' },
    visible: 'Prikazane',
    done: 'Završene',
    layout: 'Širina pregleda',
    compact: 'Usko',
    wide: 'Široko',
    regions: ['Filteri', 'Sažetak', 'Rezultati'],
    compactNote: 'Jedna kolona čuva redosled čitanja na uskim ekranima.',
    wideNote: 'Širi raspored koristi dodatni prostor uz isti redosled čitanja.',
    disclosure: 'Opcije filtriranja',
    includeDone: 'Uključi završene stavke',
    disclosureNote: 'Aktiviraj dugme tasterom Enter ili razmaknicom. Asistivna tehnologija može da najavi da li su opcije vidljive.',
    renderMode: 'Prikaz redova',
    paged: 'Trenutna stranica',
    full: 'Svi redovi',
    rowsMounted: 'Prikazani redovi',
    pageStatus: (page: number, total: number) => `Strana ${page} od ${total}`,
    nextPage: 'Sledeća stranica',
    previousPage: 'Prethodna stranica',
    row: 'Rezultat',
  },
}

type FrontendCopy = typeof copy.en

function ComponentTree({ text, initialPart }: { text: FrontendCopy; initialPart: ReportPart }) {
  const [selectedPart, setSelectedPart] = useState(initialPart)

  function renderPart(part: ReportPart) {
    return (
      <button type="button" className="engineer-demo-button" aria-pressed={part === selectedPart} onClick={() => setSelectedPart(part)}>
        <code>{part}</code>
      </button>
    )
  }

  return (
    <div className="engineer-demo-split">
      <ul className="engineer-component-tree" aria-label={text.tree}>
        <li>
          {renderPart('ReportWorkspace')}
          <ul>
            {reportParts.map(part => <li key={part}>{renderPart(part)}</li>)}
          </ul>
        </li>
      </ul>
      <div className="engineer-demo-detail" aria-live="polite" aria-atomic="true">
        <strong><code>{selectedPart}</code></strong>
        <p>{text.parts[selectedPart]}</p>
      </div>
    </div>
  )
}

function SharedState({ text }: { text: FrontendCopy }) {
  const [filter, setFilter] = useState<Filter>('all')
  const visibleItems = reportItems.filter(({ done }) => filter === 'all' || done === (filter === 'done'))
  const doneCount = visibleItems.filter(item => item.done).length

  return (
    <>
      <fieldset className="engineer-demo-controls" aria-label={text.filter}>
        {filters.map(value => (
          <button key={value} className="engineer-demo-button" type="button" aria-pressed={value === filter} onClick={() => setFilter(value)}>
            {text.filters[value]}
          </button>
        ))}
      </fieldset>
      <div className="engineer-demo-split">
        <ul className="engineer-demo-detail">
          {visibleItems.map(item => <li key={item.id}>{text.items[item.id]}</li>)}
        </ul>
        <dl className="engineer-demo-metrics" aria-live="polite" aria-atomic="true">
          <div><dt>{text.visible}</dt><dd>{visibleItems.length}</dd></div>
          <div><dt>{text.done}</dt><dd>{doneCount}</dd></div>
        </dl>
      </div>
    </>
  )
}

function ResponsivePreview({ text }: { text: FrontendCopy }) {
  const [wide, setWide] = useState(false)

  return (
    <>
      <fieldset className="engineer-demo-controls" aria-label={text.layout}>
        <button type="button" className="engineer-demo-button" aria-pressed={!wide} onClick={() => setWide(false)}>{text.compact}</button>
        <button type="button" className="engineer-demo-button" aria-pressed={wide} onClick={() => setWide(true)}>{text.wide}</button>
      </fieldset>
      <ul className="engineer-demo-preview" data-layout={wide ? 'wide' : 'compact'}>
        {text.regions.map(region => <li key={region}>{region}</li>)}
      </ul>
      <p>{wide ? text.wideNote : text.compactNote}</p>
    </>
  )
}

function DisclosurePreview({ text }: { text: FrontendCopy }) {
  const contentId = useId()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="engineer-demo-detail">
      <button type="button" className="engineer-demo-button" aria-expanded={expanded} aria-controls={contentId}
        onClick={() => setExpanded(current => !current)}>
        {text.disclosure} <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      <div id={contentId} hidden={!expanded}>
        <label className="engineer-demo-check"><input type="checkbox" defaultChecked /> {text.includeDone}</label>
      </div>
      <p>{text.disclosureNote}</p>
    </div>
  )
}

const pageSize = 4
const resultIds = Array.from({ length: 16 }, (_, index) => index + 1)
const pageCount = Math.ceil(resultIds.length / pageSize)

function RenderPreview({ text }: { text: FrontendCopy }) {
  const [paged, setPaged] = useState(true)
  const [page, setPage] = useState(0)
  const pageOffset = page * pageSize
  const visibleIds = paged ? resultIds.slice(pageOffset, pageOffset + pageSize) : resultIds

  return (
    <>
      <fieldset className="engineer-demo-controls" aria-label={text.renderMode}>
        <button type="button" className="engineer-demo-button" aria-pressed={paged} onClick={() => setPaged(true)}>{text.paged}</button>
        <button type="button" className="engineer-demo-button" aria-pressed={!paged} onClick={() => setPaged(false)}>{text.full}</button>
      </fieldset>
      <p><output aria-atomic="true">
        {text.rowsMounted} <strong>{visibleIds.length} / {resultIds.length}</strong>
        {paged && <> · {text.pageStatus(page + 1, pageCount)}</>}
      </output></p>
      <ul className="engineer-demo-detail engineer-demo-rows">
        {visibleIds.map(id => <li key={id}>{text.row} {id}</li>)}
      </ul>
      {paged && (
        <div className="engineer-demo-controls">
          <button type="button" className="engineer-demo-button" aria-disabled={page === 0}
            onClick={() => setPage(current => Math.max(0, current - 1))}>{text.previousPage}</button>
          <button type="button" className="engineer-demo-button" aria-disabled={page === pageCount - 1}
            onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))}>{text.nextPage}</button>
        </div>
      )}
    </>
  )
}

export function FrontendDemo({ concept }: { concept: (typeof engineeringAreas.frontend)[number] }) {
  const { language } = useLanguage()
  const text = copy[language]

  switch (concept) {
    case 'state': return <SharedState text={text} />
    case 'responsive': return <ResponsivePreview text={text} />
    case 'accessibility': return <DisclosurePreview text={text} />
    case 'performance': return <RenderPreview text={text} />
    case 'reusable': return <ComponentTree key={concept} text={text} initialPart="FilterBar" />
    case 'components': return <ComponentTree key={concept} text={text} initialPart="ReportWorkspace" />
  }
}
