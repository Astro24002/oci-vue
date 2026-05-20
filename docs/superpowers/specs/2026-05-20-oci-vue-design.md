# OCI Vue Design

## Summary

OCI Vue is a desktop GUI client for browsing OCI-compatible registries. It targets macOS and Windows users who want to download and run a local binary tool, similar in spirit to Elasticvue but focused on OCI registries and artifacts.

The first version is read-only. It supports multiple saved registry connections, browsing images in a selected registry, viewing tags and manifest details for an image, and inspecting image layers and build history when available.

## Goals

- Provide a local desktop GUI for OCI-compatible registries.
- Support macOS and Windows users, with development first focused on local execution.
- Let users manually add and switch between multiple registry connections.
- Browse all images/repositories in the selected registry with pagination.
- Show each image's latest tag and summary metadata in the main list.
- Open an image detail page to inspect tags, manifests, layers, config, and raw JSON.
- Show per-layer build history when available, without cluttering the default view.
- Keep all connection data local. The app does not upload data to a cloud service.

## Non-Goals For MVP

- No push, pull, delete, retag, copy, or other write operations.
- No Docker Hub-specific behavior beyond standard registry compatibility.
- No SBOM analysis, signature verification, vulnerability scanning, or policy checks.
- No cloud sync, account system, or shared team configuration.
- No custom CA management in the first version.
- No production installer/signing/notarization/auto-update workflow in the first development phase.

## Technology

- Desktop framework: Tauri.
- Frontend: Vue 3 and TypeScript.
- Backend: Rust Tauri commands.
- Network access: Rust backend talks directly to OCI Distribution-compatible HTTP APIs.
- Local data: App configuration directory stores connection metadata and encrypted remembered credentials.

Tauri is preferred because the product should eventually feel like a small downloadable desktop utility on macOS and Windows. Vue provides the interface, while Rust handles local system capabilities, credential storage, registry API calls, and future write-operation boundaries.

## Registry Connections

Users manually create registry connections with:

- Connection name.
- Registry address.
- Username.
- Password or token.
- Optional remember-password setting.

The app supports multiple saved connections. The current registry is selected from a top-level dropdown. The app should support OCI-compatible private registry products such as Harbor, Nexus, and Artifactory when they expose standard registry APIs.

When users choose not to remember credentials, password/token values stay only in current session memory. When users choose to remember credentials, the app stores encrypted credential data locally. This is not a cloud-backed or strong vault model; it is local encryption to avoid plain-text credential storage.

## Main Image List

After a registry is selected, the main page displays images/repositories from that registry.

The main page contains:

- Top registry selector.
- Connection status.
- Manage registries entry.
- Search field for image/repository name.
- Paginated image table.
- Rows-per-page selector with 20, 50, and 100 options.
- Refresh action.

Each image row shows:

- Image/repository name.
- Latest tag.
- Digest summary when available.
- Media type.
- Size when available.
- Updated or created time when available.
- Detail action.

The main list should not show a repository tree, tag tree, layers, or manifest internals. It is a registry-level image catalog.

## Image Detail Page

Clicking an image opens the image detail page.

The detail page contains:

- Back to image list action.
- Image name.
- Registry name and address.
- Tag count.
- Refresh action.
- Left-side tag/reference list.
- Right-side selected tag detail.

The tag/reference list supports search and pagination. Selecting a tag loads its manifest and related metadata.

The selected tag detail shows:

- Reference name.
- Digest.
- Media type.
- Size when available.
- Created time when available.
- Schema version.
- Manifest overview.
- Layers list for image manifests.
- Config summary for image manifests.
- Raw manifest JSON.

The first version is read-only and should not show actions for delete, push, retag, or pull.

## Layer Build History

For OCI/Docker image manifests, the backend should fetch the image config blob when possible and parse config history.

The layers table shows layer summary fields by default:

- Layer index.
- Digest.
- Size.
- Media type.

Build history is not shown inline by default. Users can click a layer row to expand it and view the matched build command or history entry. This keeps the page compact while making build commands available when needed.

Some history entries may not map to real layers because image config can contain `empty_layer` entries for Dockerfile instructions such as `ENV`, `CMD`, or `WORKDIR`. If no matching history is available, the expanded row should show `history not available`. For non-image OCI artifacts, layer build history is not shown.

## Backend Modules

The Rust backend should be organized around these responsibilities:

- `ConnectionManager`: create, edit, delete, list, and select registry connections.
- `CredentialStore`: encrypt and decrypt remembered credentials stored in local app data.
- `RegistryClient`: low-level OCI Distribution API HTTP client.
- `ImageCatalogService`: list images/repositories for the selected registry and support pagination.
- `TagService`: list tags/references for a selected image.
- `ManifestService`: fetch manifests, image config, layers, and build history.

Read-only operations are implemented first. The backend should keep clear boundaries so future write operations can be added without changing the frontend page structure.

## Frontend Modules

The Vue frontend should include these pages or feature areas:

- Connection management page/dialog.
- Registry selector in the app shell.
- Image list page.
- Image detail page.
- Tag/reference list component.
- Manifest detail component.
- Layer table with expandable history rows.
- Raw JSON viewer.

State should be loaded on demand. The app should not build a complete local registry index in the first version.

## Data Flow

1. User selects or creates a registry connection.
2. Frontend calls a Tauri command to connect or validate access.
3. Rust backend loads connection settings and credentials.
4. Image list page requests paginated images for the selected registry.
5. User opens an image detail page.
6. Frontend requests tags/references for that image.
7. User selects a tag/reference.
8. Backend fetches the manifest.
9. If the manifest is an image manifest, backend fetches the config blob and parses history.
10. Frontend renders metadata, layers, config summary, and raw manifest JSON.
11. User clicks a layer row to expand build history for that layer.

## Error Handling

Connection errors:

- Invalid registry address: show a clear validation message.
- Network unreachable: show connection failure and keep the saved configuration.
- Authentication failure: show username/password/token error.
- TLS or certificate error: show certificate trust error. Custom CA management is out of scope for MVP.
- Incompatible registry API: show that the registry may not support standard OCI Distribution APIs.

Data loading errors:

- Image list failure: show page-level error and retry action.
- Tag list failure: show error in the tag list area and retry action.
- Manifest failure: show error in the detail area without losing tag list state.
- Config blob failure: still show manifest and layer summaries; show `history not available` for layer history.
- Missing optional fields such as size or created time: show `unknown`.

Pagination and search:

- Rows per page: 20, 50, and 100.
- Search filters image/repository names on the main list and tag/reference names on the detail page.
- Large registries should not be fully loaded into memory just to render the first page.

## Testing Strategy

Rust tests:

- Connection address validation.
- Credential encryption and decryption.
- OCI API response parsing.
- Manifest, config, layer, and history parsing.
- Error mapping from HTTP/API failures to UI-friendly error types.

Frontend tests:

- Connection form validation.
- Registry selection state.
- Image list pagination and search.
- Image detail tag selection.
- Layer row expansion for build history.
- Empty and error states.

Integration tests:

- Mock OCI Registry responses for image list, tag list, manifest, and config blob flows.
- Manual testing against Harbor, Nexus, and Artifactory compatible registries.

Cross-platform validation:

- Development phase verifies local run behavior on macOS and Windows.
- Installer, signing, notarization, and auto-update testing are deferred until the core app is stable.
