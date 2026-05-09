# OCI Dashboard V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-binary Go + Gin dashboard that aggregates multiple OCI registries with Basic Auth and provides read-only artifact/tag discovery with search and copy-image-ref action.

**Architecture:** The service loads `config.yaml`, runs per-registry sync jobs, and stores normalized snapshots in memory. API handlers query cached snapshots, while server-rendered templates provide a lightweight dashboard UI with small client-side interactions.

**Tech Stack:** Go 1.22+, Gin, standard library HTTP client, HTML templates, vanilla JavaScript, Go testing package.

---

### Task 1: Bootstrap project and configuration loading

**Files:**
- Create: `go.mod`
- Create: `main.go`
- Create: `internal/config/config.go`
- Create: `internal/config/config_test.go`
- Create: `config.example.yaml`

- [ ] **Step 1: Write the failing config validation tests**

```go
package config

import "testing"

func TestLoadConfig_Valid(t *testing.T) {
    _, err := Load("../../config.example.yaml")
    if err != nil {
        t.Fatalf("expected valid config, got error: %v", err)
    }
}

func TestValidate_MissingRegistryID(t *testing.T) {
    c := Config{
        Server: Server{Listen: ":8080"},
        Fetch:  Fetch{DefaultIntervalSec: 60, RequestTimeoutSec: 10, MaxWorkers: 5, RetryCount: 1},
        Registries: []Registry{{Name: "x", BaseURL: "https://example.com", Enabled: true}},
    }
    if err := c.Validate(); err == nil {
        t.Fatal("expected validation error")
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/config -v`
Expected: FAIL with `undefined: Load` and `undefined: Config`.

- [ ] **Step 3: Write minimal config implementation**

```go
package config

import (
    "errors"
    "net/url"
    "os"

    "gopkg.in/yaml.v3"
)

type Config struct {
    Server     Server     `yaml:"server"`
    Fetch      Fetch      `yaml:"fetch"`
    Registries []Registry `yaml:"registries"`
}

type Server struct {
    Listen          string `yaml:"listen"`
    ReadTimeoutSec  int    `yaml:"read_timeout_sec"`
    WriteTimeoutSec int    `yaml:"write_timeout_sec"`
}

type Fetch struct {
    DefaultIntervalSec int `yaml:"default_interval_sec"`
    RequestTimeoutSec  int `yaml:"request_timeout_sec"`
    MaxWorkers         int `yaml:"max_workers"`
    RetryCount         int `yaml:"retry_count"`
}

type Registry struct {
    ID          string `yaml:"id"`
    Name        string `yaml:"name"`
    BaseURL     string `yaml:"base_url"`
    Username    string `yaml:"username"`
    Password    string `yaml:"password"`
    Enabled     bool   `yaml:"enabled"`
    IntervalSec int    `yaml:"interval_sec"`
}

func Load(path string) (Config, error) {
    b, err := os.ReadFile(path)
    if err != nil {
        return Config{}, err
    }
    var c Config
    if err := yaml.Unmarshal(b, &c); err != nil {
        return Config{}, err
    }
    return c, c.Validate()
}

func (c *Config) Validate() error {
    if c.Server.Listen == "" {
        return errors.New("server.listen is required")
    }
    for i := range c.Registries {
        r := c.Registries[i]
        if r.ID == "" || r.Name == "" || r.BaseURL == "" {
            return errors.New("registry id/name/base_url are required")
        }
        u, err := url.Parse(r.BaseURL)
        if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
            return errors.New("registry base_url must be valid http/https")
        }
        if r.IntervalSec <= 0 {
            c.Registries[i].IntervalSec = c.Fetch.DefaultIntervalSec
        }
    }
    return nil
}
```

- [ ] **Step 4: Add runnable entrypoint and example config**

```go
package main

import "log"

func main() {
    log.Println("oci-dashboard bootstrap")
}
```

