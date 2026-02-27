# Codebase Stack Map

## Scope
- Project root: `ECOMP`
- Map date: 2026-02-27
- Focus guidance applied: Next.js App Router + Prisma v6 + PostgreSQL + multi-tenant + RBAC + service-layer architecture constraints.

## Runtime and Language
- Language: TypeScript (`tsconfig.json`)
- Runtime: Node.js (Next.js server/runtime expectations)
- Module system: ES modules for app code/config (`next.config.ts`, `eslint.config.mjs`)

## Application Framework
- Web framework: Next.js `16.1.6` with App Router (`src/app/*`, `src/app/api/*`)
- UI runtime: React `19.2.3`, React DOM `19.2.3`
- Entry layout: `src/app/layout.tsx`
- Home page: `src/app/page.tsx`

## Data Layer
- ORM: Prisma `6.19.2` (`@prisma/client` + `prisma`)
- Prisma schema: `prisma/schema.prisma`
- Prisma client singleton: `src/lib/prisma.ts`
- Database: PostgreSQL 16 (Docker) via `docker-compose.yml`

## Styling and Tooling
- CSS pipeline: Tailwind CSS v4 + PostCSS (`postcss.config.mjs`, `src/app/globals.css`)
- Linting: ESLint v9 + Next config (`eslint.config.mjs`)
- Type checking: TypeScript strict mode enabled (`tsconfig.json`)

## Package Scripts
- `npm run dev` -> `next dev`
- `npm run build` -> `next build`
- `npm run start` -> `next start`
- `npm run lint` -> `eslint`

## Environment and Config
- Database connection: `DATABASE_URL` in `.env`
- Next config file present with default structure: `next.config.ts`
- Path alias: `@/*` -> `src/*` in `tsconfig.json`

## Current Stack Notes
- Stack lock in `docs/ARCHITECTURE_CONTRACT.md` matches installed stack.
- Repository is currently monolithic and small, aligned with contract.
