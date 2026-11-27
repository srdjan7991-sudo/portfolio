# Srdjan Pajic | Portfolio walkthrough

I’m a frontend-focused software engineer working mainly with React and TypeScript. Browse my work on Mede Analytics and Kterio, try a sample report, or follow a browser request through the application.

[Open the portfolio](https://srdjan7991-sudo.github.io/portfolio/)

- [Opening screen and navigation](#opening-screen-and-navigation)
- [Behind every request](#behind-every-request)
- [Selected Work](#selected-work)
- [Analytics Report Demo](#analytics-report-demo)
- [Technical Skills](#technical-skills)
- [How I Engineer](#how-i-engineer)
- [Professional Experience](#professional-experience)
- [Education and Contact](#education-and-contact)
- [Run locally](#run-locally)

The numbered callouts tie each screenshot to the steps beneath it. Open a screenshot to read the interface at full size.

## Opening screen and navigation

![Portfolio opening screen with numbered callouts for navigation, display preferences, the two main links, and the architecture simulation.](docs/screenshots/hero--overview.webp)

1. Use the header links to jump to a section. On a phone, open **Menu** first.
2. Switch between light and dark or between **EN** and **SR**. The portfolio remembers both preferences.
3. **View selected work** takes you to the projects. **Get in touch** goes directly to Contact.
4. In **Living application architecture**, choose **Refresh queue** or **Pin first task**. Follow the simulated request to the API and check the result in the review queue. Select **API**, **Service**, or **Data** to inspect its role and connections.

See the controls on a phone and follow a queue refresh from click to response. [Opening screen and navigation guide](docs/guide/using-the-portfolio.md)

## Behind every request

![Request cross section with Application server selected, showing connections among the browser, server, and database.](docs/screenshots/request-flow--cross-section.webp)

1. Choose **Explore the request** to open the six-stage walkthrough. **Try HTTP scenarios** opens a separate simulator for errors, late responses, and cancellation.
2. Choose **Your browser**, **Application server**, or **Database** to reveal its role in the diagram.
3. Follow the solid request line and the dashed response line. In the animated layout, scrolling separates the layers as you approach and stacks them again as you leave. Scroll back through the section to replay the same sequence in reverse.

Follow all six phases or recover from a simulated HTTP 500. [Behind every request guide](docs/guide/request-flow.md)

## Selected Work

![Mede Analytics contribution, case-study control, compact reporting illustration, and sample report link.](docs/screenshots/work--project-preview.webp)

Read **What I built** for the Mede Analytics contribution, then use the numbered callouts to explore the projects.

1. **Analytics overview** draws its lines as you scroll past in browsers with scroll timelines. With reduced motion, the full illustration is visible.
2. **Try a sample report** opens the filters, interactive bar chart, and table.
3. **Read the case study** covers the context, responsibilities, approach, implementation, validation, and value.
4. **Kterio** shows the React and API integration work alongside the C# endpoints and service logic.

## Analytics Report Demo

![The Operations report for April through June with markers for filters, the summary, the chart, and the monthly table.](docs/screenshots/analytics--report-filtered.webp)

1. Set **Reporting period** to **April to June 2026** and **Report category** to **Operations**.
2. The summary shows **82** completed reports and an average of **27.3** per month.
3. Hover over or focus a bar to see its value and the previous-month comparison when available. Narrow charts reserve space for the reading in the page layout. Select the bar by clicking, tapping, or pressing **Enter** to mark its value in the table.
4. Read the matching counts of **24**, **28**, and **30** in **Monthly data**. Use **Reset filters** to return to the starting view.

The demo uses synthetic portfolio data. See bar selection, month comparison, and the empty result on mobile. [Analytics Report Demo guide](docs/guide/analytics-report.md)

## Technical Skills

![Frontend Engineering skills with React selected and the React role, project example, and related technologies visible.](docs/screenshots/skills--react-details.webp)

1. Open **Frontend Engineering** in Skills and select **React**.
2. Read the description and follow **View work on Mede Analytics** to the project and case study. TypeScript and Highcharts link to the same project.
3. Choose a technology under **Works with**, such as **TypeScript**, to open its detail. Use **All categories** to explore the other groups.

## How I Engineer

![Testing and Quality example with markers for the area, the rule and Run checks controls, and two passing checks.](docs/screenshots/engineering--quality-checks.webp)

1. Open **Testing & Quality** in **How I Engineer**.
2. Under **Component tests**, choose **Tests** to see the example. Select **Run checks** with the limit enabled.
3. Both checks pass. Select **Remove the quantity limit** and run them again. The check at the limit now reports the difference between the expected and actual quantities.

Try filtering a state example, changing the sample range of a chart, simulating API responses, and inspecting module boundaries. [Engineering examples guide](docs/guide/engineering-and-experience.md#how-i-engineer)

## Professional Experience

![Professional Experience timeline with Mede Analytics active and its Details control visible.](docs/screenshots/experience--timeline.webp)

1. With motion enabled, follow the filled portion of the rail as you scroll through the projects. With reduced motion, the rail is static and the active dot still follows the scroll position.
2. The project near the center of the viewport gets a filled dot. Scroll up to see the previous project become active again.
3. Open **Details** on Mede Analytics or Kterio for case notes. Select an underlined technology to jump to its detail in Technical Skills.

See an expanded project on mobile and how to return to it from Skills. [Professional Experience guide](docs/guide/engineering-and-experience.md#professional-experience)

## Education and Contact

![Education and Certifications with the professional certification and selected Anthropic courses marked.](docs/screenshots/education--overview.webp)

1. Read the software engineering certification and its date.
2. Review the selected Anthropic courses and their date.

![Contact and footer with callouts for Email, LinkedIn and GitHub, Download CV, and Back to top.](docs/screenshots/contact--overview.webp)

1. **Email** opens your configured mail app.
2. **LinkedIn** and **GitHub** open in new tabs.
3. **Download CV** saves the English CV as a DOCX file.
4. **Back to top** in the footer returns to the opening screen.

## Run locally

Install Git and Node.js 24.x with npm. Clone the repository and start Vite.

```sh
git clone https://github.com/srdjan7991-sudo/portfolio.git
cd portfolio
npm ci
npm run dev
```

Open the URL printed by Vite. The default HTTP setup uses the bundled section order, the guided walkthrough, and the simulated HTTP scenarios without a database. GitHub Pages serves the last deployed static build.

- [Project reference](docs/guide/project-reference.md) for the stack, repository structure, and npm commands.
- [Architecture](docs/architecture.md) for the React application, interaction models, and section ordering.
- [Local backend and API](docs/backend.md#local-setup) for HTTPS, SQL Server, Swagger, and the administrator controls that save the order of the six content sections.
- [Testing and deployment](docs/testing-and-deployment.md) for frontend, Chromium, and SQL Server checks and the GitHub Pages release workflow.
