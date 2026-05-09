# Admin UI with Basic Auth Design

## Goal

Add a minimal web admin page at `/admin` for runtime registry configuration management, protected by HTTP Basic Auth, while preserving existing dynamic config APIs and hot-reload behavior.

## Scope

- Add an admin page route and static assets for config management
- Protect `/admin` and `/api/config/*` endpoints with Basic Auth
- Keep `/api/status/registries` optionally public for observability
- Reuse existing config CRUD, test, and reload APIs

Out of scope for this phase:

- Session or token-based login
- Multi-user account system
- RBAC and audit trail UI
- Advanced frontend framework migration

## User Experience

- Route: `GET /admin`
- Browser prompts for username/password via Basic Auth challenge
- Single-page admin UI shows:
  - Registry list
  - Latest per-registry sync status
  - Add/edit form
  - Actions: Test, Save, Disable, Reload Config
- Errors are displayed in a top-level status area

## Security Design

Environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Auth middleware behavior:

- Parse `Authorization: Basic <base64>`
- Compare credentials using constant-time comparison
- On failure:
  - return `401`
  - set `WWW-Authenticate: Basic realm="OCI Dashboard Admin"`

Route protection policy:

- Protected:
  - `/admin`
  - `/api/config/registries`
  - `/api/config/registries/:id`
  - `/api/config/registries/test`
  - `/api/config/reload`
- Not protected by default:
  - `/api/status/registries`

Startup guard:

- If admin route protection is enabled but credentials are missing, fail fast on startup.

Logging:

- Log auth failures without leaking raw credentials.

## Frontend Structure

Suggested files:

- `web/admin/index.html`
- `web/admin/admin.js`
- `web/admin/admin.css`

Page load flow:

1. Browser authenticates via Basic Auth challenge.
2. Page fetches in parallel:
   - `GET /api/config/registries`
   - `GET /api/status/registries`
3. Frontend merges records by `registry.id`.

Primary actions:

- Add: `POST /api/config/registries`
- Edit: `PUT /api/config/registries/:id`
- Disable: `DELETE /api/config/registries/:id`
- Test: `POST /api/config/registries/test`
- Reload: `POST /api/config/reload`

Error handling:

- Show backend `error.message` for non-2xx responses
- Show clear 401 message for credential issues
- Show network-failure message when backend unreachable

## Backend Integration

- Add `requireBasicAuth` middleware in Node backend
- Mount middleware for `/admin` and `/api/config/*`
- Serve admin static page from dedicated route
- Reuse existing config service and scheduler logic
- Do not change config transaction semantics

## Testing Strategy

Unit tests:

- Basic Auth middleware
  - missing header -> 401
  - wrong credentials -> 401
  - valid credentials -> next()

Integration tests:

- Unauthorized access to `/admin` returns 401 + challenge header
- Unauthorized access to `/api/config/registries` returns 401
- Authorized access succeeds for `/admin` and `/api/config/registries`
- Existing config CRUD/reload tests still pass under protected routes

Smoke checks:

- Login prompt appears at `/admin`
- Registry list and status render after authentication
- Test/save/disable/reload actions execute successfully

## Success Criteria

- `/admin` exists and is usable for config management
- `/admin` and all `/api/config/*` endpoints require Basic Auth
- Unauthorized requests consistently receive 401 with challenge header
- Existing dynamic config behavior remains intact
- `npm test` and `npm run build` pass

## Future Evolution

- Upgrade auth to session-based login when UX requirements increase
- Add user management and RBAC when multi-operator access is needed
- Add audit table and UI when governance requirements appear
