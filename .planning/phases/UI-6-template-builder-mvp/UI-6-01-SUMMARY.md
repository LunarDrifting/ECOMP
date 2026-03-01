---
phase: UI-6-template-builder-mvp
plan: "01"
subsystem: template-builder
tags: [templates, versions, validate-publish, ui]
requires: [UI-5-hide-ids-debug-toggle-friendly-labels]
provides:
  - tenant-scoped template builder endpoints
  - draft validation and publish flow
  - template task/dependency editor UI
  - launch from template shortcut
  - integration coverage for validate/publish scoping
affects: [backend, frontend, tests]
tech-stack:
  added: []
  patterns: [service-layer orchestration, thin routes, deterministic validation]
key-files:
  created:
    - src/services/template-builder.service.ts
    - src/app/api/templates/route.ts
    - src/app/api/templates/[id]/versions/route.ts
    - src/app/api/template-versions/[id]/validate/route.ts
    - src/app/api/template-versions/[id]/publish/route.ts
    - src/app/api/template-versions/[id]/tasks/route.ts
    - src/app/api/template-versions/[id]/dependencies/route.ts
    - src/app/api/template-tasks/[id]/route.ts
    - src/app/api/template-dependencies/[id]/route.ts
    - src/app/api/roles/route.ts
    - src/components/templates/templates-page-client.tsx
    - src/components/templates/template-versions-page-client.tsx
    - src/components/templates/template-version-editor-client.tsx
    - src/app/templates/page.tsx
    - src/app/templates/[templateId]/page.tsx
    - src/app/templates/[templateId]/versions/[templateVersionId]/page.tsx
  modified:
    - src/lib/db.ts
    - src/lib/api-client.ts
    - tests/integration/workflow-engine.integration.test.ts
requirements-completed:
  - UI6-NO-SCHEMA-CHANGES
  - UI6-THIN-PRISMA-FREE-ROUTES
  - UI6-TENANT-SCOPED-ENDPOINTS
  - UI6-DRAFT-VALIDATE-PUBLISH-FLOW
  - UI6-TEMPLATE-TASK-EDITOR
  - UI6-TEMPLATE-DEPENDENCY-EDITOR
  - UI6-SERVER-SIDE-GRAPH-VALIDATION
  - UI6-PUBLISH-IDEMPOTENT
  - UI6-LAUNCH-FROM-TEMPLATE
  - UI6-MINIMAL-INTEGRATION-TESTS
completed: 2026-03-01
---

# Phase UI-6 Plan 01 Summary

Implemented Template Builder MVP with service-layer orchestration and thin tenant-scoped APIs, plus new UI pages for template list, versions, and blueprint editing.

## What Was Delivered

- Added `template-builder.service.ts` covering:
  - template list/create
  - version list/create draft
  - task definition CRUD
  - dependency definition create/delete
  - blueprint validation (`SELF_EDGE`, `MISSING_ENDPOINT`, `CYCLE`)
  - publish with validation gate and idempotent noop behavior
- Extended `tenantDb` wrappers for template-builder operations while preserving tenant scoping.
- Added new API routes for templates, versions, validate/publish, tasks, dependencies, and roles.
- Added UI routes/components:
  - `/templates`
  - `/templates/[templateId]`
  - `/templates/[templateId]/versions/[templateVersionId]`
- Implemented Launch shortcut in editor:
  - create ECO
  - instantiate selected template version
  - redirect to `/workflow`
- Extended integration suite with UI-6 coverage:
  - validate rejects cycle
  - publish blocked when validation fails
  - publish succeeds and is idempotent
  - task/dependency list endpoints are tenant-scoped

## Verification

- `npx eslint ...` passed for all changed UI-6 files.
- `npx tsc --noEmit` passed.
- `npm run test` failed in this environment because Postgres test DB is not reachable at `localhost:5432`.
- `npm run build` remains blocked in this sandbox due Turbopack process restrictions (`Operation not permitted` binding/child-process path).

## Scope Guardrails Preserved

- No schema changes.
- Routes remain Prisma-free and thin.
- Service layer + tenantDb wrapper enforced.
- Deterministic validation and publish behavior.

---
*Phase: UI-6-template-builder-mvp*
*Completed: 2026-03-01*
