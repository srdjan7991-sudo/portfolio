import { PortfolioSection } from '../../components/shared/PortfolioSection'
import { TechnologyTags } from '../../components/shared/TechnologyTags'
import { useLanguage } from '../../i18n/language'
import { AnalyticsReportDemo } from './AnalyticsReportDemo'
import './SelectedWork.css'

const seriesAPath = 'M0 161 C40 166 67 130 112 137 S178 155 224 120 S287 76 320 92 S390 108 432 66 S505 90 544 48 S610 60 640 21'

function AnalyticsPreview() {
  const { text: { work: { preview } } } = useLanguage()
  return (
    <figure className="selected-work-preview">
      <div className="selected-work-dashboard" aria-hidden="true">
        <div className="selected-work-dashboard-header">
          <span>{preview.heading}</span>
          <span className="selected-work-sample-label">{preview.synthetic}</span>
        </div>
        <div className="selected-work-dashboard-body">
          <div className="selected-work-chart-heading">
            <div>
              <p>{preview.trends}</p>
              <strong>{preview.comparison}</strong>
            </div>
            <div className="selected-work-legend">
              <span>{preview.seriesA}</span>
              <span>{preview.seriesB}</span>
            </div>
          </div>
          <div className="selected-work-plot-window">
            <svg className="selected-work-chart" viewBox="0 0 640 206" fill="none" focusable="false">
              <path d="M0 20H640 M0 64H640 M0 108H640 M0 152H640 M0 196H640" stroke="var(--line)" />
              <path d={`${seriesAPath} L640 196 H0Z`} fill="var(--accent-soft)" />
              <path d={seriesAPath} stroke="var(--accent)" strokeWidth="3" />
              <path d="M0 182 C51 183 71 157 112 160 S173 174 224 155 S286 118 320 133 S393 142 432 115 S499 123 544 97 S606 105 640 73" stroke="var(--quiet)" strokeWidth="2" strokeDasharray="6 5" />
            </svg>
          </div>
          <div className="selected-work-chart-months">
            {preview.months.map(month => <span key={month}>{month}</span>)}
          </div>
        </div>
      </div>
      <figcaption>{preview.caption}</figcaption>
    </figure>
  )
}

export function SelectedWork() {
  const { text: { work } } = useLanguage()
  return (
    <PortfolioSection id="work" intro={work.intro}>
      <div>
        <article id="work-mede" className="selected-work-featured" tabIndex={-1} aria-labelledby="work-mede-title">
          <div className="selected-work-project-intro">
            <p className="selected-work-eyebrow">{work.medeCategory} · 2024–2026</p>
            <h3 id="work-mede-title">Mede Analytics</h3>
            <p>{work.mede}</p>
            <TechnologyTags label={work.technologies('Mede Analytics')} tools={['React', 'TypeScript', 'Redux', 'Highcharts', '.NET 8', 'Vitest']} />
            <div className="selected-work-contribution">
              <p className="selected-work-eyebrow" id="work-mede-contribution">{work.contributions.label}</p>
              <ul aria-labelledby="work-mede-contribution">
                {work.contributions.items.map(feature => <li key={feature}>{feature}</li>)}
              </ul>
            </div>
          </div>
          <details className="selected-work-case-study">
            <summary>{work.read}</summary>
            <dl className="selected-work-case-details">
              {Object.entries(work.details).map(([id, detail]) => (
                <div key={id}><dt>{detail.label}</dt><dd>{detail.body}</dd></div>
              ))}
            </dl>
          </details>
          <AnalyticsPreview />
          <AnalyticsReportDemo />
        </article>
        <article id="work-kterio" className="selected-work-secondary-project" tabIndex={-1} aria-labelledby="work-kterio-title">
          <div>
            <p className="selected-work-eyebrow">{work.kterioCategory} · 2022–2024</p>
            <h3 id="work-kterio-title">Kterio</h3>
          </div>
          <div className="selected-work-secondary-copy">
            <p>{work.kterio}</p>
            <dl className="selected-work-kterio-details">
              {Object.entries(work.kterioWork).map(([id, detail]) => (
                <div key={id}><dt>{detail.label}</dt><dd>{detail.body}</dd></div>
              ))}
            </dl>
          </div>
        </article>
      </div>
    </PortfolioSection>
  )
}
