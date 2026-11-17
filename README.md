# Srdjan Pajic — Frontend Engineer

An early version of a professional portfolio built with React, TypeScript, Vite, and CSS Modules.

## Local development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

## Checks and production preview

```sh
npm run lint
npm run typecheck
npm run build
npm run preview
```

The production preview is served under `/portfolio/`, matching the GitHub Pages project URL.

## Deployment

In the GitHub repository, select **GitHub Actions** under **Settings → Pages → Source**. The Pages workflow builds and deploys `dist/` on pushes to `main` and can also be run manually.
