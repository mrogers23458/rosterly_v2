# Rosterly Web App

Rosterly is a web-first Next.js app for youth baseball team management.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```

## End-to-End Testing (Playwright)

Install browser binaries once:

```bash
npx playwright install chromium
```

Run the pre-release smoke suite:

```bash
npm run test:e2e
```

Useful variants:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:report
```

## PWA

The app ships as an installable Progressive Web App with:

- Web App Manifest at `/manifest.webmanifest`
- Service worker at `/sw.js`
- Offline fallback page at `/offline`

## Platform Scope

This repository now targets the web app only (including installed PWA use). The former standalone `mobile/` client has been retired.
