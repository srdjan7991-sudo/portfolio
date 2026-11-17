# Srdjan Pajic — Frontend-Focused Software Engineer

A personal portfolio for Srdjan Pajic. It gives recruiters and engineering teams an overview of his frontend work, including selected enterprise projects, engineering expertise, technical skills, professional experience, education, and certifications. Visitors can find contact links and download his CV.

## Live Demo

[View the production portfolio on GitHub Pages](https://srdjan7991-sudo.github.io/portfolio/)

## Tech Stack

| Area | Tools |
| --- | --- |
| UI and build | React, TypeScript, Vite |
| Styling | CSS, CSS Modules, CSS custom properties |
| Interaction | Motion for React (`motion`) for the Hero animation, Radix UI Collapsible for the mobile menu |
| Code quality | Oxlint, TypeScript compiler |
| Testing | Vitest, React Testing Library, jest-dom, user-event, jsdom, V8 coverage |
| Hosting | GitHub Pages and GitHub Actions |

## Project Structure

```text
.
├── .github/workflows/pages.yml
├── .gitignore
├── public/Srdjan_Pajic_CV.docx
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── global.css
│   ├── setupTests.ts
│   ├── vite-env.d.ts
│   ├── assets/brands/
│   ├── fonts/
│   ├── components/shared/
│   │   ├── Layout.tsx
│   │   ├── Layout.test.tsx
│   │   ├── Header.module.css
│   │   ├── Footer.module.css
│   │   ├── Section.css
│   │   ├── TechnologyTags.tsx
│   │   ├── TechnologyTags.test.tsx
│   │   └── TechnologyTags.css
│   ├── hooks/
│   │   ├── sectionNavigation.ts
│   │   └── sectionNavigation.test.ts
│   └── features/
│       ├── hero/                     # Hero
│       ├── selected-work/            # SelectedWork
│       ├── technical-skills/         # TechnicalSkills
│       ├── engineering-expertise/   # EngineeringExpertise
│       ├── professional-experience/ # ProfessionalExperience
│       ├── education-certifications/ # EducationCertifications
│       └── contact/                  # Contact
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

Each feature directory contains a `.tsx` component, a `.css` stylesheet, and a `.test.tsx` file with the base name shown above. `src/assets/brands/` holds technology logos used by Technical Skills. `src/fonts/` contains the self-hosted Instrument Sans and Instrument Serif font files and their license notices. Vite copies the downloadable CV from `public/` into the build output.

## Architecture and Code Organization

`src/main.tsx` mounts React and loads the global styles. `src/App.tsx` assembles the seven sections in page order between the Header and Footer. The site is a single page, with native hash links to individual sections.

`src/hooks/sectionNavigation.ts` defines the navigation targets and handles active-section tracking, initial alignment for direct section links, and scroll-triggered reveals. The shared Header renders the navigation and controls the mobile menu. Header and Footer live in `Layout.tsx`. Selected Work and Professional Experience reuse `TechnologyTags` for their technology lists.

Feature styles sit beside their components. Header and Footer use CSS Modules. `Section.css` defines shared section styles, while `global.css` provides the font declarations, design variables, reset, and page-wide styles.

## Getting Started

Install Git and Node.js 24.x with npm. This matches the Node version declared in `package.json` and used by the deployment workflow.

```sh
git clone https://github.com/srdjan7991-sudo/portfolio.git
cd portfolio
npm ci
npm run dev
```

Open the local URL printed by Vite. The development server serves the site at `/`.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Run the TypeScript check and build the static site into `dist/`. |
| `npm run preview` | Serve the existing production build locally under `/portfolio/`. Run the build first. |
| `npm run lint` | Run Oxlint on the source and Vite config, treating warnings as failures. |
| `npm run typecheck` | Check TypeScript without emitting files. |
| `npm test` | Run the test suite once. |
| `npm run test:watch` | Rerun tests as files change in an interactive terminal. |
| `npm run test:coverage` | Run the tests with V8 coverage and generate the HTML report at `coverage/index.html`. |

## Testing and Code Quality

Vitest uses the shared Vite config and runs component tests in jsdom. React Testing Library queries rendered content through accessible roles and names. jest-dom supplies DOM assertions, and user-event exercises clicks and keyboard interactions. `src/setupTests.ts` registers the matchers and resets test state between runs.

The suite checks navigation targets and active links, mobile menu keyboard behavior and focus, direct hash links, section reveals and reduced motion, case study disclosure, section content, and contact and CV links. Native keyboard activation of the case study was also verified separately in Chromium.

The most recent verified local run passed **25 tests across 10 test files**. The figures below are a snapshot of that run.

| Coverage metric | Result |
| --- | ---: |
| Lines | 96.11% |
| Statements | 96.39% |
| Branches | 86.20% |
| Functions | 100% |

## Deployment

The [GitHub Actions workflow](.github/workflows/pages.yml) runs on pushes to `main` and can also be dispatched manually. It uses Node.js 24, installs locked dependencies with `npm ci`, runs lint, and runs the production build, which includes type checking. The workflow uploads `dist/` as the Pages artifact and publishes it in a separate deploy job. The test and coverage commands are run locally and are outside the current deployment workflow.

In the repository's **Settings → Pages**, the deployment source is **GitHub Actions**. Vite builds assets and URLs under `/portfolio/`, the base path for this GitHub Pages project.
