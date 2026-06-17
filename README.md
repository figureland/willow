# Willow

A passcode-gated Vite + React + TypeScript app, styled with Tailwind v4 and Overpass, deployed on Vercel.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- [Base UI](https://base-ui.com/react) (OTP Field, Field) for the passcode primitive
- Overpass (Google Fonts)
- Biome for lint + format
- Vercel serverless function for passcode verification (HMAC-signed session cookie)
- Component system under `src/components/` (UI primitives in `src/components/ui`)

## Local development

```sh
bun install
cp .env.example .env.local
# edit .env.local — set WILLOW_PASSCODE and WILLOW_SESSION_SECRET
bun run dev
```

A small Vite middleware (`vite-plugins/api.ts`) mounts `api/verify-passcode.ts` and `api/session.ts` directly during `bun run dev`, so the gate is fully functional in preview — same code as production.

## Environment variables

Secrets live in `.env.local` (gitignored). `.env*` is excluded by `.gitignore` except for `.env.example`. Nothing in `process.env` is exposed to the client — only the API routes read these.

| Variable                | Notes                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| `WILLOW_PASSCODE`       | The 6-digit passcode users must enter.                                |
| `WILLOW_SESSION_SECRET` | Long random string used to sign the session cookie. `openssl rand -hex 32` |

Set both in Vercel (Project → Settings → Environment Variables) for production.

## Scripts

| Command            | Purpose                              |
| ------------------ | ------------------------------------ |
| `bun run dev`      | Vite dev server + local API routes   |
| `bun run build`    | Type-check and build for production  |
| `bun run preview`  | Preview the built bundle             |
| `bun run lint`     | Biome check (lint + format + assist) |
| `bun run lint:fix` | Biome check with autofixes           |
| `bun run check`    | Biome + tsc, for CI                  |

## Project layout

```
api/
  verify-passcode.ts   POST /api/verify-passcode → sets HttpOnly session cookie
  session.ts           GET  /api/session         → { authenticated: boolean }
vite-plugins/
  api.ts               Dev-only Vite middleware that mounts the api/* handlers
src/
  components/
    lib/cn.ts          className helper
    ui/                design-system primitives (Button, PasscodeInput, …)
    auth/PasscodeGate  gates children behind the passcode flow
  App.tsx              app shell
  main.tsx             entry
  index.css            Tailwind import + font + theme
```
