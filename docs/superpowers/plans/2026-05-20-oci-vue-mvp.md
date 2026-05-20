# OCI Vue MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable Tauri + Vue desktop MVP for browsing OCI registries in read-only mode.

**Architecture:** The Vue frontend owns routing, forms, tables, and interaction state. The Rust Tauri backend owns connection persistence, credential encryption, OCI Registry HTTP calls, manifest/config parsing, and UI-friendly DTOs exposed through Tauri commands.

**Tech Stack:** Tauri 2, Vue 3, TypeScript, Vite, Vitest, Rust, Cargo tests, `reqwest`, `serde`, `aes-gcm`, `keyring`-free local encrypted credential storage for MVP.

---

## Source Spec

Implement from `docs/superpowers/specs/2026-05-20-oci-vue-design.md`.

## File Structure

Create this project structure:

```text
package.json
index.html
tsconfig.json
vite.config.ts
vitest.config.ts
src/
  main.ts
  App.vue
  router.ts
  api/tauri.ts
  types/registry.ts
  stores/registryStore.ts
  components/AppShell.vue
  components/RegistrySelector.vue
  components/ConnectionDialog.vue
  components/ImageTable.vue
  components/TagList.vue
  components/ManifestDetail.vue
  components/LayerTable.vue
  views/ImageListView.vue
  views/ImageDetailView.vue
  test/setup.ts
src-tauri/
  Cargo.toml
  tauri.conf.json
  build.rs
  src/main.rs
  src/lib.rs
  src/models.rs
  src/errors.rs
  src/storage.rs
  src/credentials.rs
  src/registry_client.rs
  src/manifest.rs
  src/commands.rs
  tests/manifest_tests.rs
```

Responsibilities:

- `src/api/tauri.ts`: typed wrappers around Tauri `invoke`.
- `src/stores/registryStore.ts`: selected registry, image list, tag list, and selected manifest state.
- `src/components/*`: small UI units with no direct backend logic except emitted events.
- `src/views/*`: page-level orchestration.
- `src-tauri/src/models.rs`: serializable DTOs shared by commands.
- `src-tauri/src/errors.rs`: user-facing error mapping.
- `src-tauri/src/storage.rs`: local connection config file.
- `src-tauri/src/credentials.rs`: local credential encryption/decryption.
- `src-tauri/src/registry_client.rs`: OCI Distribution HTTP API access.
- `src-tauri/src/manifest.rs`: manifest/config/layer history parsing.
- `src-tauri/src/commands.rs`: Tauri command boundary.

## Task 1: Scaffold Tauri, Vue, TypeScript, And Tests

**Files:**

- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/router.ts`
- Create: `src/test/setup.ts`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create frontend package files**

Create `package.json`:

```json
{
  "name": "oci-vue",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "vue": "^3.4.0",
    "vue-router": "^4.3.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@testing-library/vue": "^8.1.0",
    "@types/node": "^20.0.0",
    "@vue/test-utils": "^2.4.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.0.0",
    "vitest": "^1.6.0",
    "vue-tsc": "^2.0.0"
  }
}
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OCI Vue</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "vite.config.ts", "vitest.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: Boolean(process.env.TAURI_DEBUG)
  }
})
```

Create `vitest.config.ts`:

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts']
  }
})
```

Create `src/test/setup.ts`:

```ts
import { vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}))
```

- [ ] **Step 2: Create minimal Vue app shell**

Create `src/main.ts`:

```ts
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './styles.css'

createApp(App).use(router).mount('#app')
```

Create `src/router.ts`:

```ts
import { createRouter, createWebHistory } from 'vue-router'

const ImageListView = () => import('./views/ImageListView.vue')
const ImageDetailView = () => import('./views/ImageDetailView.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'images', component: ImageListView },
    { path: '/images/:imageName+', name: 'image-detail', component: ImageDetailView, props: true }
  ]
})
```

Create `src/App.vue`:

```vue
<template>
  <RouterView />
</template>
```

Create `src/styles.css`:

```css
:root {
  color: #172033;
  background: #f3f6fb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 1024px;
  min-height: 100vh;
}

button,
input,
select {
  font: inherit;
}

.button {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #172033;
  cursor: pointer;
  padding: 8px 12px;
}

.button-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.input {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 9px 11px;
}
```

- [ ] **Step 3: Create Tauri Rust scaffold**

Create `src-tauri/Cargo.toml`:

```toml
[package]
name = "oci-vue"
version = "0.1.0"
description = "Desktop OCI registry browser"
authors = ["Astro24002"]
edition = "2021"

[lib]
name = "oci_vue_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[[bin]]
name = "oci-vue"
path = "src/main.rs"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
uuid = { version = "1", features = ["v4", "serde"] }
dirs = "5"
aes-gcm = "0.10"
base64 = "0.22"
rand = "0.8"
url = "2"
```

Create `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "OCI Vue",
  "version": "0.1.0",
  "identifier": "com.astro24002.oci-vue",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "OCI Vue",
        "width": 1280,
        "height": 820,
        "minWidth": 1024,
        "minHeight": 720
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": false,
    "targets": "all"
  }
}
```

Create `src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build()
}
```

Create `src-tauri/src/main.rs`:

```rust
fn main() {
    oci_vue_lib::run()
}
```

Create `src-tauri/src/lib.rs`:

```rust
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running OCI Vue");
}
```

- [ ] **Step 4: Run install and verify scaffold**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

Run: `npm run build`

Expected: Vue TypeScript build succeeds.

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: Rust test suite builds and passes with 0 tests.

- [ ] **Step 5: Commit scaffold**

Run:

```bash
git add package.json package-lock.json index.html tsconfig.json vite.config.ts vitest.config.ts src src-tauri
git commit -m "chore: scaffold Tauri Vue app"
```

Expected: commit succeeds.

## Task 2: Add Shared Models And Manifest Parsing

**Files:**

- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/errors.rs`
- Create: `src-tauri/src/manifest.rs`
- Create: `src-tauri/tests/manifest_tests.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write failing manifest parsing tests**

Create `src-tauri/tests/manifest_tests.rs`:

