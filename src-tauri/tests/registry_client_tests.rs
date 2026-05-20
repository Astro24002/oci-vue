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
