# Architecture

## Page composition

[`main.tsx`](../src/main.tsx) mounts React. [`App.tsx`](../src/App.tsx) renders the Header, Hero, the request walkthrough, the six content sections, and the Footer in that order. The Header, Hero, walkthrough, and Footer have fixed positions relative to the content group. [`sections.ts`](../src/sections.ts) defines the six reorderable keys and their default order.

| Key | Section | Feature folder |
| --- | --- | --- |
| `work` | Selected Work | [`selected-work`](../src/features/selected-work/) |
| `skills` | Technical Skills | [`technical-skills`](../src/features/technical-skills/) |
| `expertise` | How I Engineer | [`engineering-expertise`](../src/features/engineering-expertise/) |
| `experience` | Professional Experience | [`professional-experience`](../src/features/professional-experience/) |
| `education` | Education & Certifications | [`education-certifications`](../src/features/education-certifications/) |
| `contact` | Contact | [`contact`](../src/features/contact/) |

The React features contain the public page copy. Selected Work presents the Mede Analytics contribution, then opens the six-part case study and sample report through separate native `details` elements. The compact reporting illustration follows the case study in reading order. Where CSS view timelines are supported, its grid, lines, and area draw on entry and erase on exit. The drawing follows local scroll progress in both directions within the plot bounds. Reduced motion, editing mode, and browsers without view timeline support show the full chart. The illustration uses synthetic data. The sample report uses a separate set of synthetic observations. The Kterio summary describes the React and API work and the C# service and endpoint work. Both projects have focusable anchors, `#work-mede` and `#work-kterio`. SQL Server stores section order and separate rows available through the public sections endpoint. [Selected Work](../src/features/selected-work/SelectedWork.tsx)

[`PortfolioSection.tsx`](../src/components/shared/PortfolioSection.tsx) supplies section markup and heading IDs. [`Layout.tsx`](../src/components/shared/Layout.tsx) owns the Header, Footer, and mobile menu. Navigation uses native hash links and follows the current section order. [`sectionNavigation.ts`](../src/hooks/sectionNavigation.ts) manages the active link and initial hash alignment. The current desktop link is underlined and exposes `aria-current="location"`. Each animated feature owns its own reveal behavior.

Initial hash alignment runs again after fonts load or the saved section order arrives, while the original target retains focus and the visitor has kept the initial scroll position. The hook accounts for the browser clamping the scroll position when the document becomes shorter.

### Content widths

The shared container in [global.css](../src/global.css) keeps the standard alignment for section headings, the header, the editor toolbar, Contact, and the footer. Reading widths are maximum line lengths within their section and stay aligned to the section's text.

| Width | Maximum | Used for |
| --- | ---: | --- |
| Reading | `42rem` | Introductions and exercise instructions |
| Standard | `80rem` | Section content, navigation, and walkthrough controls |
| Wide | `92rem` | Hero architecture, the open report, and the open engineering workspace |
| Full | `104rem` | The desktop request cross section's visual surface |

Wide and Full have their own minimum side margins. A breakout inside a Standard section centers on the main content box, which excludes the space taken by a classic scrollbar. The compact request diagram returns to the Standard alignment. The report, case study, and engineering workspace use their available width to decide when columns fit. The Experience timeline and education list stay within the Standard section at `54rem` and `64rem`, respectively.

## Sample analytics report

Open the sample report under Selected Work. The default view shows 15 synthetic counts across Quality, Utilization, and Operations from January through June 2026. Operations reporting starts in April. Each reported observation has its own bar in the monthly group. The table shows the selected months and categories with the same counts. A missing observation is marked as unreported. A reported zero is a valid count. [Report data](../src/features/selected-work/analyticsReport.ts)

The period and category filters apply to the chart, table, and summary metrics. The total sums the reported observations. The monthly average divides the total by the number of selected months with data. The coverage metric counts those months, and the coverage grid shows reported values, reported zeroes, and missing observations by category and month. A selection with no observations shows an empty state. [Report component](../src/features/selected-work/AnalyticsReportDemo.tsx)

Hover over, focus, or tap a bar to see its exact count and the change in count and percentage from the previous calendar month for the same category. Narrow charts keep that reading in a reserved space in the layout so the plots remain clear. Wider charts position the tooltip by the bar. The comparison can use data outside the selected period. The comparison is unavailable if that month has no observation. A zero baseline supports a change in count and leaves the percentage unavailable. Escape dismisses the reading. The report uses the selected language and theme and respects reduced motion.

