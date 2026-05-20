use oci_vue_lib::registry_client::{
    build_catalog_url, build_manifest_url, build_tags_url, normalize_registry_url,
    parse_catalog_response, parse_tags_response,
};

#[test]
fn parses_catalog_response() {
    let raw = r#"{ "repositories": ["platform/api", "platform/web"] }"#;
    let repositories = parse_catalog_response(raw).expect("parse catalog");

    assert_eq!(
        repositories,
        vec!["platform/api".to_string(), "platform/web".to_string()]
    );
}

#[test]
fn parses_tags_response() {
    let raw = r#"{ "name": "platform/api", "tags": ["v1.8.2", "latest"] }"#;
    let tags = parse_tags_response(raw).expect("parse tags");

    assert_eq!(tags, vec!["v1.8.2".to_string(), "latest".to_string()]);
}

#[test]
fn missing_scheme_defaults_to_https() {
    let normalized =
        normalize_registry_url("registry.example.com").expect("normalize registry URL");

    assert_eq!(normalized, "https://registry.example.com");
}

#[test]
fn trailing_slash_normalizes_away() {
    let normalized =
        normalize_registry_url("https://registry.example.com/").expect("normalize registry URL");

    assert_eq!(normalized, "https://registry.example.com");
}

#[test]
fn v2_suffix_is_rejected() {
    let error =
        normalize_registry_url("https://registry.example.com/v2").expect_err("reject /v2 suffix");

    assert_eq!(error.to_string(), "invalid registry address");
}

#[test]
fn query_and_fragment_in_registry_url_are_rejected() {
    assert!(normalize_registry_url("https://registry.example.com?debug=true").is_err());
    assert!(normalize_registry_url("https://registry.example.com#fragment").is_err());
}

#[test]
fn repository_names_with_slashes_build_tags_url_path_hierarchy() {
    let url =
        build_tags_url("https://registry.example.com", "platform/api").expect("build tags URL");

    assert_eq!(
        url.as_str(),
        "https://registry.example.com/v2/platform/api/tags/list"
    );
}

#[test]
fn catalog_last_query_is_escaped() {
    let url = build_catalog_url(
        "https://registry.example.com",
        100,
        Some("platform/api & next"),
    )
    .expect("build catalog URL");

    assert_eq!(
        url.as_str(),
        "https://registry.example.com/v2/_catalog?n=100&last=platform%2Fapi+%26+next"
    );
}

#[test]
fn image_and_reference_query_or_fragment_injection_is_rejected() {
    assert!(build_tags_url("https://registry.example.com", "platform/api?evil=true").is_err());
    assert!(build_tags_url("https://registry.example.com", "platform/api#evil").is_err());
    assert!(build_manifest_url(
        "https://registry.example.com",
        "platform/api",
        "latest?evil=true"
    )
    .is_err());
    assert!(build_manifest_url(
        "https://registry.example.com",
        "platform/api",
        "latest#evil"
    )
    .is_err());
}
