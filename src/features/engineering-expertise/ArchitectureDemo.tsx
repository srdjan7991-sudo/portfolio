import { useState } from 'react'
import { useLanguage } from '../../i18n/language'

const boundaries = ['view', 'service', 'repository'] as const
type Boundary = typeof boundaries[number]

const files = { view: 'ReportView.tsx', service: 'reportService.ts', repository: 'reportRepository.ts' }

const viewSnippet = (load: string) => `function ReportView() {
  const { rows, status } = useReport(${load})
  return <ReportTable rows={rows} status={status} />
}`

const readSnippet = `async function readReports(): Promise<Report[]> {
  const response = await fetch('/api/reports')
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}`

const snippets = {
  view: viewSnippet('getVisibleReports'),
  service: `async function getVisibleReports() {
  const reports = await readReports()
  return reports.filter(report => report.status === 'open')
}`,
  repository: readSnippet,
}

const combinedSnippet = `${viewSnippet('loadReports')}

async function loadReports() {
  const reports = await readReports()
  return reports.filter(report => report.status === 'open')
}

${readSnippet}`

const copy = {
  en: {
    arrangement: 'Code organization',
    combined: 'One module',
    separated: 'Separate modules',
    pipeline: 'Module dependencies',
    combinedSummary: 'The view, the rule for showing open reports and the HTTP request live in the same file.',
    boundaries: {
      view: ['View', 'Presents the rows and request state. It depends on the service for the report data.'],
      service: ['Service', 'Owns the rule for showing open reports and asks the repository for data.'],
      repository: ['Repository', 'Handles the URL, HTTP status and response parsing. A change to the endpoint stays here.'],
    },
  },
  sr: {
    arrangement: 'Organizacija koda',
    combined: 'Jedan modul',
    separated: 'Odvojeni moduli',
    pipeline: 'Zavisnosti modula',
    combinedSummary: 'Prikaz, pravilo za prikaz otvorenih izveštaja i HTTP zahtev nalaze se u istoj datoteci.',
    boundaries: {
      view: ['Prikaz', 'Prikazuje redove i stanje zahteva. Podatke za izveštaj dobija od servisa.'],
      service: ['Servis', 'Određuje koji se otvoreni izveštaji prikazuju i traži podatke od repozitorijuma.'],
      repository: ['Repozitorijum', 'Upravlja URL-om, HTTP statusom i obradom odgovora. Promena endpointa ostaje ovde.'],
    },
  },
}

export function ArchitectureDemo() {
  const { language } = useLanguage()
  const text = copy[language]
  const [separated, setSeparated] = useState(true)
  const [boundary, setBoundary] = useState<Boundary>('view')

  return (
    <>
      <fieldset className="engineer-demo-controls" aria-label={text.arrangement}>
        <button type="button" className="engineer-demo-button" aria-pressed={!separated} onClick={() => setSeparated(false)}>{text.combined}</button>
        <button type="button" className="engineer-demo-button" aria-pressed={separated} onClick={() => setSeparated(true)}>{text.separated}</button>
      </fieldset>
      {separated && (
        <ol className="engineer-boundaries" aria-label={text.pipeline}>
          {boundaries.map(part => (
            <li key={part}>
              <button type="button" className="engineer-demo-button" aria-pressed={part === boundary} onClick={() => setBoundary(part)}>
                {text.boundaries[part][0]}
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="engineer-demo-detail" aria-live="polite" aria-atomic="true">
        <strong><code>{separated ? files[boundary] : files.view}</code></strong>
        <p>{separated ? text.boundaries[boundary][1] : text.combinedSummary}</p>
      </div>
      <pre className="engineer-demo-code"><code>{separated ? snippets[boundary] : combinedSnippet}</code></pre>
    </>
  )
}