Activate a bar by clicking, tapping, or pressing Enter or Space to mark its observation in the monthly table. Activate the same bar again, choose **Clear selection**, or change the main filters to remove the mark. Clearing the selection from the table moves focus to the caption after the marked row controls are removed and brings the caption into view. The marked observation and comparison selections survive a language or theme change.

**Compare two months** uses one category and two months from the current report period. The default months favor reported values and stay distinct when an alternative exists. Explicit choices within the period are kept. Both counts share the same scale as the monthly chart. The result gives the second count minus the first, and the percentage uses the first count as its baseline. April and June Operations counts of 24 and 30 give +6 and +25%. A repeated month or missing observation gets an explanation, and a zero baseline still gives the count difference. [Coverage and comparison](../src/features/selected-work/AnalyticsReportContext.tsx)

## Technical Skills

The `#skills` section starts with Frontend Engineering featured above four other categories. Choosing a category expands its technology list and puts the other categories in a compact list below it. Choosing a technology opens its description and related tools. These links can open a technology in another category. Hover and keyboard focus highlight related technologies with color. [TechnicalSkills.tsx](../src/features/technical-skills/TechnicalSkills.tsx)

The group catalog defines the order, names, and existing icon paths. The detail catalog supplies English and Serbian descriptions, project context supported by the portfolio, and links in both directions between related skills. Selection stays local to the section and survives a language change. Closing a detail returns focus to its technology. Returning to all categories restores focus to the last active category. [Group catalog](../src/features/technical-skills/skillGroups.ts) · [Detail catalog](../src/features/technical-skills/skillDetails.ts)

Motion animates the featured surface between categories. On wider screens, the overview surface also narrows toward the technology column as the section enters the viewport in browsers with view timelines. Reduced motion shows the settled layout. React, TypeScript, and Highcharts link to `#work-mede`. C# links to `#experience-kterio`. These links use native fragment navigation. A visit ID distinguishes history entries even when their URLs match. A reload at `#skills` restores a valid saved technology for that visit. An explicit `#skill-*` fragment selects its named technology first. Back restores the project link in the technology detail. Forward restores focus at the project below the fixed header. [Technology details](../src/features/technical-skills/SkillDetailPanel.tsx)

## How I Engineer

The section keeps the `#expertise` anchor and its place in the reorderable content group. Its index opens five areas and shows a concept preview on wider screens. When an area opens, focus moves to its heading. **All areas** returns focus to that area's button. The concept tabs support Left, Right, Home, and End. [Index and focus management](../src/features/engineering-expertise/EngineeringExpertise.tsx) · [Concept workspace](../src/features/engineering-expertise/EngineeringWorkspace.tsx)

Area and concept IDs come from [the feature model](../src/features/engineering-expertise/engineeringAreas.ts). The selected language supplies labels, descriptions, and exercises. Architecture opens the code relevant to the active tab. Testing opens the relevant code or rule comparison. Integration starts a fresh simulation when a concept changes. Visualization keeps the visitor's selected range while changing the exercise. Switching languages keeps the selection and the demo state. Motion and CSS animate the shared heading and transitions when the system setting allows it.

The examples use local state and synthetic data. The sample chart computes an average from the visible weeks. The request simulation uses a cancellable timer and makes no network call. In Testing & Quality, the displayed component test illustrates the Vitest approach. **Run checks** evaluates the quantity rule in the browser. **Compare both rules** applies the same functions to an input of three and shows the return expression and output for each case. With the limit, the result matches the expected three. Without the limit, the result is four. [Quantity rule demo](../src/features/engineering-expertise/QualityDemo.tsx)

## Professional Experience timeline

The `#experience` section keeps the employment summary and three project assignments in their existing order. The focusable project headings have the anchors `#experience-mede`, `#experience-kterio`, and `#experience-alpha`. **Details** adds a note about collaboration on Mede Analytics' .NET 8 migration or Kterio's data access through Entity Framework Core and PostgreSQL. Selected Work presents the longer project responsibilities. [Experience component](../src/features/professional-experience/ProfessionalExperience.tsx)

