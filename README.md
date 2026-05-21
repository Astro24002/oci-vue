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