```yaml
server:
  listen: ":8080"
  read_timeout_sec: 10
  write_timeout_sec: 10

fetch:
  default_interval_sec: 60
  request_timeout_sec: 15
  max_workers: 5
  retry_count: 1

registries:
  - id: demo
    name: Demo Registry
    base_url: https://registry.example.com
    username: demo
    password: demo
    enabled: true
    interval_sec: 60
```

- [ ] **Step 5: Run tests and commit**

Run: `go test ./internal/config -v`
Expected: PASS.

```bash
git add go.mod main.go internal/config/config.go internal/config/config_test.go config.example.yaml
git commit -m "feat: add config loader and validation"
```

### Task 2: Implement OCI registry client with Basic Auth

**Files:**
- Create: `internal/registry/client.go`
- Create: `internal/registry/client_test.go`

- [ ] **Step 1: Write failing client tests with httptest server**

```go
func TestClient_ListCatalogAndTags(t *testing.T) {
    // setup httptest registry endpoints for /v2/_catalog and /v2/repo/tags/list
    // assert Basic Auth headers are sent and parsed responses are returned
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/registry -v`
Expected: FAIL with undefined client symbols.

- [ ] **Step 3: Implement client methods**

```go
type Client interface {
    ListRepositories(ctx context.Context) ([]string, error)
    ListTags(ctx context.Context, repository string) ([]string, error)
    GetManifestMeta(ctx context.Context, repository, tag string) (digest string, createdAt time.Time, sizeBytes int64, err error)
}
```

- [ ] **Step 4: Run tests and commit**

Run: `go test ./internal/registry -v`
Expected: PASS.

```bash
git add internal/registry/client.go internal/registry/client_test.go
git commit -m "feat: add registry v2 client with basic auth"
```

### Task 3: Add in-memory snapshot store and aggregation models

**Files:**
- Create: `internal/model/model.go`
- Create: `internal/store/snapshot_store.go`
- Create: `internal/store/snapshot_store_test.go`

- [ ] **Step 1: Write failing store atomic swap tests**

```go
func TestStore_ReplaceRegistrySnapshotAtomically(t *testing.T) {
    // write first snapshot, replace with second, assert no partial state
}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `go test ./internal/store -v`
Expected: FAIL with undefined types.

- [ ] **Step 3: Implement model and store**

```go
type Snapshot struct {
    Artifacts  []model.ArtifactView
    TagsByRepo map[string][]model.TagView
    Status     model.SyncStatus
}
```

Store API:

```go
Replace(registryID string, s Snapshot)
GetArtifacts(registryID string) []model.ArtifactView
GetTags(registryID, repo string) []model.TagView
GetStatuses() map[string]model.SyncStatus
```

- [ ] **Step 4: Run tests and commit**

Run: `go test ./internal/store -v`
Expected: PASS.

```bash
git add internal/model/model.go internal/store/snapshot_store.go internal/store/snapshot_store_test.go
git commit -m "feat: add in-memory snapshot store"
```

### Task 4: Build sync scheduler and per-registry workers

**Files:**
- Create: `internal/syncer/syncer.go`
- Create: `internal/syncer/scheduler.go`
- Create: `internal/syncer/scheduler_test.go`

- [ ] **Step 1: Write failing scheduler tests**

```go
func TestScheduler_IndependentRegistryJobs(t *testing.T) {
    // fake client: one registry fails, another succeeds
    // assert successful registry still updates store
}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `go test ./internal/syncer -v`
Expected: FAIL with undefined scheduler.

- [ ] **Step 3: Implement sync pipeline**

Key logic:

- list repos
- worker pool over repos to fetch tags
- build artifact/tag views and sync status
- atomic store replace
- retry transient errors

- [ ] **Step 4: Run tests and commit**

Run: `go test ./internal/syncer -v`
Expected: PASS.

```bash
git add internal/syncer/syncer.go internal/syncer/scheduler.go internal/syncer/scheduler_test.go
git commit -m "feat: add per-registry sync scheduler"
```

### Task 5: Implement API handlers and search/filter/pagination