The timeline fills as the midpoint below the sticky header passes through the project list. It marks the project at that point as current in both scroll directions. If Experience is last, progress uses the available scroll distance so it can reach every project before the page ends. The controller updates in an animation frame, including after details expand or the admin reorders sections. Its entrance observer reveals the heading, introduction, and project contents once. Reduced motion shows the content immediately, stops disclosure transitions, and keeps the rail static while the current marker updates. The text and controls are visible if the entrance observer is unavailable. [Timeline controller](../src/features/professional-experience/useExperienceTimeline.ts)

Technology links use catalog fragments such as `#skill-react`. A linked technology opens its Skills detail and focuses the heading below the sticky header. Back returns to the originating project link and restores the prior Skills selection, even after closing the detail. Forward restores the Skills view and focus for that visit. Links for EF Core and the named .NET versions use their corresponding catalog entries. Technology names without a matching entry stay as text. [Skills catalog](../src/features/technical-skills/skillGroups.ts)

## Themes and motion

[`index.html`](../index.html) applies the saved dark preference before React runs. [`theme.css`](../src/theme.css) supplies color and surface tokens for both themes. [`global.css`](../src/global.css) supplies Geist and Geist Mono, layout widths, spacing, focus outlines, and shared control styles. [`useTheme.ts`](../src/features/theme/useTheme.ts) updates the document theme, browser theme color, and `localStorage` from the Header switch. Light is the default.

The Hero displays a localized `h1`, description, and links to `#work` and `#contact` above **Living application architecture**. The frontend pane presents a sample review queue and two native buttons, **Refresh queue** and **Pin first task**. A smaller backend pane presents the API, service, and data layers. CSS places the panes side by side on wide screens and stacks them on narrow screens. [Hero layout](../src/features/hero/Hero.tsx) · [Hero simulation](../src/features/hero/HeroArchitecture.tsx)

Hover or keyboard focus previews a route. Selecting a backend layer starts a trace back to the frontend actions. If a simulated request is active, the trace starts after its response returns. Only the latest frontend action updates the queue. Reduced motion applies the action immediately and highlights the selected route. The simulation runs entirely in the browser. The separate request walkthrough below the Hero has its own controls and API behavior. [Hero flow](../src/features/hero/useLivingFlow.ts)

The SVG circuit recalculates paths from the button bounds when the layout changes. The frontend traces end at the API. Between the API, service, and data layers, only the traveling signal appears. [Hero circuit](../src/features/hero/LivingCircuit.tsx)

The Selected Work preview, Skills overview, Engineering examples, report coverage, Education, and Contact use local CSS view timelines where supported. Their effects draw the chart or change a surface or decorative mark. The content and actions are available in the static layout and with reduced motion. While the administrator is editing, the reorderable sections use the settled styles for these decorative effects. Education dates use native `time` elements, and the contact links are available before its decorative background expands. The Footer offers a link to the top of the page. [Education](../src/features/education-certifications/EducationCertifications.tsx) · [Contact](../src/features/contact/Contact.tsx)

Section reordering uses Motion for React. The walkthrough player uses SVG and CSS, with the same controls and state in reduced motion. Its text and phase controls remain available at every viewport size.

## Language

The first visit uses English. The EN/SR switch saves the choice under `portfolio-language` in `localStorage`. [`language.tsx`](../src/i18n/language.tsx) reads the preference before rendering the app, sets the document language and metadata, and supplies a typed catalog through React context. Add interface copy to both [`en.ts`](../src/i18n/en.ts) and [`sr.ts`](../src/i18n/sr.ts). Serbian follows the English catalog's keys and parameter types.

Section IDs, workflow state, and API paths stay independent of language. Authentication failures and reorder announcements store codes and data, then render in the selected language. A keyboard reorder stays pending while focus moves between its handle and the language switch. In Contact, LinkedIn and GitHub open in a new tab, Email opens the configured mail handler, and the CV download is labeled as English in either language.

The live walkthrough translates known default titles in the browser result cards using case-insensitive section keys and exact English title matches. For `expertise`, it recognizes both the published `How I Engineer` title and the former `Engineering Expertise` title. Custom titles and bodies stay as returned by the API. The JSON excerpt shows the first record with its original key, title, and up to 100 characters of body text.

## Request walkthrough

