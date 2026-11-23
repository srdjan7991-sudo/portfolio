# Architecture

## Page composition

[`main.tsx`](../src/main.tsx) mounts React. [`App.tsx`](../src/App.tsx) renders the Header, Hero, the request walkthrough, the six content sections, and the Footer in that order. The Header, Hero, walkthrough, and Footer have fixed positions relative to the content group. [`sections.ts`](../src/sections.ts) defines the six reorderable keys and their default order.

| Key | Section | Feature folder |
| --- | --- | --- |
| `work` | Selected Work | [`selected-work`](../src/features/selected-work/) |
| `skills` | Technical Skills | [`technical-skills`](../src/features/technical-skills/) |
| `expertise` | Engineering Expertise | [`engineering-expertise`](../src/features/engineering-expertise/) |
| `experience` | Professional Experience | [`professional-experience`](../src/features/professional-experience/) |
| `education` | Education & Certifications | [`education-certifications`](../src/features/education-certifications/) |
| `contact` | Contact | [`contact`](../src/features/contact/) |

The React features contain the public page copy. Selected Work presents the Mede Analytics case study through a native `details` disclosure and labels the reporting preview as an illustrative reconstruction using synthetic data. Kterio has its own project summary. SQL Server stores section order and separate rows available through the public sections endpoint.

[`PortfolioSection.tsx`](../src/components/shared/PortfolioSection.tsx) supplies section markup and heading IDs. [`Layout.tsx`](../src/components/shared/Layout.tsx) owns the Header, Footer, and mobile menu. Navigation uses native hash links and follows the current section order. [`sectionNavigation.ts`](../src/hooks/sectionNavigation.ts) manages the active link, initial hash alignment, and one-time section reveals. The current link uses `aria-current="location"`.

## Themes and motion

[`index.html`](../index.html) applies the saved dark preference before React runs. [`theme.css`](../src/theme.css) supplies color and surface tokens for both themes. [`global.css`](../src/global.css) supplies Geist and Geist Mono, layout widths, spacing, focus outlines, and shared control styles. [`useTheme.ts`](../src/features/theme/useTheme.ts) updates the document theme, browser theme color, and `localStorage` from the Header switch. Light is the default.

The Hero keeps the localized heading as live text in a single `h1`. CSS reveals it in two stages and gives the title a small response to pointer hover. The Hero skips this motion when the browser requests reduced motion. Section reordering uses Motion for React. The walkthrough uses SVG and CSS, with the same controls and state in reduced motion. Its text and phase controls remain available at every viewport size.

## Language

The first visit uses English. The EN/SR switch saves the choice under `portfolio-language` in `localStorage`. [`language.tsx`](../src/i18n/language.tsx) reads the preference before rendering the app, sets the document language and metadata, and supplies a typed catalog through React context. Add interface copy to both [`en.ts`](../src/i18n/en.ts) and [`sr.ts`](../src/i18n/sr.ts). Serbian follows the English catalog's keys and parameter types.

Section IDs, workflow state, and API paths stay independent of language. Authentication failures and reorder announcements store codes and data, then render in the selected language. A keyboard reorder stays pending while focus moves between its handle and the language switch. In Contact, LinkedIn and GitHub open in a new tab, Email opens the configured mail handler, and the CV download is labeled as English in either language.

The live walkthrough translates known default titles in the browser result cards using case-insensitive section keys and an exact English title match. Custom titles and bodies stay as returned by the API. The JSON excerpt shows the first record with its original key, title, and up to 100 characters of body text.

## Request walkthrough

**Behind every request** is labeled **Iza svakog zahteva** in Serbian. Choose **Explore the request**, then **Open walkthrough**. Start with **Load content** in the illustrated browser or **Play** in the player controls. Use **Pause**, the previous and next step, and **Replay** to control playback. Closing the panel returns focus to its opener.

| Mode | How it is selected | Result |
| --- | --- | --- |
| **Guided walkthrough** | Default HTTP development or the standard static build | The final screen shows the first three bundled section titles. The walkthrough works without an API call. |
| **Live request** | HTTPS in Vite development, or an HTTPS build with `VITE_PORTFOLIO_AUTH_ENABLED=true` | Starting or replaying calls the public `GET /api/sections` on the same origin. Visitors can use it without signing in. |

The live walkthrough checks that the returned JSON is an array of rows with string `key`, `title`, and `body` fields. The response panel shows the HTTP status and row count for a successful request, plus a preview of the first row when one exists. The illustrated browser shows up to three rows, with distinct messages for an empty response, a pending response, and an error. The request has a 10-second timeout. Closing or replaying cancels the previous request. The clock and the network request run independently, so pausing the animation leaves the request running.

### Playback and animation

[`requestFlowSteps.ts`](../src/features/request-flow/requestFlowSteps.ts) defines the stage IDs and base durations. The language catalogs supply the phase descriptions. [`useRequestFlow.ts`](../src/features/request-flow/useRequestFlow.ts) reserves at least four seconds per stage for reading. The current stages take about 24 seconds in continuous playback. Their timing explains the request lifecycle and does not measure API latency.

| Stage | What the illustration shows |
| --- | --- |
| Interaction | The browser registers the click and starts the outgoing signal. |
| Communication | The signal moves from the browser to the application server. |
| Processing | The server traces fill and the central element rotates. |
| Database | The line reaches the database. Its middle, upper, and lower slots connect in that order, then the lookup indicator appears. |
| Response | The signal travels back to the server and the response preview becomes available. |
| Result | The signal reaches the browser and the result appears on its screen. |

In the database stage, [`RequestFlowDiagram.tsx`](../src/features/request-flow/RequestFlowDiagram.tsx) defines the inlet cue at 75% of the 3,100 ms base duration. [`RequestFlowDiagram.module.css`](../src/features/request-flow/RequestFlowDiagram.module.css) starts the middle plug at that cue and staggers the upper and lower plugs by 400 ms each. Each slot takes the same accent color and moves into place. The readout appears after the last slot seats. The slots stay connected during the response and result stages. Replay resets the circuit.

[`RequestFlowCircuit.tsx`](../src/features/request-flow/RequestFlowCircuit.tsx) draws normalized paths for the outbound and returning fills. [`RequestFlowConnections.tsx`](../src/features/request-flow/RequestFlowConnections.tsx) measures SVG connection points with `ResizeObserver` and updates the routes in an animation frame. The scene is horizontal at wider widths and stacks at `46rem` and below. Reserved space for captions, response data, and database readouts keeps the layout steady as the state changes. Reduced motion presents each stage without the animated fill and transforms.

## Section ordering

[`useSectionOrder.ts`](../src/features/section-order/useSectionOrder.ts) reads the order from `GET /api/sections/order` when API integration is enabled. It falls back to the bundled order if the response is unavailable or invalid. The Header and content group receive the same order.

In **Editing mode**, click or tap the up or down button to move a section one position and save the change. You can also drag a section by its **Move section** handle. From the handle, press Space or Enter to pick up the section, use the arrow keys, then press Space or Enter to save. Escape cancels the move. A rejected save restores the last confirmed order. The administrator can change the sequence of the six sections. Editing the section copy remains a source change.

See the [backend guide](backend.md) for the HTTP contract and the [verification guide](testing-and-deployment.md) for browser checks.
