# Testing and deployment

## Frontend checks

Run from the repository root after `npm ci`.

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Vitest uses jsdom and the setup in [`src/setupTests.ts`](../src/setupTests.ts). Tests sit next to the features and use React Testing Library, jest-dom, and user-event. They cover navigation and focus, the mobile menu, language and theme persistence, case study disclosure, admin sessions, section order confirmation and rollback, and guided and live walkthrough states. To run the walkthrough tests alone:

```sh
npm test -- src/features/request-flow/RequestFlow.test.tsx
```

Run `npm run test:coverage` to generate the V8 report. Open `coverage/index.html` for file-level results. The local run on 18 November 2026 passed 76 tests across 15 files.

| Metric | Local snapshot |
| --- | ---: |
| Statements | 86.37% |
| Branches | 81.29% |
| Functions | 86.89% |
| Lines | 90.27% |

The simulated DOM tests cover state, controls, and response handling. SVG geometry, rendered CSS timing, and pointer dragging require browser checks.

## Backend checks

Run with the .NET 10 SDK. Leave `PORTFOLIO_TEST_SQL` unset for the same SQL-free test path used by CI.

```sh
dotnet build backend/Portfolio.sln --configuration Release
dotnet test backend/Portfolio.sln --configuration Release --no-build --no-restore
```

The xUnit suite uses ASP.NET Core TestServer. It covers HTTP responses, validation, authorization, rate limiting, and the development Swagger contract. Four SQL tests opt in through `PORTFOLIO_TEST_SQL` and cover first administrator setup, refresh and logout behavior, account lockout, and section order persistence. Supply a connection string for an isolated test SQL Server environment with permission to create and remove test databases. The fixture creates, migrates, and attempts to remove its own uniquely named `PortfolioAuthTests_*` database. Run the same test command after setting the variable in the test terminal.

## Browser verification

Run the static build locally with `npm run build` followed by `npm run preview`. Open `/portfolio/` at the preview address printed by Vite. Use the [local HTTPS setup](backend.md#local-setup) for the API and administrator checks.

| Area | What to verify |
| --- | --- |
| Public page | Review the layout at 320, 375, 390, 768, 1024, 1280, 1440, and 1920 px in both languages and themes. Check keyboard focus, the mobile menu, section hash links, the case study, and asset loading. Switch languages with the menu or case study open. From the language switch, press Escape to return focus to the menu trigger. Reopen the menu and tab out of the header to check that the focused content is visible. Reload to verify the saved language on the first render. |
| Guided walkthrough | Start the request, advance through all six stages, pause and resume, step manually, replay, and close. Check that the outgoing and returning fills meet their SVG endpoints, the server rotates, and the three database slots seat in order. Switch languages mid-stage to verify that the scene keeps its size and the animation keeps its place. |
| Reduced motion | Emulate `prefers-reduced-motion: reduce`. Check that the walkthrough can still start, pause, and step through each stage while the illustrations show the current state. |
| Live walkthrough | In the HTTPS frontend, run the demonstration and check `GET /api/sections` in the browser Network panel. Compare the HTTP status and row count with the player. An empty response should show the empty state. A failed request should show an error with a replay option. |
| Administration | Check sign-in, reload with the session intact, and sign-out. In **Editing mode**, start a keyboard move, switch languages, and return to the handle to save. Repeat and cancel by leaving the handle and switch. Check pointer sorting, the saved order after reloading, and the fixed positions of Header, Hero, the walkthrough, and Footer. |

## GitHub Actions and Pages

The [pull request workflow](../.github/workflows/ci.yml) runs the frontend tests, lint, TypeScript checks, and production build on Linux with Node.js 24. Its backend job uses .NET 10, builds the solution in Release mode, and runs the tests with SQL integration disabled.

The [Pages workflow](../.github/workflows/pages.yml) runs on pushes to `main` and supports manual dispatch. Select **GitHub Actions** as the Pages source in the repository settings. The workflow runs `npm ci`, lint, and the production build, then uploads `dist/` and deploys it. The production asset base is `/portfolio/`.

GitHub Pages serves the static frontend. After an authorized release, verify the workflow result and open the [public portfolio](https://srdjan7991-sudo.github.io/portfolio/) to check the deployed HTML, styles, fonts, and JavaScript. A build from the current code with the standard Pages configuration uses bundled section content and the guided walkthrough. The live site reflects the last successful deployment of `main`.

The live API and administrator UI need a separate HTTPS host. Serve the built frontend under its configured base and route `/api` at the same browser origin to the API. Set `VITE_PORTFOLIO_AUTH_ENABLED=true` at frontend build time and configure `Auth:Origin` to that origin. Follow the [backend configuration guide](backend.md#local-setup) for the database and server-side settings.