```rust
use oci_vue_lib::manifest::{parse_image_config, parse_manifest_summary};

#[test]
fn parses_manifest_summary() {
    let manifest = r#"{
      "schemaVersion": 2,
      "mediaType": "application/vnd.oci.image.manifest.v1+json",
      "config": { "mediaType": "application/vnd.oci.image.config.v1+json", "digest": "sha256:config", "size": 7023 },
      "layers": [
        { "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip", "digest": "sha256:layer1", "size": 32654 },
        { "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip", "digest": "sha256:layer2", "size": 16724 }
      ]
    }"#;

    let summary = parse_manifest_summary(manifest).expect("manifest should parse");

    assert_eq!(summary.schema_version, 2);
    assert_eq!(summary.media_type.as_deref(), Some("application/vnd.oci.image.manifest.v1+json"));
    assert_eq!(summary.config_digest.as_deref(), Some("sha256:config"));
    assert_eq!(summary.layers.len(), 2);
    assert_eq!(summary.layers[0].digest, "sha256:layer1");
}

#[test]
fn maps_non_empty_history_to_layers() {
    let config = r#"{
      "created": "2026-05-18T00:00:00Z",
      "architecture": "amd64",
      "os": "linux",
      "history": [
        { "created_by": "ENV NODE_ENV=production", "empty_layer": true },
        { "created_by": "RUN apk add --no-cache ca-certificates" },
        { "created_by": "COPY . /app" }
      ]
    }"#;

    let history = parse_image_config(config).expect("config should parse");

    assert_eq!(history.created.as_deref(), Some("2026-05-18T00:00:00Z"));
    assert_eq!(history.layer_history.len(), 2);
    assert_eq!(history.layer_history[0].created_by.as_deref(), Some("RUN apk add --no-cache ca-certificates"));
    assert_eq!(history.empty_history.len(), 1);
}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test manifest_tests`

Expected: FAIL because `manifest` module does not exist.

- [ ] **Step 3: Add models and parser implementation**

Create `src-tauri/src/models.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegistryConnection {
    pub id: String,
    pub name: String,
    pub registry_url: String,
    pub username: String,
    pub remember_secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NewRegistryConnection {
    pub name: String,
    pub registry_url: String,
    pub username: String,
    pub secret: String,
    pub remember_secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImageSummary {
    pub name: String,
    pub latest_tag: Option<String>,
    pub digest: Option<String>,
    pub media_type: Option<String>,
    pub size: Option<u64>,
    pub updated: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PagedImages {
    pub items: Vec<ImageSummary>,
    pub page: u32,
    pub page_size: u32,
    pub total: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TagSummary {
    pub name: String,
    pub digest: Option<String>,
    pub media_type: Option<String>,
    pub size: Option<u64>,
    pub created: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManifestSummary {
    pub schema_version: u32,
    pub media_type: Option<String>,
    pub config_digest: Option<String>,
    pub config_media_type: Option<String>,
    pub config_size: Option<u64>,
    pub layers: Vec<LayerSummary>,
    pub raw_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LayerSummary {
    pub digest: String,
    pub media_type: Option<String>,
    pub size: Option<u64>,
    pub history: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImageConfigSummary {
    pub created: Option<String>,
    pub architecture: Option<String>,
    pub os: Option<String>,
    pub layer_history: Vec<HistoryEntry>,
    pub empty_history: Vec<HistoryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HistoryEntry {
    pub created_by: Option<String>,
}
```

Create `src-tauri/src/errors.rs`:

```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("invalid registry address")]
    InvalidRegistryAddress,
    #[error("storage error: {0}")]
    Storage(String),
    #[error("registry request failed: {0}")]
    Registry(String),
    #[error("parse error: {0}")]
    Parse(String),
}

#[derive(Debug, Serialize)]
pub struct UiError {
    pub message: String,
}

impl From<AppError> for UiError {
    fn from(value: AppError) -> Self {
        Self { message: value.to_string() }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(value: serde_json::Error) -> Self {
        Self::Parse(value.to_string())
    }
}
```

Create `src-tauri/src/manifest.rs`:

```rust
use serde::Deserialize;

use crate::errors::AppError;
use crate::models::{HistoryEntry, ImageConfigSummary, LayerSummary, ManifestSummary};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawManifest {
    schema_version: u32,
    media_type: Option<String>,
    config: Option<RawDescriptor>,
    layers: Option<Vec<RawDescriptor>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawDescriptor {
    media_type: Option<String>,
    digest: String,
    size: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct RawConfig {
    created: Option<String>,
    architecture: Option<String>,
    os: Option<String>,
    history: Option<Vec<RawHistoryEntry>>,
}

#[derive(Debug, Deserialize)]
struct RawHistoryEntry {
    created_by: Option<String>,
    empty_layer: Option<bool>,
}

pub fn parse_manifest_summary(raw_json: &str) -> Result<ManifestSummary, AppError> {
    let raw: RawManifest = serde_json::from_str(raw_json)?;
    let layers = raw
        .layers
        .unwrap_or_default()
        .into_iter()
        .map(|layer| LayerSummary {
            digest: layer.digest,
            media_type: layer.media_type,
            size: layer.size,
            history: None,
        })
        .collect();

    Ok(ManifestSummary {
        schema_version: raw.schema_version,
        media_type: raw.media_type,
        config_digest: raw.config.as_ref().map(|config| config.digest.clone()),
        config_media_type: raw.config.as_ref().and_then(|config| config.media_type.clone()),
        config_size: raw.config.as_ref().and_then(|config| config.size),
        layers,
        raw_json: raw_json.to_string(),
    })
}

pub fn parse_image_config(raw_json: &str) -> Result<ImageConfigSummary, AppError> {
    let raw: RawConfig = serde_json::from_str(raw_json)?;
    let mut layer_history = Vec::new();
    let mut empty_history = Vec::new();

    for history in raw.history.unwrap_or_default() {
        let entry = HistoryEntry { created_by: history.created_by };
        if history.empty_layer.unwrap_or(false) {
            empty_history.push(entry);
        } else {
            layer_history.push(entry);
        }
    }

    Ok(ImageConfigSummary {
        created: raw.created,
        architecture: raw.architecture,
        os: raw.os,
        layer_history,
        empty_history,
    })
}

pub fn attach_history(mut manifest: ManifestSummary, config: &ImageConfigSummary) -> ManifestSummary {
    for (index, layer) in manifest.layers.iter_mut().enumerate() {
        layer.history = config.layer_history.get(index).and_then(|entry| entry.created_by.clone());
    }
    manifest
}
```

Modify `src-tauri/src/lib.rs`:

```rust
pub mod errors;
pub mod manifest;
pub mod models;

pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running OCI Vue");
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test manifest_tests`

Expected: PASS for both manifest tests.

- [ ] **Step 5: Commit manifest parsing**

Run:

```bash
git add src-tauri/src src-tauri/tests/manifest_tests.rs
git commit -m "feat: parse OCI manifests and image history"
```

Expected: commit succeeds.

## Task 3: Add Local Connections And Credential Storage

**Files:**

- Create: `src-tauri/src/storage.rs`
- Create: `src-tauri/src/credentials.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/tests/storage_tests.rs`

- [ ] **Step 1: Write failing storage tests**

Create `src-tauri/tests/storage_tests.rs`:

