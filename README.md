<div align="center">

# Pathfind

**Find your next opportunity. Build your own path.**

A student-built platform for discovering high-school opportunities and planning what to pursue next.

[Live website](https://www.getpathfind.com/) · [54-second demo video](https://raw.githubusercontent.com/Advaita-G/pathfind-showcase/main/docs/media/pathfind-launch.mp4)

[![CI](https://github.com/Advaita-G/pathfind-showcase/actions/workflows/ci.yml/badge.svg)](https://github.com/Advaita-G/pathfind-showcase/actions/workflows/ci.yml)

**Developed by Advaita G with AI-assisted development.**

</div>

## What it does

- Browse and search curated opportunities by interest, location, and type.
- Build a personalized path from student goals and profile details.
- Save opportunities and explore college information and guides.
- Keep sourced opportunities distinct from AI-generated project ideas.

Opportunity details can change. Confirm eligibility, dates, costs, and application requirements with each program's official source.

## Architecture

- **React, TypeScript, Vite:** single-page application with route-aware prerendering for public pages.
- **Discovery domain:** curated opportunity and college data, search, filtering, matching, and deadline/status utilities in `src/data` and `src/lib`.
- **Student experience:** page and component layers in `src/pages` and `src/components`; auth and profile integrations in `src/context` and `src/lib`.
- **Services:** Supabase client integration uses build-time `VITE_` variables. Public assistant function source is included; private database configuration, project metadata, and migrations are excluded.
- **Quality:** Vitest unit tests, Playwright browser tests, and a pinned, credential-free GitHub Actions workflow.

```text
src/                 React app, pages, components, data, and domain logic
supabase/functions/  Public assistant function source (no project config or migrations)
public/              Public brand and static assets
scripts/             Public-page prerender/build helpers
e2e/                 Playwright browser tests
evals/assistant/     Assistant evaluation and offline self-check
.github/workflows/   Read-only CI
```

## Run locally

Requirements: Node.js 22+ and npm.

```bash
git clone https://github.com/Advaita-G/pathfind-showcase.git
cd pathfind-showcase
npm ci
cp .env.example .env
npm run dev
```

The app shell, curated discovery, unit tests, and build run without credentials. Sign-in, cloud-synced profile/bookmarks, and the hosted assistant need your own Supabase project and its Google OAuth/function setup. Put only that project's public URL and publishable/anon key in `.env`; never use a service-role key in a browser app. The optional live assistant evaluation also needs `GEMINI_API_KEY`; it is not used by CI.

## Checks

| Command | Purpose |
| --- | --- |
| `npm test` | Unit tests |
| `npm run eval:assistant:check` | Offline assistant evaluation self-check |
| `npm run build` | Type-check, production build, and prerender |

CI runs the first three commands on pull requests and pushes to `main`, with no repository credentials.
Playwright browser tests are included under `e2e/`; the current suite still has failing opportunity-detail assertions and is not part of CI yet.

## Attribution and scope

This is a clean public showcase assembled from Pathfind source code. AI tools assisted development; Advaita G is the project owner and maintainer. The original private repository, its Git history, internal notes, production Supabase configuration, and private data are not included. The showcase is not connected to production deployment.

See [contributing guidance](CONTRIBUTING.md) and [security reporting](SECURITY.md).
