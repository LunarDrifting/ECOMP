# ECOMP Roadmap

## Milestone 1 — Tenant + RBAC Foundation

Goal:
Establish strict tenant isolation and role-based access control core models and basic API endpoints.

### Phase 1.1
- Add Role and UserRole models
- Create migration

### Phase 1.2
- Create basic API route to create tenant + user
- Enforce tenant scoping in Prisma usage
- Add verification commands

### Phase 1.3
- Introduce Task and Dependency domain models per Preliminary Design Spec
- Schema-only changes (no business logic)
- Tenant-scoped modeling and Prisma migration discipline

### Phase 1.4
- Introduce ECOPlan domain model to bind ECO to TemplateVersion
- Schema-only changes (no business logic)
- Tenant-scoped modeling and Prisma migration discipline

### Phase 1.5
- Introduce Approval domain model with immutable decision semantics
- Schema-only changes (no business logic)
- Tenant-scoped modeling and Prisma migration discipline

### Phase 1.6
- Introduce Gate domain model aligned to Design Spec
- Schema-only changes (no business logic)
- Tenant-scoped modeling and Prisma migration discipline
