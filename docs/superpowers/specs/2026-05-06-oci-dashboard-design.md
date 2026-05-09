# OCI Dashboard Design

## Goal

Build a single-binary dashboard that aggregates artifact visibility across multiple OCI registries and provides fast, read-only discovery of repositories and tags.

## Scope

- Multi-registry support with flat configuration model
- Docker Registry v2-compatible APIs (including Harbor/GHCR endpoints)
- Basic Auth only for v1
- Read-only browsing and search
- Simple user actions: copy full image reference, local favorites

Out of scope for v1:

- Delete/tag mutation APIs
- Push/proxy behavior
- Persistent database storage
- RBAC and multi-tenant auth

## Architecture

- `config` loads server/fetch/registry settings from `config.yaml`.
- `registry client` wraps Registry v2 calls (`_catalog`, `tags/list`, optional `manifest`) with Basic Auth and timeout/retry policy.
- `scheduler` runs independent sync jobs per registry at configured intervals.
- `aggregator` normalizes API responses into UI-friendly models.
- `in-memory snapshot store` keeps per-registry artifact/tag/status snapshots and swaps snapshots atomically.
- `Gin HTTP API` serves registry/artifact/tag/search/refresh endpoints from cache.
- `server-rendered UI` (Gin templates + small JS) renders dashboard and interactions.

## Configuration Model

`config.yaml`:

- `server.listen`
- `server.read_timeout_sec`
- `server.write_timeout_sec`
- `fetch.default_interval_sec`
- `fetch.request_timeout_sec`
- `fetch.max_workers`
- `fetch.retry_count`
- `registries[]` entries:
  - `id`
  - `name`
  - `base_url`
  - `username`
  - `password`
  - `enabled`
  - `interval_sec`

Validation rules:

- `id`, `name`, and `base_url` are required.
- `base_url` must be valid HTTP(S).
- `interval_sec` falls back to `fetch.default_interval_sec` when missing.

## Data Model

- `RegistryView`: `id`, `name`, `base_url`, `enabled`
- `ArtifactView`: `registry_id`, `repository`, `tag_count`, `updated_at`, `last_digest`
- `TagView`: `registry_id`, `repository`, `tag`, `digest`, `created_at`, `size_bytes`, `image_ref`
- `SyncStatus`: `registry_id`, `last_sync_at`, `duration_ms`, `success`, `error_message`

`image_ref` format:

`<registry-host>/<repository>:<tag>`

## API Design

- `GET /api/registries`
  - Returns configured registries and latest sync status.
  - Never returns credentials.

- `GET /api/artifacts?registry_id=&q=&page=&page_size=`
  - Reads cached artifacts.
  - Filters by registry and repository keyword.
  - Sorts by `updated_at` descending.

- `GET /api/artifacts/:repository/tags?registry_id=`
  - Returns tags for one repository in one registry.

- `GET /api/search?q=&registry_id=`
  - Matches `repository` and `tag` substrings.

- `POST /api/refresh/:registry_id`
  - Triggers immediate sync for one registry.

- `GET /healthz`
  - Returns service health and scheduler heartbeat timestamp.

## UI Design

Main dashboard includes:

- Global search input
- Registry selector
- Manual refresh action
- Registry status cards (success/error, last sync, duration)
- Artifact table (`Repository`, `Tag Count`, `Updated`, `Digest`, `Actions`)

Repository details are shown in a panel/dialog with tag rows:

- `Tag`, `Digest`, `Created`, `Size`, `Copy`

Action behavior:

- Copy action copies only full image reference (`image_ref`).
- Favorite toggle stores references in browser `localStorage`.
- "Favorites only" filter narrows table to favorite refs.

## Sync and Error Handling

- Each registry sync job runs independently.
- One registry failure does not block others.
- Retry transient network errors up to configured retry count.
- On auth failures (`401/403`), keep last good snapshot and mark status failed.
- On missing repository/tag (`404`), exclude from next snapshot.
- Snapshot replacement is atomic per registry.

## Testing Strategy

- Unit tests:
  - Config validation
  - Registry client request/auth handling
  - Aggregation and snapshot swaps
  - Search/filter/pagination logic
- Integration tests:
  - API handlers with seeded in-memory store
  - Scheduler triggering sync updates
- UI sanity:
  - Template render tests for key pages

## Success Criteria

- Service starts from `config.yaml` and serves dashboard.
- At least two registries can be configured and synced concurrently.
- Artifact/tag browsing and search are responsive from cache.
- Copy action always returns correct full image reference.
- Registry-level sync failures are visible without global outage.
