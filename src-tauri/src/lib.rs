mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_templates,
            commands::get_ftgen_info,
            commands::load_template_meta,
            commands::save_project,
            commands::load_project,
            commands::list_projects,
            commands::compile_latex,
            commands::detect_compilers,
            commands::generate_tex,
            commands::get_config,
            commands::save_config,
            commands::init_ftgen_dir,
            commands::read_pdf_base64,
            commands::load_custom_sections,
            commands::save_custom_sections,
            commands::load_section_config,
            commands::save_section_config,
            commands::rename_project,
            commands::delete_project,
            commands::list_all_tags,
            commands::check_project_pdf,
            commands::export_pdf,
            commands::generate_template_preview,
            commands::check_preview_pdf,
            commands::list_logos,
            commands::import_logo,
            commands::export_project_bundle,
            commands::get_project_dir,
            commands::export_advanced,
            commands::show_in_explorer,
            commands::get_export_history,
            commands::save_export_record,
            commands::read_document_for_ai,
            commands::generate_with_ai,
            commands::list_ai_models,
            commands::import_project_image,
            commands::list_project_images,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application");
}
