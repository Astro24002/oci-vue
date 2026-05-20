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
