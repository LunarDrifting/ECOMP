# Phase UI-3.1: Approval Semantics Tightening (No Schema Changes) - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning
**Source:** User-provided phase goal and constraints

<domain>
## Phase Boundary

Tighten approval semantics and UX clarity across service + UI layers while preserving deterministic behavior, append-only audit logging, and current schema.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- No schema changes.
- Preserve append-only audit logging behavior.
- Keep backend deterministic.
- Keep routes thin and Prisma-free.
- Integration tests must cover behavior changes.

### Backend Rules: Duplicate Approval Guard
- In approval creation service, reject duplicate actor submission for same task and tenant.
- Duplicate check key: `(tenantId, taskId, actorId)`.
- On duplicate, return deterministic 409 error:
  - `"Approval already submitted for task"`
- No approval row write on duplicate rejection.
- Keep audit attempt and rejected event behavior.

### Backend Rules: Policy Evaluator Tightening
- `NONE`: unchanged.
- `SINGLE`: require >=1 `APPROVED`; ignore `REJECTED`.
- `PARALLEL` (minimal mode): require >=1 `APPROVED` by actor whose roleId == task.ownerRoleId; ignore `REJECTED`.
- `QUORUM`: require >=2 distinct actorIds with `APPROVED`; ignore `REJECTED`.
- `SEQUENTIAL`: unchanged from current rule:
  - reject if any `REJECTED` exists
  - else require >=1 `APPROVED`.

### UI Rules
- Task drawer approval section must show approved vs rejected counts separately.
- Optional recent decision list is allowed but may stay minimal.
- For duplicate 409 on approval submit, show deterministic user message.
- Refetch behavior may remain as-is (refetch or skip; either acceptable).

### Test Rules
- Add integration test: same actor submits APPROVED twice -> second returns 409.
- Add integration test: `REJECTED`-only approvals do not satisfy SINGLE/PARALLEL/QUORUM; completion still rejects with canonical 409 policy failure.
- Ensure existing tests continue passing.

### Claude's Discretion
- Exact helper method boundaries for duplicate lookup in db/service layers.
- UI presentation style for separate approval counts.

</decisions>

<specifics>
## Specific Ideas

- Centralize approved/rejected filtering once in policy evaluator block to avoid semantic drift.
- Reuse existing canonical policy failure message:
  - `"Approval policy requirements not satisfied"`
- Keep route error mapping deterministic and explicit for duplicate submission 409.

</specifics>

<deferred>
## Deferred Ideas

- Replacing append-only approvals with mutable latest-decision model.
- Role-sequenced approval chains beyond minimal semantics.
- Per-policy UI explanation traces.

</deferred>

---
*Phase: UI-3.1-approval-semantics-tightening*
*Context gathered: 2026-03-01 from user constraints*
