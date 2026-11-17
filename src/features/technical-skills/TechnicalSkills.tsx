import './TechnicalSkills.css'

const logos = import.meta.glob('../../assets/brands/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const groups = [
  { title: 'Frontend Engineering', description: 'Reusable interfaces and predictable application state.', tools: [
    ['React', 'react'], ['TypeScript', 'typescript'], ['JavaScript', 'javascript'], ['Redux', 'redux'],
    ['HTML', 'html5'], ['CSS', 'css'], ['SCSS', 'sass'],
  ] },
  { title: 'Analytics & Visualization', description: 'Dashboards, reporting, and interactive charts.', tools: [['Highcharts']] },
  { title: 'Testing', description: 'Automated checks for frontend behavior and .NET code.', tools: [
    ['Vitest', 'vitest'], ['React Testing Library', 'testinglibrary'], ['Jest', 'jest'], ['NUnit'],
  ] },
  { title: 'APIs & Data', description: 'Web APIs, relational data access, and persistence.', tools: [
    ['C#'], ['.NET', 'dotnet'], ['ASP.NET Core Web API'], ['Entity Framework Core'], ['SQL Server'], ['PostgreSQL', 'postgresql'],
  ] },
  { title: 'Delivery & Collaboration', description: 'Version control, delivery, and design collaboration.', tools: [
    ['Git', 'git'], ['Azure DevOps'], ['Figma', 'figma'],
  ] },
]

export function TechnicalSkills() {
  return (
    <section id="skills" className={`container portfolio-section`} aria-labelledby="skills-title" tabIndex={-1}>
      <h2 id="skills-title" className="section-title">Technical Skills</h2>
      <p className="section-intro">React and TypeScript are my main tools, with practical experience across APIs, data, and testing.</p>
      <div className="technical-skills-skill-grid">
        {groups.map(({ title, description, tools }, index) => (
          <div key={title} className={index === 0 ? 'technical-skills-primary-skills' : 'technical-skills-skill-group'}>
            <h3>{title}</h3>
            <p>{description}</p>
            <ul className="technical-skills-skill-list">
              {tools.map(([label, logo], toolIndex) => {
                const src = logos[`../../assets/brands/${logo}.svg`]
                return (
                  <li className={index === 0 && toolIndex < 2 ? 'technical-skills-primary-tool' : undefined} key={label}>
                    {src && <img src={src} alt="" width="18" height="18" />}
                    {label}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