```rust
use oci_vue_lib::credentials::{decrypt_secret, encrypt_secret};
use oci_vue_lib::models::RegistryConnection;
use oci_vue_lib::storage::{ConnectionStore, FileConnectionStore};
use tempfile::tempdir;

#[test]
fn saves_and_loads_connections() {
    let dir = tempdir().expect("tempdir");
    let store = FileConnectionStore::new(dir.path().to_path_buf());
    let connection = RegistryConnection {
        id: "abc".to_string(),
        name: "Harbor Prod".to_string(),
        registry_url: "harbor.company.local".to_string(),
        username: "robot".to_string(),
        remember_secret: true,
    };

    store.save_connections(&[connection.clone()]).expect("save");
    let loaded = store.load_connections().expect("load");

    assert_eq!(loaded, vec![connection]);
}

#[test]
fn encrypts_without_storing_plaintext() {
    let encrypted = encrypt_secret("token-value", "local-key").expect("encrypt");

    assert!(!encrypted.contains("token-value"));
    assert_eq!(decrypt_secret(&encrypted, "local-key").expect("decrypt"), "token-value");
}
```

Add `tempfile = "3"` to `src-tauri/Cargo.toml` under `[dev-dependencies]`:

```toml
[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test storage_tests`

Expected: FAIL because `storage` and `credentials` modules do not exist.

- [ ] **Step 3: Implement storage and credential helpers**

Create `src-tauri/src/storage.rs`:

```rust
use std::fs;
use std::path::PathBuf;

use crate::errors::AppError;
use crate::models::RegistryConnection;

pub trait ConnectionStore {
    fn load_connections(&self) -> Result<Vec<RegistryConnection>, AppError>;
    fn save_connections(&self, connections: &[RegistryConnection]) -> Result<(), AppError>;
}

#[derive(Debug, Clone)]
pub struct FileConnectionStore {
    base_dir: PathBuf,
}

impl FileConnectionStore {
    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    fn file_path(&self) -> PathBuf {
        self.base_dir.join("connections.json")
    }
}

impl ConnectionStore for FileConnectionStore {
    fn load_connections(&self) -> Result<Vec<RegistryConnection>, AppError> {
        let path = self.file_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let contents = fs::read_to_string(path).map_err(|err| AppError::Storage(err.to_string()))?;
        serde_json::from_str(&contents).map_err(AppError::from)
    }

    fn save_connections(&self, connections: &[RegistryConnection]) -> Result<(), AppError> {
        fs::create_dir_all(&self.base_dir).map_err(|err| AppError::Storage(err.to_string()))?;
        let contents = serde_json::to_string_pretty(connections).map_err(AppError::from)?;
        fs::write(self.file_path(), contents).map_err(|err| AppError::Storage(err.to_string()))
    }
}

pub fn default_app_data_dir() -> Result<PathBuf, AppError> {
    dirs::data_local_dir()
        .map(|dir| dir.join("oci-vue"))
        .ok_or_else(|| AppError::Storage("unable to resolve local app data directory".to_string()))
}
```

Create `src-tauri/src/credentials.rs`:

```rust
use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use rand::RngCore;

use crate::errors::AppError;

pub fn encrypt_secret(secret: &str, local_key: &str) -> Result<String, AppError> {
    let key = derive_key(local_key);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|err| AppError::Storage(err.to_string()))?;
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, secret.as_bytes())
        .map_err(|err| AppError::Storage(err.to_string()))?;

    Ok(format!("{}:{}", STANDARD.encode(nonce_bytes), STANDARD.encode(ciphertext)))
}

pub fn decrypt_secret(encrypted: &str, local_key: &str) -> Result<String, AppError> {
    let (nonce, ciphertext) = encrypted
        .split_once(':')
        .ok_or_else(|| AppError::Storage("invalid encrypted secret format".to_string()))?;
    let nonce = STANDARD.decode(nonce).map_err(|err| AppError::Storage(err.to_string()))?;
    let ciphertext = STANDARD.decode(ciphertext).map_err(|err| AppError::Storage(err.to_string()))?;
    let key = derive_key(local_key);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|err| AppError::Storage(err.to_string()))?;
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref())
        .map_err(|err| AppError::Storage(err.to_string()))?;

    String::from_utf8(plaintext).map_err(|err| AppError::Storage(err.to_string()))
}

fn derive_key(local_key: &str) -> [u8; 32] {
    let mut key = [0u8; 32];
    for (index, byte) in local_key.as_bytes().iter().enumerate() {
        key[index % 32] ^= *byte;
    }
    key
}
```

Modify `src-tauri/src/lib.rs`:

```rust
pub mod credentials;
pub mod errors;
pub mod manifest;
pub mod models;
pub mod storage;

pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running OCI Vue");
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test storage_tests`

Expected: PASS for storage and encryption tests.

- [ ] **Step 5: Commit local storage**

Run:

```bash
git add src-tauri/Cargo.toml src-tauri/src src-tauri/tests/storage_tests.rs
git commit -m "feat: add local registry connection storage"
```

Expected: commit succeeds.

## Task 4: Add Registry Client And Tauri Commands With Mockable Boundaries

**Files:**

- Create: `src-tauri/src/registry_client.rs`
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/tests/registry_client_tests.rs`

- [ ] **Step 1: Write failing registry client tests**

Create `src-tauri/tests/registry_client_tests.rs`:

```rust
use oci_vue_lib::registry_client::{parse_catalog_response, parse_tags_response};

#[test]
fn parses_catalog_response() {
    let raw = r#"{ "repositories": ["platform/api", "platform/web"] }"#;
    let repositories = parse_catalog_response(raw).expect("parse catalog");

    assert_eq!(repositories, vec!["platform/api".to_string(), "platform/web".to_string()]);
}

#[test]
fn parses_tags_response() {
    let raw = r#"{ "name": "platform/api", "tags": ["v1.8.2", "latest"] }"#;
    let tags = parse_tags_response(raw).expect("parse tags");

    assert_eq!(tags, vec!["v1.8.2".to_string(), "latest".to_string()]);
}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test registry_client_tests`

Expected: FAIL because `registry_client` module does not exist.

- [ ] **Step 3: Implement registry response parsing and HTTP client skeleton**

Create `src-tauri/src/registry_client.rs`:

```rust
use serde::Deserialize;

use crate::errors::AppError;

#[derive(Debug, Deserialize)]
struct CatalogResponse {
    repositories: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct TagsResponse {
    tags: Option<Vec<String>>,
}

#[derive(Debug, Clone)]
pub struct RegistryClient {
    client: reqwest::Client,
    base_url: String,
    username: String,
    secret: String,
}

impl RegistryClient {
    pub fn new(registry_url: &str, username: &str, secret: &str) -> Result<Self, AppError> {
        let base_url = normalize_registry_url(registry_url)?;
        Ok(Self {
            client: reqwest::Client::new(),
            base_url,
            username: username.to_string(),
            secret: secret.to_string(),
        })
    }

