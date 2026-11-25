# Project reference

[Back to the portfolio walkthrough](../../README.md#run-locally)

## Stack

| Area | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, CSS Modules, CSS custom properties, locally hosted Geist and Geist Mono |
| Interaction | CSS view timelines for scroll effects, Motion for React for the request cross section, section reordering, Skills, and How I Engineer, SVG and CSS for the Hero demo and request walkthrough, Radix UI Collapsible for the mobile menu |
| API and data | ASP.NET Core Minimal APIs on .NET 10, Entity Framework Core, SQL Server, Swashbuckle and Swagger UI |
| Authentication | ASP.NET Core Identity and JWT bearer authentication |
| Testing | Vitest, React Testing Library, jest-dom, user-event, jsdom, V8 coverage, Playwright, xUnit, ASP.NET Core TestServer |
| Code quality | Oxlint and the TypeScript compiler |

## Project structure

| Path | Responsibility |
| --- | --- |
| [`index.html`](../../index.html), [`src/main.tsx`](../../src/main.tsx), [`src/App.tsx`](../../src/App.tsx) | Theme initialization, React entry point, and page composition |
| [`src/features/`](../../src/features/) | Portfolio sections, request walkthrough, theme, authentication, and section ordering |
| [`src/components/shared/`](../../src/components/shared/) | Header, Footer, section markup, technology tags, and screen reader announcements |
| [`src/sections.ts`](../../src/sections.ts), [`src/hooks/sectionNavigation.ts`](../../src/hooks/sectionNavigation.ts) | Section keys, active navigation, and initial hash alignment |
| [`src/theme.css`](../../src/theme.css), [`src/global.css`](../../src/global.css) | Theme tokens, fonts, shared styles, spacing, and focus indicators |
| [`src/assets/`](../../src/assets/), [`src/fonts/`](../../src/fonts/), [`public/`](../../public/) | Illustration assets, technology logos, local fonts, and the downloadable CV |
| [`vite.config.ts`](../../vite.config.ts), [`src/setupTests.ts`](../../src/setupTests.ts) | Vite, the development API proxy, Vitest, and common test setup |
| [`backend/Portfolio.sln`](../../backend/Portfolio.sln), [`backend/Portfolio.Api/`](../../backend/Portfolio.Api/), [`backend/Portfolio.Api.Tests/`](../../backend/Portfolio.Api.Tests/) | API, database migrations, and backend tests |
| [`.github/workflows/`](../../.github/workflows/) | Pull request checks and GitHub Pages deployment |

## npm scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Run TypeScript checks and write a production build to `dist/`. |
| `npm run preview` | Serve an existing production build under `/portfolio/`. |
| `npm run lint` | Run Oxlint. Warnings fail the check. |
| `npm run typecheck` | Check TypeScript without emitting files. |
| `npm test` | Run the frontend test suite once. |
| `npm run test:browser` | Run native Chromium interaction tests against a Vite preview. |
| `npm run test:watch` | Rerun tests as files change. |
| `npm run test:coverage` | Run the frontend suite with V8 coverage. The HTML report is at `coverage/index.html`. |

## Documentation

- [Architecture](../architecture.md) covers page composition, the Hero simulation, Technical Skills, How I Engineer, the experience timeline, the sample analytics report, themes, navigation, section ordering, the guided walkthrough, and the HTTP simulator.
- [Local backend and API](../backend.md) covers SQL Server, migrations, HTTPS, administrator setup, and endpoint behavior.
- [Testing and deployment](../testing-and-deployment.md) covers frontend and backend checks, browser verification, and what GitHub Pages publishes.
- [Portfolio engineering quality skill](../../.agents/skills/professional-engineering-quality/SKILL.md) describes the review, verification, and writing checks for repository changes.
