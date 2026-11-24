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

Run the Selected Work and report tests for project anchors, bar selection, coverage, and month comparisons.

```sh
npm test -- src/features/selected-work
```

Run the How I Engineer interaction tests for focus, concept navigation, chart filtering, simulated requests, quantity rule comparisons, and language changes.

```sh
npm test -- src/features/engineering-expertise/EngineeringExpertise.test.tsx
```

Run the Technical Skills tests for category navigation, related tools, project links, focus restoration, and language changes.

```sh
npm test -- src/features/technical-skills/TechnicalSkills.test.tsx
```

Run the Experience disclosure, Skills link, and section navigation tests together.

```sh
npm test -- src/features/professional-experience src/features/technical-skills src/hooks/sectionNavigation.test.ts
```

Run `npm run test:coverage` to generate the V8 report. Open `coverage/index.html` for file-level results from your checkout.

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
| Hero | Reload to see the staircase open in step with the heading. Check that the frame keeps its size and both links work by keyboard from the first frame. On a short mobile viewport, skip past the photo and return slowly from below. Check that the entrance waits until the photo clears the fixed header, including after device rotation. Tap the contact link and use Back to check that the underline and arrow return to rest. Delay the image beyond the entrance and check that it appears in the full frame once loaded. On desktop, move the pointer through the photo and check the return to center and coverage at the corners. Switch on reduced motion during the reveal and while the photo is moving. Follow a CTA during the reveal, then return to the top and verify that the Hero stays open. With the photo fully open and the pointer outside it, scroll away and back to check that the full crop stays visible. |
| Request cross section | On a wide, tall desktop viewport, verify that the three layers separate and align as you scroll through the request section in both directions. Check that each request and response line stays connected to its port. Select a layer by keyboard and on a touch screen. On a narrow viewport, check the stepped diagram and tap a layer button. Open and close the walkthrough and scenarios on a short screen, including 320 × 350 px, and check the visible focus target and return to the opener. In the HTTPS build, verify that scrolling past the cross section produces no request to the public sections endpoint. |
| Public page | Review the layout at 320, 375, 390, 768, 1024, 1280, 1440, and 1920 px in both languages and themes. Check keyboard focus, the mobile menu, section hash links, the case study, and asset loading. Switch languages with the menu or case study open. From the language switch, press Escape to return focus to the menu trigger. Reopen the menu and tab out of the header to check that the focused content is visible. Reload to verify the saved language on the first render. |
| Selected Work preview | Scroll toward the Mede Analytics preview and check that its grid, two series, and area fill draw together. Scroll past it to check that the drawing erases. Reverse direction during drawing and erasing, and jump quickly across the section. Check that the drawing follows the current scroll position and the plot keeps its size. In reduced motion and editing mode, check that the full chart is visible. |
| Selected Work and analytics | Open `#work-mede` and check visible focus below the header. Open the report and check for 15 bars grouped across January through June. Confirm the chart and table counts match and Operations is unreported through March. Activate April's Operations bar and check that the table marks its 24. Press Escape and verify that the tooltip closes while the mark remains. Use **Clear selection** and check focus on the table caption. Open **Compare two months**, choose Operations, and compare April and June for 24, 30, +6, and +25%. Choose January to check the missing value message. Select Q2 and Quality and verify April's tooltip includes an increase of 9 from March, outside Q2. Switch to Operations and Q1 to check the empty state, then reset. Switch languages and themes with a mark and comparison active and check that the choices persist. |
| How I Engineer | Open each area and navigate its concept tabs with arrow keys, Home, and End. On a short viewport, check that the heading stays visible after the transition and that **All areas** returns to the visible opener. On a touch screen, choose three weeks and tap a bar to check its reading. Focus one bar with the keyboard, hover another, and press Space to verify that the reading follows the keyboard selection. In the API example, trigger an error and retry with success. In Testing & Quality, add two items with the limit on and off. Check that the quantity stops at three with the limit and reaches four without it, with one failed result. Switch languages with a demo open and verify that its state is preserved. Turn on reduced motion during a transition and check that movement stops. |
| Quantity rule comparison | Open **Compare both rules** and verify that input three produces three with the limit and four without it. Read each displayed return expression and result. Switch language with the disclosure open and check that both outputs remain available. |
| Technical Skills | Hover React and check that TypeScript and Highcharts change color without underlines. Open React using Enter or touch, then choose Highcharts in its related list. Check the new category and detail. Shift+Tab from the Highcharts detail heading back to its technology button. Press Enter or Escape and check that the detail closes and the focused technology stays highlighted. On a short viewport, verify that the focused control and the return button are visible when opening a category. Check that the selected technology remains distinguishable in forced colors. Switch languages with a detail open and turn on reduced motion during a transition. |
| Skills project links | Open the Highcharts and C# details and activate each project link. Check visible focus at `#work-mede` or `#experience-kterio`, then use Back to return to the project link in Skills. Use Forward to return focus to the project. Start at Kterio and follow C# and its project link, then use Back twice and Forward once. That visit should focus the C# heading. Repeat from a direct `#skill-highcharts` visit. |
| Professional Experience | Scroll past the three projects in both directions. Check the rail, current marker, and one-time entrances. Open **Details** for Mede Analytics and Kterio by keyboard and touch. Open .NET 5 from the last project and check the heading below the sticky header. Use Back and confirm that the same link returns to focus and the next Tab continues in the project. Repeat after closing the detail in Skills and with another Skills category previously open. Use Back and Forward after following two project links in succession. Follow a header link and check that Back follows regular section navigation. Reload a direct link such as `/portfolio/#skill-highcharts`. Check stacked dates on mobile. Turn on reduced motion while details are moving, and repeat with IntersectionObserver or ResizeObserver unavailable. |
| Guided walkthrough | Start the request, advance through all six stages, pause and resume, step manually, replay, and close. Check that the outgoing and returning fills meet their SVG endpoints, the server rotates, and the three database slots seat in order. Switch languages mid-stage to verify that the scene keeps its size and the animation keeps its place. |
| HTTP scenarios | Open **Try HTTP scenarios** and check that its focused heading is visible in short viewports. Select a scenario with the arrow keys. Send both race requests and compare the two results. Cancel a slow request and send a replacement. Retry after HTTP 500 and verify that both attempts remain visible. Reset or close during processing and watch for stale updates. Repeat in both languages and themes on mobile and desktop. |
| Reduced motion | Emulate `prefers-reduced-motion: reduce` during a scene. The cross section shows the static diagram, the Experience rail stays static while its current marker changes, and the Hero shows the full photo. Verify that the walkthrough can still start, pause, and step through each stage. Check that HTTP simulations complete, and that filters, marks, and comparisons still work in the report. |
| Education and Contact | Check the education dates and reading order with two columns and on mobile. Open `#contact` directly. Check that all four links sit below the contact description in one row where they fit and wrap without horizontal overflow on narrow screens. Tab to the email link and check the download and footer link. Check that the decorative surface stays clear of the focus target while scrolling. |
| Live walkthrough | In the HTTPS frontend, run the demonstration and check `GET /api/sections` in the browser Network panel. Compare the HTTP status and row count with the player. An empty response should show the empty state. A failed request should show an error with a replay option. |
| Administration | Check sign-in, reload with the session intact, and sign-out. In **Editing mode**, click or tap the up and down buttons, check the controls at both ends of the list, and reload to confirm the saved order. Start a keyboard move, switch languages, and return to the handle to save. Repeat and cancel by leaving the handle and switch. Check drag sorting and the fixed positions of Header, Hero, the walkthrough, and Footer. Confirm the reorderable sections use their settled decorative styles while editing and that project links still work after reordering. |

