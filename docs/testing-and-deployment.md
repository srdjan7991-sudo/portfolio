# Testing and deployment

## Frontend checks

Run from the repository root after `npm ci`.

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Vitest uses jsdom and the setup in [`src/setupTests.ts`](../src/setupTests.ts). Tests sit next to the features and use React Testing Library, jest-dom, and user-event. They cover navigation and focus, the mobile menu, language and theme persistence, case study disclosure, the sample analytics report, admin sessions, and section order confirmation and rollback. Run the guided walkthrough, live request, and HTTP scenario tests with this command.

```sh
npm test -- src/features/request-flow
```

Run the sample report's data and interaction tests with this command.

```sh
npm test -- src/features/selected-work/analyticsReport.test.ts src/features/selected-work/AnalyticsReportDemo.test.tsx
```

Run the How I Engineer interaction tests for focus, concept navigation, chart filtering, simulated requests, regression checks, and language changes.

```sh
npm test -- src/features/engineering-expertise/EngineeringExpertise.test.tsx
```

Run the Technical Skills tests for category reordering, related tools, focus restoration, and language changes.

```sh
npm test -- src/features/technical-skills/TechnicalSkills.test.tsx
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

The xUnit suite uses ASP.NET Core TestServer. It covers HTTP responses, validation, authorization, rate limiting, and the development Swagger contract. Five SQL tests opt in through `PORTFOLIO_TEST_SQL` and cover first administrator setup, refresh and logout behavior, account lockout, published section responses, and section order persistence. Supply a connection string for an isolated test SQL Server environment with permission to create and remove test databases. The fixture creates, migrates, and attempts to remove its own uniquely named `PortfolioAuthTests_*` database. Run the same test command after setting the variable in the test terminal.

## Browser verification

Run the static build locally with `npm run build` followed by `npm run preview`. Open `/portfolio/` at the preview address printed by Vite. Use the [local HTTPS setup](backend.md#local-setup) for the API and administrator checks.

| Area | What to verify |
| --- | --- |
| Hero typography | Reload to see the heading and description reveal in order. Check that the layout stays steady, hovering over either line remains smooth near its edges, and both links remain visible and reachable by keyboard from the first frame. With reduced motion enabled, check that the full heading appears immediately. On a tall desktop viewport with fractional display scaling, check that the portrait uses an image sized for its crop. |
| Public page | Review the layout at 320, 375, 390, 768, 1024, 1280, 1440, and 1920 px in both languages and themes. Check keyboard focus, the mobile menu, section hash links, the case study, and asset loading. Switch languages with the menu or case study open. From the language switch, press Escape to return focus to the menu trigger. Reopen the menu and tab out of the header to check that the focused content is visible. Reload to verify the saved language on the first render. |
| Sample analytics report | Open the report in Selected Work and check for 15 bars grouped across January through June. Verify that the chart and table show the same category counts and that Operations is unreported through March. Select Q2 and Quality. April's tooltip should show a count of 102 and an increase of 9 (about 9.7%) from March, which is outside Q2. Switch the category to Operations. April should show a count of 24 and an unavailable comparison. Select Q1 to check the empty state, then reset the filters. Open tooltips by hovering, tabbing to a bar, and tapping on a touch screen. Press Escape to dismiss a tooltip. Repeat on narrow and wide screens in both languages and themes. Switch the language while the report is open and verify that the filters stay selected. |
| How I Engineer | Open each area and navigate its concept tabs with arrow keys, Home, and End. On a short viewport, check that the heading stays visible after the transition and that **All areas** returns to the visible opener. On a touch screen, choose three weeks and tap a bar to check its reading. Focus one bar with the keyboard, hover another, and press Space to verify that the reading follows the keyboard selection. In the API example, trigger an error and retry with success. In Testing & Quality, add two items with the limit on and off. Check that the quantity stops at three with the limit and reaches four without it, with one failed result. Switch languages with a demo open and verify that its state is preserved. Turn on reduced motion during a transition and check that movement stops. |
| Technical Skills | Hover React and check that TypeScript and Highcharts change color without underlines. Open React using Enter or touch, then choose Highcharts in its related list. Check the new category and detail. Shift+Tab from the Highcharts detail heading back to its technology button. Press Enter or Escape and check that the detail closes and the focused technology stays highlighted. On a short viewport, verify that the focused control and the return button are visible when opening a category. Check that the selected technology remains distinguishable in forced colors. Switch languages with a detail open and turn on reduced motion during a transition. |
| Guided walkthrough | Start the request, advance through all six stages, pause and resume, step manually, replay, and close. Check that the outgoing and returning fills meet their SVG endpoints, the server rotates, and the three database slots seat in order. Switch languages mid-stage to verify that the scene keeps its size and the animation keeps its place. |
| HTTP scenarios | Open **Try HTTP scenarios** and select a scenario with the arrow keys. Send both race requests and compare the two results. Cancel a slow request and send a replacement. Retry after HTTP 500 and verify that both attempts remain visible. Reset or close during processing and watch for stale updates. Repeat in both languages and themes on mobile and desktop. |
| Reduced motion | Emulate `prefers-reduced-motion: reduce`. Check that the walkthrough can still start, pause, and step through each stage. Verify that the HTTP simulator displays static phase indicators and completes each run. In the sample report, check that filters and bar tooltips update without motion. |
| Live walkthrough | In the HTTPS frontend, run the demonstration and check `GET /api/sections` in the browser Network panel. Compare the HTTP status and row count with the player. An empty response should show the empty state. A failed request should show an error with a replay option. |
| Administration | Check sign-in, reload with the session intact, and sign-out. In **Editing mode**, click or tap the up and down buttons, check the controls at both ends of the list, and reload to confirm the saved order. Start a keyboard move, switch languages, and return to the handle to save. Repeat and cancel by leaving the handle and switch. Check drag sorting and the fixed positions of Header, Hero, the walkthrough, and Footer. |

## GitHub Actions and Pages

The [pull request workflow](../.github/workflows/ci.yml) runs the frontend tests, lint, TypeScript checks, and production build on Linux with Node.js 24. Its backend job uses .NET 10, builds the solution in Release mode, and runs the tests that need no database. A separate `backend-sql` job runs the five integration tests against a temporary SQL Server 2022 container on the runner.

The [Pages workflow](../.github/workflows/pages.yml) runs on pushes to `main` and supports manual dispatch. Select **GitHub Actions** as the Pages source in the repository settings. The workflow runs `npm ci`, lint, and the production build, then uploads `dist/` and deploys it. The production asset base is `/portfolio/`.

GitHub Pages serves the static frontend. After an authorized release, verify the workflow result and open the [public portfolio](https://srdjan7991-sudo.github.io/portfolio/) to check the deployed HTML, styles, fonts, and JavaScript. A build from the current code with the standard Pages configuration uses bundled section content and supports the guided walkthrough and simulated HTTP scenarios. The live site reflects the last successful deployment of `main`.

The live API and administrator UI need a separate HTTPS host. Serve the built frontend under its configured base and route `/api` at the same browser origin to the API. Set `VITE_PORTFOLIO_AUTH_ENABLED=true` at frontend build time and configure `Auth:Origin` to that origin. Follow the [backend configuration guide](backend.md#local-setup) for the database and server-side settings.
