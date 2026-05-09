# Node Dynamic Registry Config Design

## Goal

Deliver a fast-to-ship Node-based OCI dashboard iteration that supports runtime registry configuration management from API/UI, with hot reload and safe rollback semantics.

## Product Positioning

- Team-internal tool
- Fast MVP delivery over enterprise completeness
- Single-instance deployment in intranet environments

## Scope

- Migrate backend direction to Node.js + TypeScript
- Add runtime CRUD management for registry configuration entries
- Persist config to local file storage (`data/config.json`)
- Apply configuration changes without process restart
- Expose per-registry sync status for operational visibility

Out of scope for this phase:

- RBAC or multi-tenant authorization
- Distributed multi-instance config consistency
- Full audit trail and versioned config rollback UI
- External secret manager integration

## Architecture Overview

System is composed of three main boundaries:

- `ConfigStore`: handles durable config file read/write and atomic replacement
- `RegistryService`: validates inputs, applies business rules, masks secrets
- `Scheduler`: owns sync task lifecycle and hot-swaps task set by config diffs

Flow:

1. API request reaches config controller.
2. Request is validated against config schema.
3. Service builds `nextConfig` from `activeConfig`.
4. Store atomically persists to `config.json`.
5. Scheduler applies task diff from old to new config.
6. On success, `activeConfig` is replaced.
7. On failure, scheduler attempts rollback to prior `activeConfig`.

## Technology Choices

- Backend: Node.js + TypeScript
- HTTP framework: Express
- Validation: Zod (or equivalent runtime schema validation)
- Persistence (MVP): local JSON file
- Frontend: lightweight admin page (React or server-rendered template)

Rationale:

- Express gives fastest implementation speed and broad ecosystem support.
- TypeScript keeps API and config contracts explicit.
- File persistence minimizes ops and setup friction for first release.

## Module and Directory Design

- `src/app.ts`: Express composition and middleware wiring
- `src/server.ts`: process entrypoint and graceful shutdown
- `src/modules/config/`
  - `config.types.ts`
  - `config.schema.ts`
  - `config.store.ts`
  - `config.service.ts`
  - `config.controller.ts`
- `src/modules/registry/`
  - `registry.client.ts`
  - `registry.health.ts`
- `src/modules/sync/`
  - `sync.scheduler.ts`
  - `sync.worker.ts`
  - `sync.state.ts`
- `src/modules/dashboard/`
  - `dashboard.controller.ts`
  - `dashboard.view.ts`
- `src/shared/`
  - `logger.ts`
  - `errors.ts`
  - `http.ts`
  - `mask.ts`
- `data/config.json`: runtime configuration (gitignored)
- `data/config.example.json`: sample template (committed)

## Configuration Model

```json
{
  "server": { "port": 8080 },
  "sync": {
    "defaultIntervalSec": 30,
    "requestTimeoutSec": 15,
    "retryCount": 1
  },
  "registries": [
    {
      "id": "reg1",
      "name": "docker-registry",
      "baseUrl": "https://docker-registry.lab.zverse.space:32443",
      "username": "${REG1_USERNAME}",
      "password": "${REG1_PASSWORD}",
      "enabled": true,
      "intervalSec": 10
    }
  ]
}
```

Validation rules:

- `id` is globally unique and matches `[a-zA-Z0-9_-]+`
- `baseUrl` must be valid HTTP/HTTPS URL
- `intervalSec` defaults to `sync.defaultIntervalSec` when omitted
- Password field may contain literal values or `${ENV_VAR}` placeholders

## API Design (MVP)

- `GET /api/config/registries`
  - Returns registry config list with masked password

- `POST /api/config/registries`
  - Creates a registry config entry

- `PUT /api/config/registries/:id`
  - Updates mutable fields for existing registry
  - `id` is immutable

- `DELETE /api/config/registries/:id`
  - MVP behavior maps to soft delete (`enabled=false`)

- `POST /api/config/registries/:id/test`
  - Tests connectivity/auth without persistence
  - Returns `ok`, latency, and diagnostic message

- `POST /api/config/reload`
  - Forces reload from file and reapplies scheduler tasks

- `GET /api/status/registries`
  - Returns latest sync status per registry

Response envelope:

- Success: `{ "ok": true, "data": ... }`
- Error: `{ "ok": false, "error": { "code": "...", "message": "..." } }`

Suggested error codes:

- `VALIDATION_ERROR`
- `DUPLICATE_ID`
- `CONNECTIVITY_FAILED`
- `RELOAD_FAILED`

## Hot Reload and Rollback Semantics

Update transaction for config mutations:

1. Validate request payload.
2. Build candidate `nextConfig` in memory.
3. Persist via atomic write (`config.json.tmp` then rename).
4. Execute `scheduler.apply(nextConfig)`.
5. If apply succeeds, replace `activeConfig`.
6. If apply fails, attempt `scheduler.apply(activeConfig)` rollback and return error.

Failure behavior:

- File write failure: no runtime change.
- Scheduler apply failure: best-effort rollback to previous active tasks.
- Registry sync runtime failures: isolated to affected registry status only.

## Scheduler Diff Strategy

- New enabled registry: create task and trigger immediate first sync.
- Existing registry interval changed: recreate timer for that registry.
- Enabled to disabled: stop and remove task.
- Credential or base URL changes: swap worker context for subsequent runs.

## Security Baseline (MVP)

- Intranet-first deployment assumptions
- Password values masked in read APIs
- Optional basic auth gate for config endpoints
- No plaintext secrets in logs

## Testing Strategy

- Unit tests
  - Config schema validation
  - Atomic file write and readback
  - Secret masking behavior
  - Scheduler diff and task transition logic

- Integration tests
  - Config CRUD endpoint success/failure paths
  - Hot reload success and rollback path
  - Test endpoint does not persist config

- Smoke checks
  - Service boot with sample config
  - Add/edit registry then verify status updates over sync cycle

## Success Criteria

- Operator can add/edit/enable/disable registries from API/UI.
- Config changes apply without process restart.
- Invalid config updates do not corrupt active runtime behavior.
- Per-registry health and latest sync status are visible.
- MVP can be deployed as a single Node service in intranet environment.

## Evolution Path

- Swap `ConfigStore` from file to SQLite without API breakage
- Add config change audit table once persistence layer upgrades
- Add stronger auth (session or SSO) when moving beyond trusted intranet