For a performance comparison, build the base revision and the candidate and use the same browser, viewport, throttling, and page state. Record initial LCP and layout shift, then sample frame intervals while scrolling the page in both directions. Use multiple runs and report the median, device or emulation settings, and browser version. Browser fixtures can verify rendering and API request timing. Use the HTTPS setup and an isolated SQL Server instance when verifying live database behavior.

At 320 px, check that grouped report bars are easy to activate individually. In a short viewport, place **Clear selection** just below the fixed header and activate it by keyboard. The table caption should receive visible focus. For comparison defaults, choose April as the comparison month with Quality selected, then switch the comparison category to Operations. April should remain selected and the automatic starting month should be different.

## GitHub Actions and Pages

The [pull request workflow](../.github/workflows/ci.yml) runs the frontend tests, lint, TypeScript checks, and production build on Linux with Node.js 24. Its backend job uses .NET 10, builds the solution in Release mode, and runs the tests that need no database. A separate `backend-sql` job runs the five integration tests against a temporary SQL Server 2022 container on the runner.

The [Pages workflow](../.github/workflows/pages.yml) runs on pushes to `main` and supports manual dispatch. Select **GitHub Actions** as the Pages source in the repository settings. The workflow runs `npm ci`, lint, and the production build, then uploads `dist/` and deploys it. The production asset base is `/portfolio/`.

GitHub Pages serves the static frontend. After an authorized release, verify the workflow result and open the [public portfolio](https://srdjan7991-sudo.github.io/portfolio/) to check the deployed HTML, styles, fonts, and JavaScript. A build from the current code with the standard Pages configuration uses bundled section content and supports the guided walkthrough and simulated HTTP scenarios. The live site reflects the last successful deployment of `main`.

The live API and administrator UI need a separate HTTPS host. Serve the built frontend under its configured base and route `/api` at the same browser origin to the API. Set `VITE_PORTFOLIO_AUTH_ENABLED=true` at frontend build time and configure `Auth:Origin` to that origin. Follow the [backend configuration guide](backend.md#local-setup) for the database and server-side settings.
