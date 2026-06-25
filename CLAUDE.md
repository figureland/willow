# Willow — Project Context for LLMs

Willow is a Vite + React + TypeScript prototype for the Sandy / Willow design system. Passcode-protected, deployed on Vercel, styled with Tailwind v4 + Base UI primitives. The most relevant context for an LLM landing in this repo is below.

## Repo layout

```
src/
  components/
    auth/        ← PasscodeGate
    shell/       ← AppWrapper (global), AppShell (per-page), SidebarNav, AppHeader
    ui/          ← Design-system primitives (Button, Checkbox, Radio, Select, TextInput,
                   DatePicker, DataTable, Tabs, PasscodeInput, BrandLogo, icons, …)
  data/          ← Example database (see "Domain model" below). Swappable.
  lib/           ← Small utilities (useLocalStorageState, …)
  pages/         ← Top-level routed pages. Sub-folders contain page trees.
  types/         ← zod schemas + inferred TS types. ONE TYPE PER FILE.
```

Routing is React Router v7. `AppWrapper` is mounted once at the router level and owns the sidebar + background; pages render inside it via `<Outlet />` and use `<AppShell>` for their per-page chrome.

## Domain hierarchy (canonical)

The conceptual data hierarchy for the Sandy / Willow product — Organisation → Farm → Enterprise → Field → Season → Land use → Operations — is defined in [`data-hierarchy.md`](./data-hierarchy.md) at the repo root. Treat that file as the source of truth for what each level represents, the examples, and why it matters. When a request talks about "fields", "enterprises", "operations" etc., reconcile the terminology against that table before modelling or naming new code.

Not every level is materialised in code today (`Enterprise`, `Season`, `Operations` are not yet zod-typed); the levels that are live in `src/types/` as described below. When asked to add a new level or attribute, check `data-hierarchy.md` first to match its language.

## Domain model

All core types live in `src/types/`. Each type is in its own file and exports BOTH the zod schema and the inferred TS type. Import from `'@/types'` (or `'../types'` relative).

```
src/types/
  geo.ts            ← PositionSchema (Position = [lng, lat]) + PolygonRingSchema
  user.ts           ← UserSchema, User, isCentralAccount(user)
  organisation.ts   ← OrganisationSchema, Organisation
  farm.ts           ← FarmSchema, Farm
  field.ts          ← FieldSchema, Field
  index.ts          ← barrel
```

Relationships:

```
User ──┐                    User has one of:
       ├─→ Organisation[]   (central account — organisationIds populated)
       └─→ Farm[]           (single account  — farmIds populated)
Organisation → Farm[]       (organisation owns farms by id, farmIds)
Farm                        (no fieldIds — derive via getFieldsForFarm)
Field has: id, name, farmId, area, crop, boundary (PolygonRing[])
```

Field membership is one-way: each `Field` carries `farmId`, and `Farm` does not duplicate the list. Use `getFieldsForFarm(farmId)` from `'@/data'`.

Geo primitives are GeoJSON-shaped: `Position = [longitude, latitude]`; `PolygonRing` is a closed ring of Positions (first === last). `Field.boundary` is an array of independent rings (disjoint parcels / fenced-off features), not a single ring — pass a one-element array for a contiguous shape.

When adding a new core type:

1. Create `src/types/<typename>.ts` with `<Type>Schema` (zod) and `export type <Type> = z.infer<typeof <Type>Schema>`.
2. Add a fixture file at `src/data/<typename>s.ts` validated by the schema at module load (use `<Schema>.parse(...)` on every record).
3. Re-export from `src/types/index.ts` and `src/data/index.ts`.

## Example database (`src/data/`)

The data folder is a swappable example database — treat it like a tiny in-memory backend. The rest of the app should import only from `'@/data'`, never from individual fixture files, so it can be replaced with a real API client without touching consumers.

```
src/data/
  users.ts          ← USERS, CENTRAL_USER, SINGLE_USER, getFarmsForUser(user)
  organisations.ts  ← ORGANISATIONS, getOrganisation(id)
  farms.ts          ← FARMS, getFarm(id), getFarmsForOrganisation(orgId)
  fields.ts         ← FIELDS, getField(id), getFieldsForFarm(farmId)
  geo-helpers.ts    ← ringAroundPoint(lng, lat, delta)  (fixture helper)
  index.ts          ← barrel
```

Every record is `<Schema>.parse(...)`-validated at module load so a malformed edit throws before the UI boots.

## Design system rules

- Use only the type tokens defined in `src/index.css`: `text-xs | text-sm | text-md | text-lg | text-xl | text-2xl | text-3xl`. Never raw px or Tailwind defaults (`text-base`, `text-neutral-*`, etc.).
- Use semantic colour tokens (`text-text-primary`, `bg-bg-primary`, `border-border-secondary`, `bg-button-primary`, `bg-support-*`, etc.). Raw ramps like `bg-sandy-100` are reserved for the active-nav highlight + brand swatches.
- Body default is `text-md text-text-primary` — don't re-state it on `<p>` / `<div>`.
- Components are arrow-function expressions: `export const Foo = () => …`. Never `function Foo()`.

## Scripts

- `bun run dev`            — Vite dev server, with the `vite-plugins/api.ts` middleware mounting the `api/*.ts` Vercel functions locally.
- `bun run dev:agentation` — Agentation MCP HTTP server on :4747 (writes to `~/.agentation/store.db`). Run in its own terminal alongside `dev` when you want the in-app annotation widget connected. The process lingers after Ctrl-C — kill any stragglers with `lsof -ti :4747 | xargs kill` if a fresh start fails to bind.
- `bun run build`          — typecheck + bundle.
- `bun run lint`           — Biome check.
- `bun run lint:fix`       — Biome check + autofix.
- `bun run check`          — Biome + tsc, for CI.

## Routes

| Path                                                | Page                          |
| --------------------------------------------------- | ----------------------------- |
| `/`                                                 | DataCheckPage                 |
| `/sustainability`                                   | PlaceholderPage               |
| `/opportunities`                                    | PlaceholderPage               |
| `/ncvm`                                             | PlaceholderPage               |
| `/sandy-setup`                                      | PlaceholderPage               |
| `/sandy-ai`                                         | PlaceholderPage               |
| `/my-farms`                                         | MyFarmsLayout → MyFarmsIndex  |
| `/my-farms/:orgId`                                  | OrganisationOverview          |
| `/my-farms/:orgId/:farmId`                          | FarmLayout → FarmOverview     |
| `/my-farms/:orgId/:farmId/fields-and-crops`         | FarmFieldsAndCrops            |
| `/my-farms/:orgId/:farmId/fields-and-crops/:fieldId`| FarmFieldsAndCrops + SideSheet|
| `/my-farms/:orgId/:farmId/operations`               | FarmOperations                |
| `/my-farms/:orgId/:farmId/uploads`                  | FarmUploads                   |
| `/data-table`                                       | DataTablePage                 |
| `/data-upload`                                      | DataUploadWizard              |
| `/design-system`                                    | DesignSystemPage              |

Sidebar entries live in `src/components/shell/SidebarNav.tsx → DEFAULT_SIDEBAR_ITEMS`. The active item is inferred from the URL (exact match preferred, prefix match as fallback so sub-routes light up the parent).
