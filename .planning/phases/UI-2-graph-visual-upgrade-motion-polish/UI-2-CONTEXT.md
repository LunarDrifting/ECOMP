# Phase UI-2: Graph Visual Upgrade + Motion Polish (No Backend Changes) - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning
**Source:** User-provided phase goal and constraints

<domain>
## Phase Boundary

Upgrade graph-mode visual quality and interaction polish in the workflow command center while preserving projection-driven behavior and existing backend semantics.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- No backend changes.
- No schema changes.
- No production business-logic changes.
- Graph UI remains projection-driven; client must not recompute completion eligibility semantics.
- Deterministic layout is required: same projection input produces identical node positions.
- Animations must be deterministic and triggered only from projection diff and interaction state.
- List view behavior from UI-0/UI-1 must remain unaffected.
- Build must pass.
- Execution remains sequential.

### Edge Rendering Upgrade
- Keep SVG edge rendering in graph mode.
- Use cubic bezier curved paths between nodes.
- Add arrowheads to indicate direction.
- Edge visual states:
  - default (light gray)
  - hover-highlighted path (accent)
  - cascade-wave animated edges (dash/glow for ~1.5s)

### Cascade Wave Rules
- Trigger after completion action refetch only.
- Use existing diff sets (`completedTaskIds`, `newlyReadyTaskIds`) as canonical inputs.
- Derive animated edge set deterministically from those sets:
  - direct completed -> newlyReady edges, or
  - deterministic upstream-path mapping if direct edge absent.
- No randomness or wall-clock driven branch logic.

### Node Card Upgrade
- Improve typography and spacing.
- Preserve semantic badges and state pill.
- Deterministic visual states:
  - DONE: subtle green treatment
  - READY (`NOT_STARTED && isReady`): blue-accent treatment
  - BLOCKED: muted gray/red treatment
- `canComplete === true` receives soft actionable glow; false/null appears muted.

### Interaction Rules
- Hovering a node highlights upstream and downstream path edges.
- Unrelated nodes should be dimmed while hover state is active.
- Clicking a node keeps existing drawer behavior.
- Add deterministic tooltip content per node:
  - upstream/downstream counts
  - blocker count
  - requiresApproval / requiresPrecondition
  - canComplete status

### Zoom/Pan (Optional, Recommended)
- Implement client-side zoom/pan controls only.
- Deterministic interaction behavior:
  - wheel zoom
  - pointer drag pan
  - reset control
- No backend persistence.

### Verification Expectations
- Manual deterministic verification steps are acceptable for this visual phase.
- No integration test expansion required in this phase unless low-cost.

### Claude's Discretion
- Whether motion is CSS-only or framer-motion-backed (if available in environment).
- Fine-grained style values and component decomposition (`node-card`, `edge-layer`, `graph-controls`).

</decisions>

<specifics>
## Specific Ideas

- Keep graph rendering split into `graph-view`, `edge-layer`, and `node-card` for maintainability.
- Keep command-center orchestration responsible for projection diff sets and feed them into graph animation props.
- Use stable sorting and memoized adjacency structures for highlight and cascade-wave edge derivation.

</specifics>

<deferred>
## Deferred Ideas

- Physics layout or force simulation.
- Persisted camera state across sessions.
- Multi-select node operations.
- Background animation orchestration outside direct interaction/refetch events.

</deferred>

---
*Phase: UI-2-graph-visual-upgrade-motion-polish*
*Context gathered: 2026-03-01 from user constraints*
