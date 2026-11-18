// The whole app is the web front end; Rust only hosts the webview (desktop, Android and iOS share this entry point).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running hiaok-web");
}
