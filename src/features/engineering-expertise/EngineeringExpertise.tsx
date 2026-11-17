import './EngineeringExpertise.css'

const expertise = [
  { title: 'Enterprise Frontend', text: 'I help move legacy interfaces to React and build reusable components that follow shared UI patterns and Figma designs.' },
  { title: 'Analytics & Data Visualization', text: 'I build dashboards and reporting workflows that let users filter results and explore data through interactive charts.' },
  { title: 'API Integration & Testing', text: 'I connect React features to .NET APIs, handle asynchronous state and errors, and write automated tests for user-facing behavior.' },
]

export function EngineeringExpertise() {
  return (
    <section id="expertise" className={`container portfolio-section`} aria-labelledby="expertise-title" tabIndex={-1}>
      <h2 id="expertise-title" className="section-title">Engineering Expertise</h2>
      <div className="expertise-expertise-grid">
        {expertise.map(({ title, text }) => (
          <div key={title}><h3>{title}</h3><p>{text}</p></div>
        ))}
      </div>
    </section>
  )
}
