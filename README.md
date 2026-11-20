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

Open the URL printed by Vite. The default HTTP setup uses the bundled section order and the guided request walkthrough. It works without a database.

For live API calls, Swagger, and administrator controls, follow the [local backend setup](docs/backend.md#local-setup).

## What to explore

| Feature | What it shows |
| --- | --- |
| Selected Work | The Mede Analytics case study, a reporting preview, and an independent analytics demo with period and category filters. The demo shows synthetic category counts in a grouped monthly chart and a matching table. Hover over, focus, or tap a bar to see the month-over-month change. Kterio has a separate project summary. |
| Behind every request | A six-stage walkthrough of a request through the browser, application server, and database. With the API enabled, it can show the result of a public request to the local backend. |
| English and Serbian | A header switch changes the language in place and remembers the selection on the next visit. |
| Light and dark themes | A switch in the header with a saved preference. The interface respects reduced motion. |
| Section ordering | In the HTTPS setup, the administrator can sort six content sections by dragging, using the up and down buttons, or using the keyboard. The API saves the order in SQL Server. |

## Stack

| Area | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, CSS Modules, CSS custom properties, locally hosted Geist and Geist Mono |
| Interaction | Motion for React for Hero and section reordering, Radix UI Collapsible for the mobile menu, SVG and CSS for the walkthrough |
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

- [Architecture and request walkthrough](docs/architecture.md) covers page composition, the sample analytics report, themes, navigation, section ordering, and the SVG animation timeline.
- [Local backend and API](docs/backend.md) covers SQL Server, migrations, HTTPS, administrator setup, and endpoint behavior.
- [Testing and deployment](docs/testing-and-deployment.md) covers frontend and backend checks, browser verification, and what GitHub Pages publishes.