Before the player opens, the request cross section presents the browser, application server, and database. On supported desktop layouts with motion enabled, scrolling separates, aligns, and stacks the layers again on each pass. The frame briefly sticks below the header at 51rem of height and moves with the page from 32rem up to that threshold. The planes and paths share the same SVG coordinates. Reduced motion, very short or tall viewports, and narrow portrait ratios use a static diagram with both paths visible. The smallest widths use a stepped layout. Layer buttons reveal explanations independently of the walkthrough and simulations. [Cross section](../src/features/request-flow/RequestCrossSection.tsx)

In **Behind every request**, **Explore the request** opens the player paused at the first stage. Start with **Load content** in the illustrated browser or **Play** in the player controls. Use **Pause**, the previous and next step, and **Replay** to control playback. **Try HTTP scenarios** opens a separate simulator. Closing either panel returns focus to its opener.

| Mode | How it is selected | Result |
| --- | --- | --- |
| **Guided walkthrough** | Default HTTP development or the standard static build | The final screen shows the first three bundled section titles. The walkthrough works without an API call. |
| **Live request** | HTTPS in Vite development, or an HTTPS build with `VITE_PORTFOLIO_AUTH_ENABLED=true` | Starting or replaying calls the public `GET /api/sections` on the same origin. Visitors can use it without signing in. |

The live walkthrough checks that the returned JSON is an array of rows with string `key`, `title`, and `body` fields. The response panel shows the HTTP status and row count for a successful request, plus a preview of the first row when one exists. Moving keyboard focus to the server response makes the JSON immediately readable and pauses playback until the visitor selects **Play**. The illustrated browser shows up to three rows, with distinct messages for an empty response, a pending response, and an error. The request has a 10-second timeout. Closing or replaying cancels the previous request. The clock and the network request run independently, so pausing the animation leaves the request running. The connections retain their measured static paths when browser animation or resize APIs are unavailable.

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

### Interactive HTTP scenarios

Choose **Try HTTP scenarios** in the same section. The simulator runs locally in both the static and HTTPS builds. It shows example GET paths and HTTP statuses without sending requests or depending on the database.

| Scenario | What to try |
| --- | --- |
| Responses out of order | Send the first request and then a newer one. The simulator holds the older response until the newer one arrives. **Without a response check** applies both responses in arrival order and ends on the old period. **With a response check** keeps the result of the most recently issued request. |
| Cancel a slow request | Cancel the pending request or send a replacement that cancels it. A cancelled lane stops before delivering a result. In a real application, aborting `fetch` stops the browser from waiting or reading the response. Server-side work may continue. |
| Recover from HTTP 500 | Send the request and wait for the error to arrive. Retry the same simulated GET and watch the screen move from loading to success. The failed attempt stays in the diagram. |

[`useRequestScenarios.ts`](../src/features/request-flow/scenarios/useRequestScenarios.ts) owns request IDs, phases, and deadlines. Timer events advance a request only when the ID and deadline still match. A delayed timer starts the next phase at delivery so it stays visible for its intended duration. Resetting or switching scenarios clears the run and its pending transitions. Closing the panel pauses its visuals and clears pending timers. Reopening starts a fresh run. Language and theme changes preserve the open run.

[`RequestScenarios.tsx`](../src/features/request-flow/scenarios/RequestScenarios.tsx) renders the request lanes, controls, results, and optional technical details. Starting or cancelling a request scrolls more of the lanes into view when space allows and keeps the active control visible. CSS uses the same transit duration as the simulation. Reduced motion shows the same phases and results with static indicators. The six-stage walkthrough retains its own live request handling and playback.

## Section ordering

[`useSectionOrder.ts`](../src/features/section-order/useSectionOrder.ts) reads the order from `GET /api/sections/order` when API integration is enabled. It falls back to the bundled order if the response is unavailable or invalid. The Header and content group receive the same order.

In **Editing mode**, click or tap the up or down button to move a section one position and save the change. You can also drag a section by its **Move section** handle. From the handle, press Space or Enter to pick up the section, use the arrow keys, then press Space or Enter to save. Escape cancels the move. A rejected save restores the last confirmed order. The administrator can change the sequence of the six sections. Editing the section copy remains a source change.

See the [backend guide](backend.md) for the HTTP contract and the [verification guide](testing-and-deployment.md) for browser checks.
