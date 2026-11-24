# Srdjan Pajic | Software Engineer

A portfolio focused on frontend engineering. It includes selected enterprise work, technical skills, professional experience, education, and a downloadable CV.

[Open the public portfolio on GitHub Pages](https://srdjan7991-sudo.github.io/portfolio/)

This documentation describes the current checkout. GitHub Pages serves the last deployed static build, so changes in the checkout may appear there after a later release.

## Run locally

Install Git and Node.js 24.x with npm. From a terminal, clone the repository and start Vite.

```sh
git clone https://github.com/srdjan7991-sudo/portfolio.git
cd portfolio
npm ci
npm run dev
```

Open the URL printed by Vite. The default HTTP setup uses the bundled section order, the guided request walkthrough, and the simulated HTTP scenarios. It works without a database.

For live API calls, Swagger, and administrator controls, follow the [local backend setup](docs/backend.md#local-setup).

## What to explore

| Feature | What it shows |
| --- | --- |
| Architectural Window | The staircase opens in step with the Hero heading and responds to a precise pointer. With reduced motion the full composition is visible immediately. |
| Behind every request | Scroll through a cross section of the browser, server, and database. Select a layer to read about its role. Open the six-stage walkthrough or try simulated HTTP scenarios for out-of-order responses, cancellation, and retry. With the API enabled, the walkthrough can show the response from the portfolio backend. |
| Selected Work | The Mede Analytics preview chart draws as it enters view and erases as it leaves. Explore the case study or open its independent analytics demo. Filter monthly synthetic counts, select a bar to mark its cell in the table, review coverage by category, and compare two months on the same scale. Kterio describes work on its interface and service layer. |
| Technical Skills | Explore 21 technologies across five categories. Open a technology to see its role and related tools. Highcharts links to Mede Analytics and C# links to Kterio. |
| How I Engineer | Explore 26 concepts across frontend engineering, data visualization, API integration, application architecture, and testing. In Testing & Quality, compare what the same input produces with and without the quantity limit. |
| Professional Experience | Follow the project timeline as you scroll. Open project details and follow links between the project stack and Technical Skills. Reduced motion keeps the rail static and updates the current project marker. |
| Education and Contact | Read dated education entries, then find the contact links and CV download in a row below the contact description. The row wraps on narrow screens. Return to the top from the footer. |
| English and Serbian | A header switch changes the language in place and remembers the selection on the next visit. |
| Light and dark themes | A switch in the header with a saved preference. The interface respects reduced motion. |
| Section ordering | In the HTTPS setup, the administrator can sort six content sections by dragging, using the up and down buttons, or using the keyboard. The API saves the order in SQL Server. |

## Stack

| Area | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, CSS Modules, CSS custom properties, locally hosted Geist and Geist Mono |
| Interaction | CSS view timelines for scroll effects, Motion for React for the Hero photo, request cross section, section reordering, Skills, and How I Engineer, SVG and CSS for the request illustrations, Radix UI Collapsible for the mobile menu |
| API and data | ASP.NET Core Minimal APIs on .NET 10, Entity Framework Core, SQL Server, Swashbuckle and Swagger UI |
| Authentication | ASP.NET Core Identity and JWT bearer authentication |
| Testing | Vitest, React Testing Library, jest-dom, user-event, jsdom, V8 coverage, xUnit, ASP.NET Core TestServer |
| Code quality | Oxlint and the TypeScript compiler |

## Project structure

| Path | Responsibility |
| --- | --- |
| [`index.html`](index.html), [`src/main.tsx`](src/main.tsx), [`src/App.tsx`](src/App.tsx) | Theme initialization, React entry point, and page composition |
| [`src/features/`](src/features/) | Portfolio sections, request walkthrough, theme, authentication, and section ordering |
| [`src/components/shared/`](src/components/shared/) | Header, Footer, section markup, technology tags, and screen reader announcements |
| [`src/sections.ts`](src/sections.ts), [`src/hooks/sectionNavigation.ts`](src/hooks/sectionNavigation.ts) | Section keys, active navigation, initial hash links, and section reveals |
| [`src/theme.css`](src/theme.css), [`src/global.css`](src/global.css) | Theme tokens, fonts, shared styles, spacing, and focus indicators |
| [`src/assets/`](src/assets/), [`src/fonts/`](src/fonts/), [`public/`](public/) | Hero images, technology logos, local fonts, and the downloadable CV |
| [`vite.config.ts`](vite.config.ts), [`src/setupTests.ts`](src/setupTests.ts) | Vite, the development API proxy, Vitest, and common test setup |
| [`backend/Portfolio.sln`](backend/Portfolio.sln), [`backend/Portfolio.Api/`](backend/Portfolio.Api/), [`backend/Portfolio.Api.Tests/`](backend/Portfolio.Api.Tests/) | API, database migrations, and backend tests |
| [`.github/workflows/`](.github/workflows/) | Pull request checks and GitHub Pages deployment |

## npm scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Run TypeScript checks and write a production build to `dist/`. |
| `npm run preview` | Serve an existing production build under `/portfolio/`. |
| `npm run lint` | Run Oxlint. Warnings fail the check. |
| `npm run typecheck` | Check TypeScript without emitting files. |
| `npm test` | Run the frontend test suite once. |
| `npm run test:watch` | Rerun tests as files change. |
| `npm run test:coverage` | Run the frontend suite with V8 coverage. The HTML report is at `coverage/index.html`. |

## Documentation

- [Architecture](docs/architecture.md) covers page composition, Technical Skills, How I Engineer, the experience timeline, the sample analytics report, themes, navigation, section ordering, the guided walkthrough, and the HTTP simulator.
- [Local backend and API](docs/backend.md) covers SQL Server, migrations, HTTPS, administrator setup, and endpoint behavior.
- [Testing and deployment](docs/testing-and-deployment.md) covers frontend and backend checks, browser verification, and what GitHub Pages publishes.