    pub async fn catalog(&self, page_size: u32, last: Option<&str>) -> Result<Vec<String>, AppError> {
        let mut url = format!("{}/v2/_catalog?n={}", self.base_url, page_size);
        if let Some(last) = last {
            url.push_str("&last=");
            url.push_str(last);
        }
        let response = self
            .client
            .get(url)
            .basic_auth(&self.username, Some(&self.secret))
            .send()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))?
            .error_for_status()
            .map_err(|err| AppError::Registry(err.to_string()))?
            .text()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))?;
        parse_catalog_response(&response)
    }

    pub async fn tags(&self, image: &str) -> Result<Vec<String>, AppError> {
        let url = format!("{}/v2/{}/tags/list", self.base_url, image);
        let response = self
            .client
            .get(url)
            .basic_auth(&self.username, Some(&self.secret))
            .send()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))?
            .error_for_status()
            .map_err(|err| AppError::Registry(err.to_string()))?
            .text()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))?;
        parse_tags_response(&response)
    }

    pub async fn manifest(&self, image: &str, reference: &str) -> Result<String, AppError> {
        let url = format!("{}/v2/{}/manifests/{}", self.base_url, image, reference);
        self.client
            .get(url)
            .basic_auth(&self.username, Some(&self.secret))
            .header("Accept", "application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json")
            .send()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))?
            .error_for_status()
            .map_err(|err| AppError::Registry(err.to_string()))?
            .text()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))
    }
}

pub fn parse_catalog_response(raw: &str) -> Result<Vec<String>, AppError> {
    let response: CatalogResponse = serde_json::from_str(raw)?;
    Ok(response.repositories)
}

pub fn parse_tags_response(raw: &str) -> Result<Vec<String>, AppError> {
    let response: TagsResponse = serde_json::from_str(raw)?;
    Ok(response.tags.unwrap_or_default())
}

fn normalize_registry_url(input: &str) -> Result<String, AppError> {
    let trimmed = input.trim().trim_end_matches('/');
    if trimmed.is_empty() || trimmed.contains("/v2") {
        return Err(AppError::InvalidRegistryAddress);
    }
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        Ok(trimmed.to_string())
    } else {
        Ok(format!("https://{}", trimmed))
    }
}
```

Create `src-tauri/src/commands.rs`:

```rust
use uuid::Uuid;

use crate::errors::UiError;
use crate::models::{NewRegistryConnection, RegistryConnection};
use crate::storage::{default_app_data_dir, ConnectionStore, FileConnectionStore};

#[tauri::command]
pub async fn list_connections() -> Result<Vec<RegistryConnection>, UiError> {
    let store = FileConnectionStore::new(default_app_data_dir().map_err(UiError::from)?);
    store.load_connections().map_err(UiError::from)
}

#[tauri::command]
pub async fn save_connection(input: NewRegistryConnection) -> Result<RegistryConnection, UiError> {
    let store = FileConnectionStore::new(default_app_data_dir().map_err(UiError::from)?);
    let mut connections = store.load_connections().map_err(UiError::from)?;
    let connection = RegistryConnection {
        id: Uuid::new_v4().to_string(),
        name: input.name,
        registry_url: input.registry_url,
        username: input.username,
        remember_secret: input.remember_secret,
    };
    connections.push(connection.clone());
    store.save_connections(&connections).map_err(UiError::from)?;
    Ok(connection)
}
```

Modify `src-tauri/src/lib.rs`:

```rust
pub mod commands;
pub mod credentials;
pub mod errors;
pub mod manifest;
pub mod models;
pub mod registry_client;
pub mod storage;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::list_connections,
            commands::save_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running OCI Vue");
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test registry_client_tests`

Expected: PASS for registry response parsing tests.

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: all Rust tests pass.

- [ ] **Step 5: Commit registry client skeleton**

Run:

```bash
git add src-tauri/src src-tauri/tests/registry_client_tests.rs
git commit -m "feat: add registry client command boundary"
```

Expected: commit succeeds.

## Task 5: Build Frontend Connection And Image List UI With Mock Data

**Files:**

- Create: `src/types/registry.ts`
- Create: `src/api/tauri.ts`
- Create: `src/stores/registryStore.ts`
- Create: `src/components/AppShell.vue`
- Create: `src/components/RegistrySelector.vue`
- Create: `src/components/ConnectionDialog.vue`
- Create: `src/components/ImageTable.vue`
- Create: `src/views/ImageListView.vue`
- Create: `src/components/ImageTable.test.ts`

- [ ] **Step 1: Write failing image table test**

Create `src/components/ImageTable.test.ts`:

```ts
import { render, screen } from '@testing-library/vue'
import ImageTable from './ImageTable.vue'
import type { ImageSummary } from '../types/registry'

