# OCI Dashboard

Read-only cached OCI artifact dashboard for docker-registry, Harbor, and Azure Container Registry.

## Features

- Root `config.json` runtime configuration
- docker-registry, Harbor, and ACR adapters
- In-memory repository and tag cache
- Independent per-registry refresh workers
- Repository search and filtering
- Terminal-style dashboard with registry, namespace, and status filters
- Tag table with copyable image references
- Manifest layer details with build command history when available
- Partial failure display for unhealthy registries

## Install

```bash
npm install
```

## Configure

The service reads `config.json` by default:

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
      "type": "docker-registry",
      "baseUrl": "https://docker-registry.lab.zverse.space:32443",
      "username": "optional-user",
      "password": "optional-password",
      "enabled": true,
      "intervalSec": 10
    }
  ]
}
```

Use `CONFIG_PATH=/path/to/config.json` to run with another config file.

## Run

```bash
npm run dev
```

The dashboard is available at `http://localhost:8080`.

## Build

```bash
npm run build
npm start
```

## APIs

- `GET /api/dashboard`
- `GET /api/status/registries`
- `GET /api/repositories/:registryId/:repository/tags`

The service is read-only and does not implement built-in authentication. Put it behind internal network controls, a gateway, Ingress, or reverse proxy when needed.
