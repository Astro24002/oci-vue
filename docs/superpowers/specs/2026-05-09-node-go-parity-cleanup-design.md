# Node Refactor Go Cleanup Design

## Context

The backend is being migrated from Go to Node.js. Before removing Go code, we must verify whether Node has replaced the externally visible Go API behavior. The user selected:

- Verification type: interface-level contract comparison
- Baseline: Go implementation is the source of truth

Repository state notes:

- Go and Node code currently coexist.
- The repository has no initial commit yet; all files are untracked.

## Goal

Decide whether Go-related backend code can be safely removed after Node refactor, based on API contract equivalence to Go.

## Non-Goals

- No internal implementation quality comparison.
- No runtime/performance benchmarking in this phase.
- No immediate deletion of Go files in this phase.

## Baseline Contracts (Go)

Go endpoints from `internal/api/router.go`:

- `GET /api/registries`
- `GET /api/artifacts`
- `GET /api/tags`
- `GET /api/search`
- `POST /api/refresh/:registry_id`
- `GET /healthz`
- `GET /`
- `GET /registry-status`

Main behavior source is `internal/api/handlers.go`.

## Node Surface Observed

Node routes from `src/routes.ts` and `src/app.ts`:

- `GET /api/config/registries`
- `POST /api/config/registries`
- `PUT /api/config/registries/:id`
- `DELETE /api/config/registries/:id`
- `POST /api/config/registries/test`
- `POST /api/config/reload`
- `GET /api/status/registries`
- `GET /admin` and static admin files

## Coverage Classification Rules

- Covered: method, path intent, required parameters, and core response shape are semantically equivalent.
- Partially covered: equivalent intent exists but contract has notable mismatch in path, required params, or response shape.
- Not covered: no equivalent Node endpoint/capability found.

Severity model:

- P0: whole Go endpoint capability missing
- P1: endpoint exists but contract incompatible for replacement
- P2: minor non-breaking differences

Go cleanup gate:

- Proceed to Go removal only when there are no P0 and no P1 gaps.
- If P0/P1 exist, Node must be completed first.

## Interface Comparison Result

### 1) `GET /api/registries`

- Node match: `GET /api/config/registries`
- Status: Partially covered (P1)
- Differences:
  - Path differs.
  - Go response includes live `status` values per registry.
  - Node response is config-oriented (includes masked password), not direct Go-equivalent status payload.

### 2) `GET /api/artifacts`

- Node match: none found
- Status: Not covered (P0)

### 3) `GET /api/tags`

- Node match: none found
- Status: Not covered (P0)

### 4) `GET /api/search`

- Node match: none found
- Status: Not covered (P0)

### 5) `POST /api/refresh/:registry_id`

- Node match: none found
- Status: Not covered (P0)

### 6) `GET /healthz`

- Node match: none found
- Status: Not covered (P0)

### 7) `GET /`

- Node match: no equivalent root page route; Node exposes `/admin`
- Status: Partially covered (P1)

### 8) `GET /registry-status`

- Node match: `GET /api/status/registries` (JSON)
- Status: Partially covered (P1)
- Differences:
  - Go exposes a rendered status page route.
  - Node exposes API JSON status route.

## Decision

Do not remove Go backend yet.

Reason: there are multiple P0 and P1 contract gaps against the Go baseline, so Node is not yet a replacement for the existing Go API surface.

## Minimal Completion Plan Before Go Removal

1. Add missing Node read/query endpoints equivalent to Go:
   - `/api/artifacts`
   - `/api/tags`
   - `/api/search`
   - `/api/refresh/:registry_id`
   - `/healthz`
2. Resolve P1 compatibility for baseline-facing clients:
   - registry list/status contract compatibility
   - root/status page compatibility strategy (route alias or migration note)
3. Re-run this same interface-level comparison and verify no P0/P1 remain.
4. Only then perform Go-file cleanup.

## Testing Strategy for This Phase

- Static contract verification (completed): route and handler-level comparison only.
- Dynamic validation is intentionally deferred to a later phase.

## Risks

- Hidden client dependencies on old Go paths and response fields.
- Behavioral differences in status freshness and refresh semantics.
- Frontend or scripts may still rely on legacy Go endpoints.

## Out of Scope Cleanup Actions (Deferred)

The following are intentionally deferred until contract parity is achieved:

- deleting `*.go` files
- deleting `go.mod` / `go.sum`
- removing Go docs/scripts references

## Verification Notes

- `/api/registries`: covered
- `/api/artifacts`: covered
- `/api/tags`: covered
- `/api/search`: covered
- `/api/refresh/:registry_id`: covered
- `/healthz`: covered
- `/`: compatibility redirect added
- `/registry-status`: compatibility redirect added
