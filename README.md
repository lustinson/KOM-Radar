# KOM Radar

https://komradar.com/

`KOM Radar` is a full-stack web application that leverages real-time performance analytics to identify personal competitive opportunities on Strava. The platform analyzes nearby segments to predict achievability based on athlete power metrics.

### About Strava & KOMs

Strava is a leading platform for cyclists and runners to track activities and compete on leaderboards. A **KOM** (King of the Mountain) is the fastest time on a given segment, a coveted achievement in the cycling community. KOM Radar helps riders discover which nearby KOMs they're likely to achieve based on their recent performance data.

## Architecture

- `src/app`: App Router pages, global styles, and API routes.
- `src/components`: Client and presentational React components.
- `src/lib/analysis`: High-level KOM analysis orchestration.
- `src/lib/auth`: Session helpers for encrypted account auth.
- `src/lib/athlete`: Athlete ability and power-curve services.
- `src/lib/physics`: Cycling power math and capability scoring.
- `src/lib/power-curve`: Sliding-window power-curve calculation.
- `src/lib/strava`: Server-only Strava API client.
- `src/lib/weather`: Server-only weather API client.
- `src/lib/types`: Shared domain and API types.

## Environment

Create a local env file from `.env.example` and provide:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI`
- `SESSION_SECRET`
- `OPENWEATHER_API_KEY`
- `NEXT_PUBLIC_APP_NAME`

In your Strava API app configuration, set the authorization callback domain/URL so it matches `STRAVA_REDIRECT_URI`.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`, connect your Strava account, share your browser location, and run a nearby KOM analysis.

Use Node `22.x` or newer for the cleanest dependency compatibility.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Future Direction

The current power-curve flow recomputes from Strava streams on demand for the signed-in athlete. The architecture keeps auth, data fetching, and analysis services separate so the next iteration can swap in persisted athlete data, background sync jobs, and database-backed account linking without rewriting the UI or physics logic.

## Legacy Files

The original Python scripts remain in the repo as reference during the migration. Once the TypeScript flow is fully adopted, they can be archived or removed.