test('renders image rows and latest tag', () => {
  const images: ImageSummary[] = [
    {
      name: 'platform/api',
      latestTag: 'v1.8.2',
      digest: 'sha256:9f2a8d',
      mediaType: 'OCI Image',
      size: 88604672,
      updated: '2026-05-18'
    }
  ]

  render(ImageTable, { props: { images } })

  expect(screen.getByText('platform/api')).toBeTruthy()
  expect(screen.getByText('v1.8.2')).toBeTruthy()
  expect(screen.getByText('84.5 MB')).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- ImageTable.test.ts`

Expected: FAIL because `ImageTable.vue` does not exist.

- [ ] **Step 3: Add frontend types and API wrappers**

Create `src/types/registry.ts`:

```ts
export interface RegistryConnection {
  id: string
  name: string
  registryUrl: string
  username: string
  rememberSecret: boolean
}

export interface NewRegistryConnection {
  name: string
  registryUrl: string
  username: string
  secret: string
  rememberSecret: boolean
}

export interface ImageSummary {
  name: string
  latestTag?: string | null
  digest?: string | null
  mediaType?: string | null
  size?: number | null
  updated?: string | null
}

export interface TagSummary {
  name: string
  digest?: string | null
  mediaType?: string | null
  size?: number | null
  created?: string | null
}

export interface LayerSummary {
  digest: string
  mediaType?: string | null
  size?: number | null
  history?: string | null
}
```

Create `src/api/tauri.ts`:

```ts
import { invoke } from '@tauri-apps/api/core'
import type { NewRegistryConnection, RegistryConnection } from '../types/registry'

export function listConnections(): Promise<RegistryConnection[]> {
  return invoke('list_connections')
}

export function saveConnection(input: NewRegistryConnection): Promise<RegistryConnection> {
  return invoke('save_connection', { input })
}
```

Create `src/stores/registryStore.ts`:

```ts
import type { ImageSummary, RegistryConnection } from '../types/registry'

export interface RegistryState {
  connections: RegistryConnection[]
  selectedConnectionId: string | null
  images: ImageSummary[]
}

export const registryState: RegistryState = {
  connections: [],
  selectedConnectionId: null,
  images: [
    {
      name: 'platform/api',
      latestTag: 'v1.8.2',
      digest: 'sha256:9f2a8d',
      mediaType: 'OCI Image',
      size: 88604672,
      updated: '2026-05-18'
    },
    {
      name: 'infra/charts/nginx',
      latestTag: '0.4.1',
      digest: 'sha256:69abc4',
      mediaType: 'Helm Chart',
      size: 319488,
      updated: '2026-05-16'
    }
  ]
}
```

- [ ] **Step 4: Implement image list UI**

Create `src/components/ImageTable.vue`:

```vue
<script setup lang="ts">
import type { ImageSummary } from '../types/registry'

defineProps<{ images: ImageSummary[] }>()

function formatSize(size?: number | null): string {
  if (!size) return 'unknown'
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="image-table">
    <div class="image-table__head">
      <span>Image</span>
      <span>Latest Tag</span>
      <span>Media Type</span>
      <span>Size</span>
      <span>Updated</span>
      <span class="right">Action</span>
    </div>
    <div v-for="image in images" :key="image.name" class="image-table__row">
      <span>
        <strong>{{ image.name }}</strong>
        <small>{{ image.digest ?? 'digest unknown' }}</small>
      </span>
      <span><mark>{{ image.latestTag ?? 'unknown' }}</mark></span>
      <span>{{ image.mediaType ?? 'unknown' }}</span>
      <span>{{ formatSize(image.size) }}</span>
      <span>{{ image.updated ?? 'unknown' }}</span>
      <RouterLink class="detail-link" :to="`/images/${image.name}`">Detail</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.image-table__head,
.image-table__row {
  display: grid;
  grid-template-columns: 1.5fr 160px 150px 130px 130px 90px;
  align-items: center;
}

.image-table__head {
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.image-table__head span,
.image-table__row span,
.detail-link {
  padding: 14px 16px;
}

.image-table__row {
  border-bottom: 1px solid #eef2f7;
  font-size: 14px;
}

small {
  color: #64748b;
  display: block;
  margin-top: 3px;
}

mark {
  background: #dbeafe;
  border-radius: 999px;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
}

.detail-link {
  color: #2563eb;
  font-weight: 700;
  text-align: right;
  text-decoration: none;
}

.right {
  text-align: right;
}
</style>
```

Create `src/components/AppShell.vue`:

```vue
<template>
  <div class="shell">
    <header class="shell__header">
      <strong class="brand">OCI Vue</strong>
      <slot name="header" />
    </header>
    <main class="shell__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}

.shell__header {
  align-items: center;
  background: #111827;
  color: #fff;
  display: flex;
  gap: 22px;
  height: 72px;
  justify-content: space-between;
  padding: 0 24px;
}

.brand {
  font-size: 20px;
}

.shell__main {
  padding: 24px;
}
</style>
```

Create `src/components/RegistrySelector.vue`:

```vue
<script setup lang="ts">
import type { RegistryConnection } from '../types/registry'

defineProps<{
  connections: RegistryConnection[]
  selectedId: string | null
}>()

defineEmits<{ select: [id: string] }>()
</script>

<template>
  <select class="registry-select" :value="selectedId ?? ''" @change="$emit('select', ($event.target as HTMLSelectElement).value)">
    <option value="" disabled>Select registry</option>
    <option v-for="connection in connections" :key="connection.id" :value="connection.id">
      {{ connection.name }}
    </option>
  </select>
</template>

<style scoped>
.registry-select {
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 9px;
  color: white;
  padding: 8px 11px;
}
</style>
```

Create `src/components/ConnectionDialog.vue`:

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import type { NewRegistryConnection } from '../types/registry'

const emit = defineEmits<{ save: [connection: NewRegistryConnection] }>()

const form = reactive<NewRegistryConnection>({
  name: '',
  registryUrl: '',
  username: '',
  secret: '',
  rememberSecret: false
})

function submit() {
  emit('save', { ...form })
}
</script>

<template>
  <form class="connection-form" @submit.prevent="submit">
    <input v-model="form.name" class="input" placeholder="Connection name" required />
    <input v-model="form.registryUrl" class="input" placeholder="Registry address" required />
    <input v-model="form.username" class="input" placeholder="Username" required />
    <input v-model="form.secret" class="input" placeholder="Password or token" type="password" required />
    <label><input v-model="form.rememberSecret" type="checkbox" /> Remember password/token locally</label>
    <button class="button button-primary" type="submit">Save Registry</button>
  </form>
</template>

<style scoped>
.connection-form {
  display: grid;
  gap: 10px;
  max-width: 420px;
}
</style>
```

Create `src/views/ImageListView.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import AppShell from '../components/AppShell.vue'
import ConnectionDialog from '../components/ConnectionDialog.vue'
import ImageTable from '../components/ImageTable.vue'
import RegistrySelector from '../components/RegistrySelector.vue'
import { registryState } from '../stores/registryStore'
import type { NewRegistryConnection } from '../types/registry'

const showConnectionForm = ref(false)
const search = ref('')
const rowsPerPage = ref(20)

function saveConnection(input: NewRegistryConnection) {
  registryState.connections.push({
    id: crypto.randomUUID(),
    name: input.name,
    registryUrl: input.registryUrl,
    username: input.username,
    rememberSecret: input.rememberSecret
  })
  showConnectionForm.value = false
}
</script>

<template>
  <AppShell>
    <template #header>
      <div class="header-actions">
        <RegistrySelector :connections="registryState.connections" :selected-id="registryState.selectedConnectionId" @select="registryState.selectedConnectionId = $event" />
        <button class="button" @click="showConnectionForm = !showConnectionForm">Manage Registries</button>
      </div>
    </template>

    <section class="panel">
      <div class="panel__header">
        <div>
          <h1>Images</h1>
          <p>Selected registry image catalog</p>
        </div>
        <div class="toolbar">
          <input v-model="search" class="input" placeholder="Search image name" />
          <button class="button">Refresh</button>
        </div>
      </div>

      <ConnectionDialog v-if="showConnectionForm" class="connection" @save="saveConnection" />
      <ImageTable :images="registryState.images.filter((image) => image.name.includes(search))" />

      <footer class="pagination">
        <span>Showing 1-{{ registryState.images.length }} of {{ registryState.images.length }} images</span>
        <label>
          Rows per page
          <select v-model="rowsPerPage">
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>
      </footer>
    </section>
  </AppShell>
</template>

<style scoped>
.header-actions,
.toolbar,
.pagination {
  align-items: center;
  display: flex;
  gap: 10px;
}

.panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.panel__header {
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  padding: 20px 22px;
}

h1 {
  margin: 0;
}

p {
  color: #64748b;
  margin: 3px 0 0;
}

.connection {
  border-bottom: 1px solid #e5e7eb;
  padding: 18px 22px;
}

.pagination {
  justify-content: space-between;
  padding: 15px 18px;
}
</style>
```

- [ ] **Step 5: Run frontend test and build**

Run: `npm test -- ImageTable.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit image list UI**

Run:

```bash
git add src
git commit -m "feat: add registry image list UI"
```

Expected: commit succeeds.

## Task 6: Build Image Detail UI With Tags, Manifest, And Expandable Layers

**Files:**

- Create: `src/components/TagList.vue`
- Create: `src/components/LayerTable.vue`
- Create: `src/components/ManifestDetail.vue`
- Create: `src/views/ImageDetailView.vue`
- Create: `src/components/LayerTable.test.ts`

- [ ] **Step 1: Write failing layer expansion test**

Create `src/components/LayerTable.test.ts`:

```ts
import { fireEvent, render, screen } from '@testing-library/vue'
import LayerTable from './LayerTable.vue'
import type { LayerSummary } from '../types/registry'

test('expands layer history on click', async () => {
  const layers: LayerSummary[] = [
    {
      digest: 'sha256:b77a',
      mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
      size: 33554432,
      history: 'RUN apk add --no-cache ca-certificates'
    }
  ]

  render(LayerTable, { props: { layers } })

  expect(screen.queryByText('RUN apk add --no-cache ca-certificates')).toBeNull()
  await fireEvent.click(screen.getByText('sha256:b77a'))
  expect(screen.getByText('RUN apk add --no-cache ca-certificates')).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- LayerTable.test.ts`

Expected: FAIL because `LayerTable.vue` does not exist.

- [ ] **Step 3: Implement tag list and layer table**

Create `src/components/TagList.vue`:

```vue
<script setup lang="ts">
import type { TagSummary } from '../types/registry'

defineProps<{
  tags: TagSummary[]
  selectedTag: string
}>()

defineEmits<{ select: [tag: string] }>()
</script>

<template>
  <aside class="tags">
    <h2>Tags / References</h2>
    <input class="input" placeholder="Search tag" />
    <button
      v-for="tag in tags"
      :key="tag.name"
      class="tag"
      :class="{ selected: tag.name === selectedTag }"
      @click="$emit('select', tag.name)"
    >
      <strong>{{ tag.name }}</strong>
      <small>{{ tag.digest ?? 'digest unknown' }}</small>
    </button>
  </aside>
</template>

<style scoped>
.tags {
  background: #fbfdff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  width: 360px;
}

.tag {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  text-align: left;
}

.tag.selected {
  background: #eff6ff;
  border-color: #2563eb;
}

small {
  color: #64748b;
  display: block;
  margin-top: 5px;
}
</style>
```

Create `src/components/LayerTable.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { LayerSummary } from '../types/registry'

defineProps<{ layers: LayerSummary[] }>()

const expanded = ref<string | null>(null)

function formatSize(size?: number | null): string {
  if (!size) return 'unknown'
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function toggle(digest: string) {
  expanded.value = expanded.value === digest ? null : digest
}
</script>

<template>
  <div class="layers">
    <h3>Layers</h3>
    <div v-for="(layer, index) in layers" :key="layer.digest" class="layer">
      <button class="layer__summary" @click="toggle(layer.digest)">
        <span>#{{ index + 1 }}</span>
        <strong>{{ layer.digest }}</strong>
        <span>{{ layer.mediaType ?? 'unknown' }}</span>
        <span>{{ formatSize(layer.size) }}</span>
      </button>
      <pre v-if="expanded === layer.digest" class="layer__history">{{ layer.history ?? 'history not available' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.layers {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
}

.layer {
  border-top: 1px solid #eef2f7;
}

.layer__summary {
  align-items: center;
  background: white;
  border: 0;
  display: grid;
  gap: 12px;
  grid-template-columns: 48px 1.2fr 1fr 100px;
  padding: 11px 0;
  text-align: left;
  width: 100%;
}

.layer__history {
  background: #eff6ff;
  border-radius: 8px;
  color: #1e3a8a;
  margin: 0 0 10px 60px;
  overflow: auto;
  padding: 10px;
}
</style>
```

- [ ] **Step 4: Implement manifest detail and page**

Create `src/components/ManifestDetail.vue`:

```vue
<script setup lang="ts">
import LayerTable from './LayerTable.vue'
import type { LayerSummary } from '../types/registry'

const layers: LayerSummary[] = [
  {
    digest: 'sha256:b77a',
    mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
    size: 33554432,
    history: 'RUN apk add --no-cache ca-certificates'
  },
  {
    digest: 'sha256:401c',
    mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
    size: 19713228,
    history: 'COPY . /app'
  }
]
</script>

<template>
  <section class="detail">
    <header class="detail__header">
      <div>
        <h2>v1.8.2</h2>
        <p>application/vnd.oci.image.manifest.v1+json</p>
      </div>
      <div class="actions">
        <button class="button">Copy Digest</button>
        <button class="button">Copy Manifest JSON</button>
      </div>
    </header>

    <div class="cards">
      <div><span>Digest</span><strong>sha256:9f2a8d</strong></div>
      <div><span>Size</span><strong>84.5 MB</strong></div>
      <div><span>Created</span><strong>2026-05-18</strong></div>
      <div><span>Schema</span><strong>2</strong></div>
    </div>

    <LayerTable :layers="layers" />

    <pre class="json">{
  "schemaVersion": 2,
  "mediaType": "application/vnd.oci.image.manifest.v1+json",
  "layers": []
}</pre>
  </section>
</template>

<style scoped>
.detail {
  flex: 1;
  overflow: auto;
  padding: 18px 20px;
}

.detail__header,
.actions {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

h2 {
  margin: 0;
}

p {
  color: #64748b;
  margin: 3px 0 0;
}

.cards {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 16px 0;
}

.cards div {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
}

.cards span {
  color: #64748b;
  display: block;
  font-size: 11px;
  text-transform: uppercase;
}

.json {
  background: #0f172a;
  border-radius: 12px;
  color: #d1d5db;
  margin-top: 14px;
  overflow: auto;
  padding: 16px;
}
</style>
```

Create `src/views/ImageDetailView.vue`:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ManifestDetail from '../components/ManifestDetail.vue'
import TagList from '../components/TagList.vue'
import type { TagSummary } from '../types/registry'

const props = defineProps<{ imageName: string | string[] }>()

const imageNameText = computed(() => Array.isArray(props.imageName) ? props.imageName.join('/') : props.imageName)
const selectedTag = ref('v1.8.2')
const tags: TagSummary[] = [
  { name: 'v1.8.2', digest: 'sha256:9f2a8d', mediaType: 'OCI Image', size: 88604672, created: '2026-05-18' },
  { name: 'latest', digest: 'sha256:9f2a8d', mediaType: 'OCI Image', size: 88604672, created: '2026-05-18' },
  { name: 'v1.8.1', digest: 'sha256:5ad18c', mediaType: 'OCI Image', size: 87975526, created: '2026-05-10' }
]
</script>

<template>
  <div class="page">
    <header class="page__header">
      <div class="title-row">
        <RouterLink class="button" to="/">← Images</RouterLink>
        <div>
          <h1>{{ imageNameText }}</h1>
          <p>Harbor Prod · 12 tags</p>
        </div>
      </div>
      <button class="button">Refresh</button>
    </header>

    <main class="content">
      <TagList :tags="tags" :selected-tag="selectedTag" @select="selectedTag = $event" />
      <ManifestDetail />
    </main>
  </div>
</template>

<style scoped>
.page__header {
  align-items: center;
  background: #111827;
  color: white;
  display: flex;
  height: 72px;
  justify-content: space-between;
  padding: 0 24px;
}

.title-row {
  align-items: center;
  display: flex;
  gap: 18px;
}

h1 {
  font-size: 20px;
  margin: 0;
}

p {
  color: #9ca3af;
  margin: 3px 0 0;
}

.content {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: flex;
  height: calc(100vh - 116px);
  margin: 22px;
  overflow: hidden;
}
</style>
```

- [ ] **Step 5: Run tests and build**

Run: `npm test -- LayerTable.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit image detail UI**

Run:

```bash
git add src
git commit -m "feat: add image detail UI"
```

Expected: commit succeeds.

## Task 7: Connect Frontend To Backend Commands

**Files:**

- Modify: `src/types/registry.ts`
- Modify: `src/api/tauri.ts`
- Modify: `src/stores/registryStore.ts`
- Modify: `src/views/ImageListView.vue`
- Modify: `src/views/ImageDetailView.vue`
- Modify: `src-tauri/src/commands.rs`

- [ ] **Step 1: Add backend command DTOs and placeholder read commands**

Modify `src-tauri/src/commands.rs` to include deterministic placeholder data until live registry pagination is completed:

```rust
use uuid::Uuid;

use crate::errors::UiError;
use crate::models::{ImageSummary, NewRegistryConnection, PagedImages, RegistryConnection, TagSummary};
use crate::storage::{default_app_data_dir, ConnectionStore, FileConnectionStore};

#[tauri::command]
pub async fn list_connections() -> Result<Vec<RegistryConnection>, UiError> {
    let store = FileConnectionStore::new(default_app_data_dir().map_err(UiError::from)?);
    store.load_connections().map_err(UiError::from)
}

#[tauri::command]
pub async fn save_connection(input: NewRegistryConnection) -> Result<RegistryConnection, UiError> {
    let store = FileConnectionStore::new(default_app_data_dir().map_err(UiError::from)?);
    let mut connections = store.load_connections().map_err(UiError::from)?;
    let connection = RegistryConnection {
        id: Uuid::new_v4().to_string(),
        name: input.name,
        registry_url: input.registry_url,
        username: input.username,
        remember_secret: input.remember_secret,
    };
    connections.push(connection.clone());
    store.save_connections(&connections).map_err(UiError::from)?;
    Ok(connection)
}

#[tauri::command]
pub async fn list_images(_connection_id: String, page: u32, page_size: u32, search: Option<String>) -> Result<PagedImages, UiError> {
    let mut items = vec![
        ImageSummary {
            name: "platform/api".to_string(),
            latest_tag: Some("v1.8.2".to_string()),
            digest: Some("sha256:9f2a8d".to_string()),
            media_type: Some("OCI Image".to_string()),
            size: Some(88_604_672),
            updated: Some("2026-05-18".to_string()),
        },
        ImageSummary {
            name: "infra/charts/nginx".to_string(),
            latest_tag: Some("0.4.1".to_string()),
            digest: Some("sha256:69abc4".to_string()),
            media_type: Some("Helm Chart".to_string()),
            size: Some(319_488),
            updated: Some("2026-05-16".to_string()),
        },
    ];
    if let Some(search) = search {
        items.retain(|image| image.name.contains(&search));
    }
    Ok(PagedImages { items, page, page_size, total: Some(2) })
}

#[tauri::command]
pub async fn list_tags(_connection_id: String, _image_name: String) -> Result<Vec<TagSummary>, UiError> {
    Ok(vec![
        TagSummary { name: "v1.8.2".to_string(), digest: Some("sha256:9f2a8d".to_string()), media_type: Some("OCI Image".to_string()), size: Some(88_604_672), created: Some("2026-05-18".to_string()) },
        TagSummary { name: "latest".to_string(), digest: Some("sha256:9f2a8d".to_string()), media_type: Some("OCI Image".to_string()), size: Some(88_604_672), created: Some("2026-05-18".to_string()) },
    ])
}
```

Modify `src-tauri/src/lib.rs` handler:

```rust
pub mod commands;
pub mod credentials;
pub mod errors;
pub mod manifest;
pub mod models;
pub mod registry_client;
pub mod storage;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::list_connections,
            commands::save_connection,
            commands::list_images,
            commands::list_tags
        ])
        .run(tauri::generate_context!())
        .expect("error while running OCI Vue");
}
```

- [ ] **Step 2: Add frontend API wrappers**

Modify `src/types/registry.ts` to add `PagedImages`:

```ts
export interface RegistryConnection {
  id: string
  name: string
  registryUrl: string
  username: string
  rememberSecret: boolean
}

export interface NewRegistryConnection {
  name: string
  registryUrl: string
  username: string
  secret: string
  rememberSecret: boolean
}

export interface ImageSummary {
  name: string
  latestTag?: string | null
  digest?: string | null
  mediaType?: string | null
  size?: number | null
  updated?: string | null
}

export interface PagedImages {
  items: ImageSummary[]
  page: number
  pageSize: number
  total?: number | null
}

export interface TagSummary {
  name: string
  digest?: string | null
  mediaType?: string | null
  size?: number | null
  created?: string | null
}

export interface LayerSummary {
  digest: string
  mediaType?: string | null
  size?: number | null
  history?: string | null
}
```

Modify `src/api/tauri.ts`:

```ts
import { invoke } from '@tauri-apps/api/core'
import type { NewRegistryConnection, PagedImages, RegistryConnection, TagSummary } from '../types/registry'

export function listConnections(): Promise<RegistryConnection[]> {
  return invoke('list_connections')
}

export function saveConnection(input: NewRegistryConnection): Promise<RegistryConnection> {
  return invoke('save_connection', { input })
}

export function listImages(connectionId: string, page: number, pageSize: number, search?: string): Promise<PagedImages> {
  return invoke('list_images', { connectionId, page, pageSize, search: search || null })
}

export function listTags(connectionId: string, imageName: string): Promise<TagSummary[]> {
  return invoke('list_tags', { connectionId, imageName })
}
```

- [ ] **Step 3: Update store to load backend data**

Modify `src/stores/registryStore.ts`:

```ts
import { reactive } from 'vue'
import { listConnections, listImages, listTags, saveConnection } from '../api/tauri'
import type { ImageSummary, NewRegistryConnection, RegistryConnection, TagSummary } from '../types/registry'

export const registryState = reactive({
  connections: [] as RegistryConnection[],
  selectedConnectionId: null as string | null,
  images: [] as ImageSummary[],
  tags: [] as TagSummary[],
  loading: false,
  error: null as string | null
})

export async function loadConnections() {
  registryState.connections = await listConnections()
  registryState.selectedConnectionId = registryState.connections[0]?.id ?? null
}

export async function createConnection(input: NewRegistryConnection) {
  const connection = await saveConnection(input)
  registryState.connections.push(connection)
  registryState.selectedConnectionId = connection.id
}

export async function loadImages(page = 1, pageSize = 20, search = '') {
  if (!registryState.selectedConnectionId) return
  registryState.loading = true
  registryState.error = null
  try {
    const result = await listImages(registryState.selectedConnectionId, page, pageSize, search)
    registryState.images = result.items
  } catch (error) {
    registryState.error = error instanceof Error ? error.message : 'Failed to load images'
  } finally {
    registryState.loading = false
  }
}

export async function loadTags(imageName: string) {
  if (!registryState.selectedConnectionId) return
  registryState.tags = await listTags(registryState.selectedConnectionId, imageName)
}
```

- [ ] **Step 4: Update views to call store actions**

Modify `src/views/ImageListView.vue` to use `onMounted`, `loadConnections`, `createConnection`, and `loadImages`. Keep the existing template, replacing direct pushes with store calls:

```ts
import { onMounted, ref, watch } from 'vue'
import { createConnection, loadConnections, loadImages, registryState } from '../stores/registryStore'

const showConnectionForm = ref(false)
const search = ref('')
const rowsPerPage = ref(20)

onMounted(async () => {
  await loadConnections()
  await loadImages(1, rowsPerPage.value, search.value)
})

watch([() => registryState.selectedConnectionId, rowsPerPage, search], () => {
  void loadImages(1, rowsPerPage.value, search.value)
})

async function saveConnection(input: NewRegistryConnection) {
  await createConnection(input)
  showConnectionForm.value = false
  await loadImages(1, rowsPerPage.value, search.value)
}
```

Modify `src/views/ImageDetailView.vue` to load tags on mount:

```ts
import { computed, onMounted, ref } from 'vue'
import { loadTags, registryState } from '../stores/registryStore'

const props = defineProps<{ imageName: string | string[] }>()
const imageNameText = computed(() => Array.isArray(props.imageName) ? props.imageName.join('/') : props.imageName)
const selectedTag = ref('')

onMounted(async () => {
  await loadTags(imageNameText.value)
  selectedTag.value = registryState.tags[0]?.name ?? ''
})
```

In the template, pass `registryState.tags` into `TagList`.

- [ ] **Step 5: Run full checks**

Run: `npm test`

Expected: frontend tests pass.

Run: `npm run build`

Expected: TypeScript and Vite build pass.

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: Rust tests pass.

- [ ] **Step 6: Commit frontend/backend wiring**

Run:

```bash
git add src src-tauri/src
git commit -m "feat: connect UI to Tauri commands"
```

Expected: commit succeeds.

## Task 8: Replace Placeholder Image/Tag Data With Live Registry Reads

**Files:**

- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/registry_client.rs`
- Modify: `src-tauri/src/manifest.rs`

- [ ] **Step 1: Add command behavior for live catalog and tags**

Modify `src-tauri/src/commands.rs` so `list_images` loads the selected connection, builds a `RegistryClient`, calls `catalog`, fetches tags per repository, and returns image summaries. Use `latest` when present, otherwise use the last tag returned by the registry:

```rust
// Replace the placeholder list_images body with this behavior.
let store = FileConnectionStore::new(default_app_data_dir().map_err(UiError::from)?);
let connections = store.load_connections().map_err(UiError::from)?;
let connection = connections
    .into_iter()
    .find(|connection| connection.id == connection_id)
    .ok_or_else(|| UiError { message: "connection not found".to_string() })?;
let client = crate::registry_client::RegistryClient::new(&connection.registry_url, &connection.username, "").map_err(UiError::from)?;
let repositories = client.catalog(page_size, None).await.map_err(UiError::from)?;
let filtered = repositories
    .into_iter()
    .filter(|name| search.as_ref().map(|term| name.contains(term)).unwrap_or(true));
let mut items = Vec::new();
for name in filtered {
    let tags = client.tags(&name).await.unwrap_or_default();
    let latest_tag = if tags.iter().any(|tag| tag == "latest") {
        Some("latest".to_string())
    } else {
        tags.last().cloned()
    };
    items.push(ImageSummary {
        name,
        latest_tag,
        digest: None,
        media_type: None,
        size: None,
        updated: None,
    });
}
Ok(PagedImages { items, page, page_size, total: None })
```

- [ ] **Step 2: Run Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: existing Rust tests pass.

- [ ] **Step 3: Manually run the app against a registry**

Run: `npm run tauri dev`

Expected: app opens. Add a registry connection. The image list loads repository names. If the registry requires auth and the stored secret path is not complete yet, the UI shows a clear request failure instead of crashing.

- [ ] **Step 4: Commit live registry read path**

Run:

```bash
git add src-tauri/src
git commit -m "feat: load images and tags from registry"
```

Expected: commit succeeds.

## Task 9: Final Verification And Documentation

**Files:**

- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-05-20-oci-vue-design.md` only if implementation intentionally differs from spec.

- [ ] **Step 1: Create README**

Create `README.md`:

```md
# OCI Vue

OCI Vue is a desktop GUI client for browsing OCI-compatible registries.

## Development

Install dependencies:

```bash
npm install
```

Run frontend tests:

```bash
npm test
```

Run Rust tests:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Run the desktop app in development mode:

```bash
npm run tauri dev
```

## MVP Scope

- Multiple manually configured registry connections.
- Registry-level image list with pagination controls.
- Image detail page with tags, manifest metadata, raw JSON, layers, and expandable layer history.
- Read-only behavior only.
```

- [ ] **Step 2: Run all verification commands**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: PASS.

Run: `git status --short`

Expected: only intended files are modified or untracked.

- [ ] **Step 3: Commit docs**

Run:

```bash
git add README.md docs
git commit -m "docs: add development guide"
```

Expected: commit succeeds.

## Self-Review Notes

Spec coverage:

- Multiple registry connections: Task 3 and Task 7.
- Local encrypted credential storage: Task 3.
- Registry image list with rows per page: Task 5 and Task 7.
- Image detail tags and manifest/layers: Task 6 and Task 8.
- Layer build history via expandable rows: Task 2 and Task 6.
- Read-only MVP: all tasks avoid write operations.
- macOS/Windows local development: Task 1 and Task 9.

Known implementation caveat:

- Task 8 intentionally lands a basic live registry path. Depending on the registry authentication scheme, token-based Bearer auth may require follow-up work beyond basic auth. The UI must surface failures clearly rather than crashing.
