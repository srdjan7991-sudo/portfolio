import { TechnologyTags } from '../../components/shared/TechnologyTags'
import './SelectedWork.css'

function AnalyticsPreview() {
  return (
    <figure className="selected-work-preview">
      <div className="selected-work-dashboard" aria-hidden="true">
        <div className="selected-work-dashboard-header">
          <span>Analytics overview</span>
          <span className="selected-work-sample-label">Synthetic data</span>
        </div>
        <div className="selected-work-dashboard-body">
          <div className="selected-work-chart-heading">
            <div>
              <p>Reporting trends</p>
              <strong>Monthly comparison</strong>
            </div>
            <div className="selected-work-legend">
              <span>Series A</span>
              <span>Series B</span>
            </div>
          </div>
          <svg className="selected-work-chart" viewBox="0 0 640 206" fill="none" focusable="false">
            <path d="M0 20H640 M0 64H640 M0 108H640 M0 152H640 M0 196H640" stroke="#344945" />
            <path d="M0 161 C40 166 67 130 112 137 S178 155 224 120 S287 76 320 92 S390 108 432 66 S505 90 544 48 S610 60 640 21 L640 196 H0Z" fill="#acdccc" fillOpacity=".09" />
            <path d="M0 161 C40 166 67 130 112 137 S178 155 224 120 S287 76 320 92 S390 108 432 66 S505 90 544 48 S610 60 640 21" stroke="#acdccc" strokeWidth="3" />
            <path d="M0 182 C51 183 71 157 112 160 S173 174 224 155 S286 118 320 133 S393 142 432 115 S499 123 544 97 S606 105 640 73" stroke="#e0b68e" strokeWidth="2" strokeDasharray="6 5" />
          </svg>
          <div className="selected-work-chart-months">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
          </div>
        </div>
      </div>
      <figcaption>Illustrative reconstruction using synthetic data.</figcaption>
    </figure>
  )
}

export function SelectedWork() {
  return (
    <section id="work" className={`container portfolio-section`} aria-labelledby="work-title" tabIndex={-1}>
      <h2 id="work-title" className="section-title">Selected Work</h2>
      <p className="section-intro">Enterprise frontend work across healthcare analytics and building operations.</p>
      <div>
        <article className="selected-work-featured">
          <div className="selected-work-project-intro">
            <p className="selected-work-eyebrow">Healthcare analytics · 2024–2026</p>
            <h3>Mede Analytics</h3>
            <p>I built reporting features and reusable React components during the modernization of a legacy MVC application.</p>
          </div>
          <AnalyticsPreview />
          <TechnologyTags label="Mede Analytics technologies" tools={['React', 'TypeScript', 'Redux', 'Highcharts', '.NET 8', 'Vitest']} />
          <details className="selected-work-case-study">
            <summary>Read the case study</summary>
            <dl className="selected-work-case-details">
              <div><dt>Context</dt><dd>A healthcare analytics platform was transitioning from MVC to React with a shared component library.</dd></div>
              <div><dt>My contribution</dt><dd>I built React and TypeScript features and maintained reusable components based on Figma designs.</dd></div>
              <div><dt>Implementation</dt><dd>I built Highcharts dashboards and reporting workflows with filters, pagination, forms, and dialogs. I managed asynchronous data flows with Redux and integrated the frontend with .NET Web APIs.</dd></div>
              <div><dt>Validation</dt><dd>I added and maintained automated tests with Vitest and React Testing Library.</dd></div>
            </dl>
          </details>
        </article>
        <article className="selected-work-secondary-project">
          <p className="selected-work-eyebrow">Building data management · 2022–2024</p>
          <h3>Kterio</h3>
          <p>I built React and Redux features for a cloud-based building data platform and integrated them with backend APIs. I also implemented REST endpoints and service logic in C# and .NET Core.</p>
        </article>
      </div>
    </section>
  )
}