**Files:**
- Create: `internal/api/handlers.go`
- Create: `internal/api/router.go`
- Create: `internal/api/handlers_test.go`

- [ ] **Step 1: Write failing handler tests**

```go
func TestGetArtifacts_FilterAndPagination(t *testing.T) {
    // seed store, call /api/artifacts, assert filtering and page bounds
}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `go test ./internal/api -v`
Expected: FAIL with undefined handlers/router.

- [ ] **Step 3: Implement endpoints**

Required handlers:

- `GET /api/registries`
- `GET /api/artifacts`
- `GET /api/artifacts/:repository/tags`
- `GET /api/search`
- `POST /api/refresh/:registry_id`
- `GET /healthz`

- [ ] **Step 4: Run tests and commit**

Run: `go test ./internal/api -v`
Expected: PASS.

```bash
git add internal/api/handlers.go internal/api/router.go internal/api/handlers_test.go
git commit -m "feat: add dashboard query and refresh APIs"
```

### Task 6: Build dashboard templates and frontend interactions

**Files:**
- Create: `web/templates/layout.tmpl`
- Create: `web/templates/index.tmpl`
- Create: `web/static/app.js`
- Create: `web/static/style.css`
- Create: `internal/web/page.go`

- [ ] **Step 1: Write failing page render test**

```go
func TestIndexPage_Renders(t *testing.T) {
    // create gin engine, mount page handler, assert HTTP 200 and key content
}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `go test ./internal/web -v`
Expected: FAIL with missing page handler.

- [ ] **Step 3: Implement UI and JS interactions**

Required interactions:

- search input and registry filter
- artifacts table render
- tag detail panel
- copy full image reference button
- favorites toggle in `localStorage`
- favorites-only filter

- [ ] **Step 4: Run tests and commit**

Run: `go test ./internal/web -v`
Expected: PASS.

```bash
git add web/templates/layout.tmpl web/templates/index.tmpl web/static/app.js web/static/style.css internal/web/page.go
git commit -m "feat: add dashboard UI with image-ref copy and favorites"
```

### Task 7: Wire application startup and end-to-end verification

**Files:**
- Modify: `main.go`
- Create: `internal/app/app.go`
- Create: `README.md`

- [ ] **Step 1: Write failing startup smoke test**

```go
func TestNewApp_BuildsRouterAndScheduler(t *testing.T) {
    // ensure dependencies are wired without panic
}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `go test ./... -v`
Expected: FAIL with undefined app wiring.

- [ ] **Step 3: Implement app composition and docs**

`main.go` should:

- load config path from `CONFIG_PATH` (default `config.yaml`)
- construct store, registry clients, scheduler, router
- start scheduler and Gin server

`README.md` should include:

- how to configure registries
- how to run (`go run .`)
- endpoint list and dashboard features

- [ ] **Step 4: Run full verification and commit**

Run: `go test ./... -v && go run .`
Expected: tests PASS; server starts listening on configured port.

```bash
git add main.go internal/app/app.go README.md
git commit -m "feat: wire oci dashboard service end-to-end"
```

### Task 8: Add focused resilience tests and final polish

**Files:**
- Modify: `internal/syncer/scheduler_test.go`
- Modify: `internal/api/handlers_test.go`
- Modify: `README.md`

- [ ] **Step 1: Write failing resilience tests**

```go
func TestSync_AuthFailureKeepsLastSnapshot(t *testing.T) {}
func TestHealthz_ReflectsSchedulerHeartbeat(t *testing.T) {}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `go test ./internal/syncer ./internal/api -v`
Expected: FAIL before code update.

- [ ] **Step 3: Implement resilience behavior and docs updates**

Ensure:

- auth error marks failed status but preserves last good data
- health endpoint returns heartbeat timestamp
- README troubleshooting includes auth/network failure examples

- [ ] **Step 4: Final verification and commit**

Run: `go test ./... -v`
Expected: PASS.

```bash
git add internal/syncer/scheduler_test.go internal/api/handlers_test.go README.md
git commit -m "test: cover sync resilience and health reporting"
```
