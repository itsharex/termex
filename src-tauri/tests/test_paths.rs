use termex_lib::paths;

#[test]
fn test_is_portable_default_false() {
    // Without .portable marker next to test binary, should be false
    // Note: paths::init() uses OnceLock, only initializes once per process
    paths::init();
    // In test environment (cargo test), there's no .portable file
    assert!(!paths::is_portable());
}

#[test]
fn test_data_dir_is_not_empty() {
    paths::init();
    let dir = paths::data_dir();
    assert!(!dir.as_os_str().is_empty());
}

#[test]
fn test_db_path_ends_with_termex_db() {
    paths::init();
    let path = paths::db_path();
    assert!(path.ends_with("termex.db"));
}

#[test]
fn test_fonts_dir_ends_with_fonts() {
    paths::init();
    let path = paths::fonts_dir();
    assert!(path.ends_with("fonts"));
}

#[test]
fn test_recordings_dir_ends_with_recordings() {
    paths::init();
    let path = paths::recordings_dir();
    assert!(path.ends_with("recordings"));
}

#[test]
fn test_models_dir_ends_with_models() {
    paths::init();
    let path = paths::models_dir();
    assert!(path.ends_with("models"));
}

#[test]
fn test_bin_dir_ends_with_bin() {
    paths::init();
    let path = paths::bin_dir();
    assert!(path.ends_with("bin"));
}

#[test]
fn test_all_paths_consistent() {
    paths::init();
    // In installed mode, db_path parent should be data_dir
    let db = paths::db_path();
    let data = paths::data_dir();
    assert_eq!(db.parent().unwrap(), data);
}
