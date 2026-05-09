# OCI Dashboard (Node)

Lightweight OCI registry dashboard backend using Node.js + TypeScript with dynamic runtime registry configuration.

## Features

- Runtime registry config management via API
- Hot reload of sync tasks without process restart
- Per-registry latest sync status
- Connectivity/auth test endpoint for registry config
- Local JSON config persistence with atomic write

## Requirements

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Configuration

Default runtime config path is `data/config.json`.

Create it from example:

```bash
cp data/config.example.json data/config.json
```

You can override config path with `CONFIG_PATH`.

Admin authentication is required at startup:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Example `data/config.example.json`:

```json
{
  "server": { "port": 8080 },
  "sync": {
    "defaultIntervalSec": 10,
    "requestTimeoutSec": 15,
    "retryCount": 1
  },
  "registries": [
    {
      "id": "reg1",
      "name": "docker-registry",
      "baseUrl": "https://registry.example.com",
      "username": "${REG1_USERNAME}",
      "password": "${REG1_PASSWORD}",
      "enabled": true,
      "intervalSec": 10
    }
  ]
}
```

## Run

Development:

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=secret CONFIG_PATH=data/config.json npm run dev
```

Build and start:

```bash
npm run build
ADMIN_USERNAME=admin ADMIN_PASSWORD=secret CONFIG_PATH=data/config.json npm start
```

Routes that require HTTP Basic Auth with admin credentials:

- `/admin`
- `/api/config/*`

## API

### Config management

- `GET /api/config/registries`
- `POST /api/config/registries`
- `PUT /api/config/registries/:id`
- `DELETE /api/config/registries/:id` (soft delete: set `enabled=false`)
- `POST /api/config/registries/test`
- `POST /api/config/reload`

### Status

- `GET /api/status/registries`

## Response format

Success:

```json
{ "ok": true, "data": {} }
```

Failure:

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

## Runtime behavior

- Config updates are transactional: validate -> save -> apply scheduler.
- If scheduler apply fails, runtime attempts rollback to last active config.
- Sync failures on one registry do not stop other registry workers.
