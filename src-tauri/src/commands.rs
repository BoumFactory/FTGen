use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TemplateVariable {
    pub name: String,
    #[serde(rename = "type")]
    pub var_type: String,
    pub description: String,
    #[serde(default)]
    pub default_value: String,
    #[serde(default)]
    pub group: String,
    #[serde(default)]
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TemplateSection {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub variable: String,
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub fa_icon: String,
    #[serde(default)]
    pub frame_color: String,
    #[serde(default)]
    pub bg_color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BodyConfig {
    #[serde(default)]
    pub box_options: String,
    #[serde(default)]
    pub title_template: String,
    #[serde(default)]
    pub title_options: String,
    #[serde(default)]
    pub raster_options: String,
    #[serde(default)]
    pub font_cmd: String,
    #[serde(default)]
    pub default_frame_color: String,
    #[serde(default)]
    pub style: String,
    #[serde(default)]
    pub title_color: String,
    #[serde(default)]
    pub rule_color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TemplateMeta {
    pub name: String,
    pub description: String,
    pub compiler: String,
    pub variables: Vec<TemplateVariable>,
    pub sections: Vec<TemplateSection>,
    #[serde(default)]
    pub logos: Vec<String>,
    #[serde(default)]
    pub body_config: Option<BodyConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TemplateInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tex_path: String,
    pub meta_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectData {
    pub template_id: String,
    pub title: String,
    pub values: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
    // Tous les champs additionnels du frontend (custom_sections, linked_documents,
    // selected_profile, section_overrides, disabled_sections, etc.)
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub ftgen_path: String,
    pub lualatex_path: String,
    pub compile_on_save: bool,
    pub debounce_ms: u32,
    pub preview_mode: String,
    pub theme: String,
    pub editor_font_size: u32,
    #[serde(default = "default_template")]
    pub default_template: String,
    #[serde(default = "default_sidebar")]
    pub default_sidebar: String,
    #[serde(default = "default_logo_left")]
    pub logo_left: String,
    #[serde(default = "default_logo_right")]
    pub logo_right: String,
    #[serde(default = "default_ai_provider")]
    pub ai_provider: String,
    #[serde(default)]
    pub ai_api_key: String,
    #[serde(default = "default_ai_model")]
    pub ai_model: String,
    #[serde(default = "default_ai_endpoint")]
    pub ai_endpoint: String,
    #[serde(default = "default_compiler")]
    pub compiler: String,
    #[serde(default = "default_font_package")]
    pub font_package: String,
}

fn default_template() -> String {
    "template_academique".to_string()
}

fn default_sidebar() -> String {
    "left".to_string()
}

fn default_logo_left() -> String {
    "logo-republique-francaise.png".to_string()
}

fn default_logo_right() -> String {
    "logo_gt_ia_maths.png".to_string()
}

fn default_ai_provider() -> String {
    "anthropic".to_string()
}

fn default_ai_model() -> String {
    "claude-sonnet-4-20250514".to_string()
}

fn default_ai_endpoint() -> String {
    "".to_string()
}

fn default_compiler() -> String {
    "auto".to_string()
}

fn default_font_package() -> String {
    "fourier".to_string()
}

/// Retourne le code LaTeX correspondant au nom de police choisi
fn font_package_to_latex(font_name: &str) -> String {
    match font_name {
        "fourier" => r"\usepackage{fourier}".to_string(),
        "erewhon" => "\\usepackage{erewhon}\n\\usepackage[erewhon]{newtxmath}".to_string(),
        "newpx" => "\\usepackage{newpxtext}\n\\usepackage{newpxmath}".to_string(),
        "newtx" => "\\usepackage{newtxtext}\n\\usepackage{newtxmath}".to_string(),
        "lmodern" => r"\usepackage{lmodern}".to_string(),
        "libertinus" => "\\usepackage{libertinus}\n\\usepackage{libertinust1math}".to_string(),
        "kpfonts" => r"\usepackage{kpfonts}".to_string(),
        "scholax" => "\\usepackage{scholax}\n\\usepackage[scholax]{newtxmath}".to_string(),
        "ebgaramond" => r"\usepackage{ebgaramond}".to_string(),
        "mathdesign-utopia" => r"\usepackage[adobe-utopia]{mathdesign}".to_string(),
        _ => r"\usepackage{lmodern}".to_string(),
    }
}


impl Default for AppConfig {
    fn default() -> Self {
        Self {
            ftgen_path: ".ftgen".to_string(),
            lualatex_path: "auto".to_string(),
            compile_on_save: true,
            debounce_ms: 2000,
            preview_mode: "tab".to_string(),
            theme: "dark".to_string(),
            editor_font_size: 14,
            default_template: "template_academique".to_string(),
            default_sidebar: "left".to_string(),
            logo_left: "logo-republique-francaise.png".to_string(),
            logo_right: "logo_gt_ia_maths.png".to_string(),
            ai_provider: "anthropic".to_string(),
            ai_api_key: String::new(),
            ai_model: "claude-sonnet-4-20250514".to_string(),
            ai_endpoint: String::new(),
            compiler: "auto".to_string(),
            font_package: "fourier".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompileResult {
    pub success: bool,
    pub pdf_path: String,
    pub log: String,
    pub errors: Vec<String>,
    #[serde(default)]
    pub compiler_used: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportOptions {
    pub mode: String,           // "zip_all" | "no_zip" | "pdf_separate"
    pub pdf_path: String,
    pub destination_dir: String,
    pub base_name: String,      // e.g. "fiche_technique_decouvrir_les_fractions"
    pub linked_files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportRecord {
    pub date: String,
    pub destination: String,
    pub mode: String,
    pub files: Vec<String>,
    pub base_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub exported_files: Vec<String>,
    pub destination: String,
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

fn get_ftgen_dir(app: &tauri::AppHandle) -> PathBuf {
    let config_path = get_config_path(app);
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                let p = PathBuf::from(&config.ftgen_path);
                if p.is_absolute() {
                    return p;
                }
            }
        }
    }
    // Chercher un dossier .ftgen en remontant depuis l'EXÉCUTABLE.
    // Indispensable sur macOS : une .app double-cliquée a pour répertoire
    // courant "/", donc on ne peut pas se fier à current_dir(). En remontant
    // depuis l'exe, on couvre :
    //   - Windows : .ftgen à côté de ftgen.exe
    //   - macOS   : .ftgen à côté de FTGen.app (exe = .../FTGen.app/Contents/MacOS/FTGen)
    //   - dev     : .ftgen à la racine du projet (au-dessus de src-tauri/target/…)
    if let Ok(exe) = std::env::current_exe() {
        for ancestor in exe.ancestors() {
            let candidate = ancestor.join(".ftgen");
            if candidate.is_dir() {
                return candidate;
            }
        }
    }

    // Repli : répertoire courant (comportement historique).
    let cwd = std::env::current_dir().unwrap_or_default();
    let project_root = if cwd.ends_with("src-tauri") {
        cwd.parent().unwrap_or(&cwd).to_path_buf()
    } else {
        cwd
    };
    project_root.join(".ftgen")
}

fn get_config_path(app: &tauri::AppHandle) -> PathBuf {
    let app_dir = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    app_dir.join("config.json")
}

// Clé XOR pour obfuscation de la clé API (pas de la cryptographie forte,
// juste une protection contre la lecture accidentelle du config.json)
const OBFUSCATION_KEY: &[u8] = b"FTGen2025-ac-reims";

fn obfuscate_api_key(plain: &str) -> String {
    if plain.is_empty() {
        return String::new();
    }
    use base64::Engine;
    let xored: Vec<u8> = plain
        .as_bytes()
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ OBFUSCATION_KEY[i % OBFUSCATION_KEY.len()])
        .collect();
    format!("xor1:{}", base64::engine::general_purpose::STANDARD.encode(&xored))
}

fn deobfuscate_api_key(stored: &str) -> String {
    if stored.is_empty() {
        return String::new();
    }
    if let Some(encoded) = stored.strip_prefix("xor1:") {
        use base64::Engine;
        if let Ok(xored) = base64::engine::general_purpose::STANDARD.decode(encoded) {
            let plain: Vec<u8> = xored
                .iter()
                .enumerate()
                .map(|(i, b)| b ^ OBFUSCATION_KEY[i % OBFUSCATION_KEY.len()])
                .collect();
            return String::from_utf8(plain).unwrap_or_default();
        }
    }
    // Pas de préfixe xor1: → clé en clair (migration depuis ancienne version)
    stored.to_string()
}

fn get_config_from_app(app: &tauri::AppHandle) -> AppConfig {
    let config_path = get_config_path(app);
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(mut config) = serde_json::from_str::<AppConfig>(&content) {
                config.ai_api_key = deobfuscate_api_key(&config.ai_api_key);
                return config;
            }
        }
    }
    AppConfig::default()
}

fn find_latex_compiler(name: &str) -> Option<String> {
    let known_bases = vec![
        r"C:\Program Files\MiKTeX\miktex\bin\x64",
        r"C:\texlive\2025\bin\windows",
        r"C:\texlive\2024\bin\windows",
    ];
    let exe_name = format!("{}.exe", name);
    for base in &known_bases {
        let p = format!("{}\\{}", base, exe_name);
        if Path::new(&p).exists() {
            return Some(p);
        }
    }
    // Essayer dans le PATH
    if Command::new(name).arg("--version").output().is_ok() {
        return Some(name.to_string());
    }
    None
}

fn find_tectonic(app: Option<&tauri::AppHandle>) -> Option<String> {
    // 1. Chercher le sidecar bundlé avec l'app
    if let Some(app) = app {
        if let Ok(resource_dir) = app.path().resource_dir() {
            let sidecar = resource_dir.join("binaries").join("tectonic.exe");
            if sidecar.exists() {
                return Some(sidecar.to_string_lossy().to_string());
            }
        }
        // Chercher à côté de l'exécutable
        if let Ok(exe_dir) = std::env::current_exe() {
            if let Some(dir) = exe_dir.parent() {
                let sidecar = dir.join("tectonic.exe");
                if sidecar.exists() {
                    return Some(sidecar.to_string_lossy().to_string());
                }
            }
        }
    }
    // 2. Chercher dans le PATH
    if Command::new("tectonic").arg("--version").output().is_ok() {
        return Some("tectonic".to_string());
    }
    // 3. Chercher dans AppData
    let appdata = std::env::var("APPDATA").unwrap_or_default();
    let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
    for dir in &[&appdata, &local] {
        let p = format!("{}\\tectonic\\tectonic.exe", dir);
        if Path::new(&p).exists() {
            return Some(p);
        }
    }
    None
}

/// Résout le compilateur à utiliser selon la config
fn resolve_compiler(config: &AppConfig, app: Option<&tauri::AppHandle>) -> (String, Vec<String>) {
    match config.compiler.as_str() {
        "tectonic" => {
            if let Some(path) = find_tectonic(app) {
                return (path, vec![]);
            }
            // Fallback vers lualatex si tectonic indisponible
            if let Some(path) = find_latex_compiler("lualatex") {
                return (path, vec![]);
            }
            ("tectonic".to_string(), vec![])
        }
        "lualatex" | "pdflatex" | "xelatex" => {
            if config.lualatex_path != "auto" && config.compiler == "lualatex" {
                return (config.lualatex_path.clone(), vec![]);
            }
            if let Some(path) = find_latex_compiler(&config.compiler) {
                (path, vec![])
            } else {
                (config.compiler.clone(), vec![])
            }
        }
        _ => {
            // "auto" : tectonic d'abord, puis lualatex, puis pdflatex
            if let Some(path) = find_tectonic(app) {
                return (path, vec![]);
            }
            if let Some(path) = find_latex_compiler("lualatex") {
                return (path, vec![]);
            }
            if let Some(path) = find_latex_compiler("pdflatex") {
                return (path, vec![]);
            }
            ("lualatex".to_string(), vec![])
        }
    }
}

fn extract_latex_errors(log: &str) -> Vec<String> {
    let mut errors = Vec::new();
    for line in log.lines() {
        if line.starts_with('!') || line.contains("Fatal error") {
            errors.push(line.to_string());
        }
    }
    errors
}

// ═══════════════════════════════════════════════════════════════
// Commandes Tauri
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn init_ftgen_dir(app: tauri::AppHandle) -> Result<String, String> {
    let ftgen_dir = get_ftgen_dir(&app);
    let dirs = ["templates", "logos", "projects", "snippets"];
    for d in &dirs {
        let dir_path = ftgen_dir.join(d);
        fs::create_dir_all(&dir_path)
            .map_err(|e| format!("Erreur création {}: {}", d, e))?;
    }
    let config_file = ftgen_dir.join("config.json");
    if !config_file.exists() {
        let default_config = AppConfig::default();
        let json = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("Erreur sérialisation config: {}", e))?;
        fs::write(&config_file, json)
            .map_err(|e| format!("Erreur écriture config: {}", e))?;
    }
    Ok(ftgen_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_templates(app: tauri::AppHandle) -> Result<Vec<TemplateInfo>, String> {
    let templates_dir = get_ftgen_dir(&app).join("templates");
    if !templates_dir.exists() {
        return Ok(vec![]);
    }
    let mut templates = Vec::new();
    let entries = fs::read_dir(&templates_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("tex") {
            let stem = path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let meta_path = templates_dir.join(format!("{}.meta.json", stem));
            if !meta_path.exists() {
                continue;
            }
            if let Ok(content) = fs::read_to_string(&meta_path) {
                if let Ok(meta) = serde_json::from_str::<TemplateMeta>(&content) {
                    templates.push(TemplateInfo {
                        id: stem.clone(),
                        name: meta.name,
                        description: meta.description,
                        tex_path: path.to_string_lossy().to_string(),
                        meta_path: meta_path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }
    Ok(templates)
}

#[tauri::command]
pub async fn load_template_meta(meta_path: String) -> Result<TemplateMeta, String> {
    let content = fs::read_to_string(&meta_path)
        .map_err(|e| format!("Erreur lecture {}: {}", meta_path, e))?;
    serde_json::from_str(&content).map_err(|e| format!("Erreur parsing meta: {}", e))
}

#[tauri::command]
pub async fn save_project(
    app: tauri::AppHandle,
    project_id: String,
    data: ProjectData,
) -> Result<String, String> {
    let project_dir = get_ftgen_dir(&app).join("projects").join(&project_id);
    fs::create_dir_all(&project_dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    let data_path = project_dir.join("data.json");
    fs::write(&data_path, json).map_err(|e| e.to_string())?;
    Ok(project_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn load_project(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<ProjectData, String> {
    let data_path = get_ftgen_dir(&app)
        .join("projects")
        .join(&project_id)
        .join("data.json");
    let content = fs::read_to_string(&data_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_projects(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let projects_dir = get_ftgen_dir(&app).join("projects");
    if !projects_dir.exists() {
        return Ok(vec![]);
    }
    let mut projects = Vec::new();
    let entries = fs::read_dir(&projects_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let data_path = path.join("data.json");
            if data_path.exists() {
                if let Ok(content) = fs::read_to_string(&data_path) {
                    if let Ok(mut data) = serde_json::from_str::<serde_json::Value>(&content) {
                        // Injecter id et path dans l'objet
                        if let Some(obj) = data.as_object_mut() {
                            obj.insert("id".to_string(), serde_json::json!(
                                path.file_name().unwrap_or_default().to_string_lossy().to_string()
                            ));
                            obj.insert("path".to_string(), serde_json::json!(
                                path.to_string_lossy().to_string()
                            ));
                        }
                        projects.push(data);
                    }
                }
            }
        }
    }
    Ok(projects)
}

#[tauri::command]
pub async fn list_all_tags(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let projects_dir = get_ftgen_dir(&app).join("projects");
    if !projects_dir.exists() {
        return Ok(vec![]);
    }
    let mut all_tags = std::collections::BTreeSet::new();
    let entries = fs::read_dir(&projects_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let data_path = entry.path().join("data.json");
        if data_path.exists() {
            if let Ok(content) = fs::read_to_string(&data_path) {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                    // Collecter tags, resource_types, themes, niveaux, custom_tags
                    for field in &["tags", "custom_tags", "resource_types", "themes", "niveaux"] {
                        if let Some(arr) = data.get(*field).and_then(|v| v.as_array()) {
                            for item in arr {
                                if let Some(s) = item.as_str() {
                                    if !s.is_empty() {
                                        all_tags.insert(s.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(all_tags.into_iter().collect())
}

#[tauri::command]
pub async fn generate_tex(
    app: tauri::AppHandle,
    project_id: String,
    template_tex_path: String,
    mut values: HashMap<String, serde_json::Value>,
) -> Result<String, String> {
    let template_content = fs::read_to_string(&template_tex_path)
        .map_err(|e| format!("Erreur lecture template: {}", e))?;

    let mut output = template_content;

    // --- Injection de la police depuis la config ---
    let config = get_config_from_app(&app);
    let font_latex = font_package_to_latex(&config.font_package);
    output = output.replace("%%FONT_PACKAGE%%", &font_latex);

    // --- Injection des logos depuis la config ---
    if !values.contains_key("LOGO_LEFT") {
        values.insert("LOGO_LEFT".to_string(), serde_json::Value::String(config.logo_left.clone()));
    }
    if !values.contains_key("LOGO_RIGHT") {
        values.insert("LOGO_RIGHT".to_string(), serde_json::Value::String(config.logo_right.clone()));
    }

    // --- Sidebar position logic ---
    let sidebar_pos = match values.get("SIDEBAR_POSITION") {
        Some(serde_json::Value::String(s)) => s.clone(),
        _ => "left".to_string(),
    };

    if sidebar_pos == "right" {
        values.insert("SIDEBAR_RIGHT".to_string(), serde_json::Value::String("1".to_string()));
        values.insert("SIDEBAR_LEFT".to_string(), serde_json::Value::String("".to_string()));
        // Swap margins
        let ml = values.get("MARGIN_LEFT").cloned().unwrap_or(serde_json::Value::String("1.2cm".to_string()));
        let mr = values.get("MARGIN_RIGHT").cloned().unwrap_or(serde_json::Value::String("5.3cm".to_string()));
        values.insert("MARGIN_LEFT".to_string(), mr);
        values.insert("MARGIN_RIGHT".to_string(), ml);
    } else {
        values.insert("SIDEBAR_LEFT".to_string(), serde_json::Value::String("1".to_string()));
        values.insert("SIDEBAR_RIGHT".to_string(), serde_json::Value::String("".to_string()));
    }

    // 1. Remplacement des placeholders {{VAR}}
    let re = regex::Regex::new(r"\{\{(\w+)\}\}").map_err(|e| e.to_string())?;
    output = re
        .replace_all(&output, |caps: &regex::Captures| {
            let key = &caps[1];
            match values.get(key) {
                Some(serde_json::Value::String(s)) => s.clone(),
                Some(serde_json::Value::Number(n)) => n.to_string(),
                Some(serde_json::Value::Bool(b)) => {
                    if *b { "1".to_string() } else { "0".to_string() }
                }
                _ => format!("{{{{{}}}}}", key),
            }
        })
        .to_string();

    // 2. Blocs conditionnels %%IF:VAR%%...%%ENDIF:VAR%%
    // Parsing manuel (le crate regex ne supporte pas les backreferences)
    loop {
        let if_marker = "%%IF:";
        let pos = match output.find(if_marker) {
            Some(p) => p,
            None => break,
        };
        let var_start = pos + if_marker.len();
        let var_end = match output[var_start..].find("%%") {
            Some(p) => var_start + p,
            None => break,
        };
        let var_name = output[var_start..var_end].to_string();
        let mut block_start = var_end + 2; // Après %%
        // Sauter le \n optionnel après %%IF:VAR%%
        if output.as_bytes().get(block_start) == Some(&b'\n') {
            block_start += 1;
        }
        let endif_marker = format!("%%ENDIF:{}%%", var_name);
        let endif_pos = match output.find(&endif_marker) {
            Some(p) => p,
            None => break,
        };
        let block_content = output[block_start..endif_pos].to_string();
        let mut total_end = endif_pos + endif_marker.len();
        // Sauter le \n optionnel après %%ENDIF:VAR%%
        if output.as_bytes().get(total_end) == Some(&b'\n') {
            total_end += 1;
        }

        let is_present = match values.get(&var_name) {
            Some(serde_json::Value::String(s)) => !s.trim().is_empty(),
            Some(serde_json::Value::Number(n)) => n.as_i64().unwrap_or(0) != 0,
            Some(serde_json::Value::Bool(b)) => *b,
            _ => false,
        };
        let replacement = if is_present { block_content } else { String::new() };
        output = format!("{}{}{}", &output[..pos], replacement, &output[total_end..]);
    }

    // 3. Remplacement des placeholders spéciaux
    // %%CUSTOM_SECTIONS%%
    if let Some(serde_json::Value::String(custom)) = values.get("__CUSTOM_SECTIONS__") {
        output = output.replace("%%CUSTOM_SECTIONS%%", custom);
    } else {
        output = output.replace("%%CUSTOM_SECTIONS%%", "");
    }
    // %%BODY_CONTENT%% — contenu principal généré par l'app
    if let Some(serde_json::Value::String(body)) = values.get("__BODY_CONTENT__") {
        output = output.replace("%%BODY_CONTENT%%", body);
    } else {
        output = output.replace("%%BODY_CONTENT%%", "");
    }
    // %%SIDEBAR_CONTENT%% — métadonnées sidebar générées par l'app
    if let Some(serde_json::Value::String(sidebar)) = values.get("__SIDEBAR_CONTENT__") {
        output = output.replace("%%SIDEBAR_CONTENT%%", sidebar);
    } else {
        output = output.replace("%%SIDEBAR_CONTENT%%", "");
    }

    let ftgen_dir = get_ftgen_dir(&app);
    let project_dir = ftgen_dir.join("projects").join(&project_id);
    fs::create_dir_all(&project_dir).map_err(|e| e.to_string())?;

    // Remplacer les chemins relatifs ../logos/ par le chemin absolu
    let logos_dir = ftgen_dir.join("logos");
    if logos_dir.exists() {
        let logos_abs = logos_dir.to_string_lossy().replace('\\', "/");
        output = output.replace("../logos/", &format!("{}/", logos_abs));
    }

    // Remplacer les chemins relatifs images/ par le chemin absolu du projet
    let images_dir = project_dir.join("images");
    if images_dir.exists() {
        let images_abs = images_dir.to_string_lossy().replace('\\', "/");
        output = output.replace("images/", &format!("{}/", images_abs));
    }

    // Dériver l'ID du template depuis le chemin (stem du fichier .tex)
    let template_stem = Path::new(&template_tex_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let output_filename = format!("output_{}.tex", template_stem);
    let output_path = project_dir.join(&output_filename);
    fs::write(&output_path, &output).map_err(|e| e.to_string())?;

    Ok(output_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn compile_latex(
    app: tauri::AppHandle,
    tex_path: String,
) -> Result<CompileResult, String> {
    let tex_file = Path::new(&tex_path);
    let output_dir = tex_file.parent().unwrap_or(Path::new("."));
    let config = get_config_from_app(&app);
    let (compiler_path, _) = resolve_compiler(&config, Some(&app));

    let is_tectonic = compiler_path.contains("tectonic");

    let args: Vec<String> = if is_tectonic {
        vec![
            "--outdir".to_string(),
            output_dir.to_string_lossy().to_string(),
            tex_path.clone(),
        ]
    } else {
        vec![
            "-interaction=nonstopmode".to_string(),
            format!("-output-directory={}", output_dir.to_string_lossy()),
            tex_path.clone(),
        ]
    };

    #[cfg(target_os = "windows")]
    let result = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new(&compiler_path)
            .args(&args)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Erreur lancement {} ({}): {}",
                if is_tectonic { "Tectonic" } else { "LaTeX" }, compiler_path, e))?
    };
    #[cfg(not(target_os = "windows"))]
    let result = Command::new(&compiler_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Erreur lancement {} ({}): {}",
            if is_tectonic { "Tectonic" } else { "LaTeX" }, compiler_path, e))?;

    let log = String::from_utf8_lossy(&result.stdout).to_string();
    let stderr = String::from_utf8_lossy(&result.stderr).to_string();
    let full_log = format!("{}\n{}", log, stderr);
    let errors = extract_latex_errors(&full_log);

    let pdf_path = tex_file.with_extension("pdf");

    let compiler_name = if is_tectonic {
        format!("Tectonic ({})", compiler_path)
    } else {
        let name = Path::new(&compiler_path).file_stem()
            .unwrap_or_default().to_string_lossy().to_string();
        format!("{} ({})", name, compiler_path)
    };

    Ok(CompileResult {
        success: result.status.success() && pdf_path.exists(),
        pdf_path: pdf_path.to_string_lossy().to_string(),
        log: full_log,
        errors,
        compiler_used: compiler_name,
    })
}

#[tauri::command]
pub async fn detect_compilers(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let mut result = serde_json::Map::new();
    result.insert("tectonic".to_string(), serde_json::Value::Bool(find_tectonic(Some(&app)).is_some()));
    result.insert("lualatex".to_string(), serde_json::Value::Bool(find_latex_compiler("lualatex").is_some()));
    result.insert("pdflatex".to_string(), serde_json::Value::Bool(find_latex_compiler("pdflatex").is_some()));
    result.insert("xelatex".to_string(), serde_json::Value::Bool(find_latex_compiler("xelatex").is_some()));
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
pub async fn get_config(app: tauri::AppHandle) -> Result<AppConfig, String> {
    let config_path = get_config_path(&app);
    if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        let mut config: AppConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        config.ai_api_key = deobfuscate_api_key(&config.ai_api_key);
        Ok(config)
    } else {
        Ok(AppConfig::default())
    }
}

#[tauri::command]
pub async fn read_pdf_base64(pdf_path: String) -> Result<String, String> {
    let bytes = fs::read(&pdf_path)
        .map_err(|e| format!("Erreur lecture PDF {}: {}", pdf_path, e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

/// Vérifie si un PDF compilé existe pour un projet et retourne son chemin
/// Cherche d'abord output_{template_id}.pdf, puis output.pdf en fallback
#[tauri::command]
pub async fn check_project_pdf(
    app: tauri::AppHandle,
    project_id: String,
    template_id: Option<String>,
) -> Result<Option<String>, String> {
    let project_dir = get_ftgen_dir(&app).join("projects").join(&project_id);

    // Chercher le PDF spécifique au template
    if let Some(ref tid) = template_id {
        let pdf_path = project_dir.join(format!("output_{}.pdf", tid));
        if pdf_path.exists() {
            return Ok(Some(pdf_path.to_string_lossy().to_string()));
        }
    }

    // Fallback : ancien format output.pdf (rétrocompatibilité)
    let legacy_path = project_dir.join("output.pdf");
    if legacy_path.exists() {
        Ok(Some(legacy_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

/// Vérifie si un PDF d'aperçu existe pour un template (dans le dossier templates/)
#[tauri::command]
pub async fn check_preview_pdf(
    app: tauri::AppHandle,
    template_id: String,
    #[allow(unused_variables)]
    sidebar_position: String,
) -> Result<Option<String>, String> {
    let preview_path = get_ftgen_dir(&app)
        .join("templates")
        .join(format!("{}.pdf", template_id));
    if preview_path.exists() {
        Ok(Some(preview_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

/// Exporte le PDF compilé en le copiant vers un emplacement choisi par l'utilisateur
#[tauri::command]
pub async fn export_pdf(
    source_path: String,
    destination_path: String,
) -> Result<(), String> {
    let src = Path::new(&source_path);
    if !src.exists() {
        return Err(format!("PDF source introuvable : {}", source_path));
    }
    // S'assurer que l'extension .pdf est présente
    let dest = if !destination_path.to_lowercase().ends_with(".pdf") {
        format!("{}.pdf", destination_path)
    } else {
        destination_path.clone()
    };
    // Créer le dossier parent si nécessaire
    if let Some(parent) = Path::new(&dest).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Erreur création dossier destination: {}", e))?;
    }
    fs::copy(src, &dest)
        .map_err(|e| format!("Erreur export PDF: {} → {}: {}", source_path, dest, e))?;
    Ok(())
}

/// Exporte le PDF + les fichiers associés dans un dossier
#[tauri::command]
pub async fn export_project_bundle(
    pdf_path: String,
    destination_dir: String,
    linked_files: Vec<String>,
) -> Result<Vec<String>, String> {
    let dest = Path::new(&destination_dir);
    fs::create_dir_all(dest).map_err(|e| format!("Erreur création dossier: {}", e))?;

    let mut exported = Vec::new();
    let mut warnings = Vec::new();

    // Copier le PDF (obligatoire — erreur si introuvable)
    let pdf_src = Path::new(&pdf_path);
    if !pdf_src.exists() {
        return Err(format!("PDF introuvable : {}", pdf_path));
    }
    let pdf_name = pdf_src.file_name().unwrap_or_default();
    let pdf_dest = dest.join(pdf_name);
    fs::copy(&pdf_src, &pdf_dest)
        .map_err(|e| format!("Erreur copie PDF: {}", e))?;
    exported.push(pdf_dest.to_string_lossy().to_string());

    // Copier les fichiers liés
    for file_path in &linked_files {
        let src = Path::new(file_path);
        if !src.exists() {
            warnings.push(format!("Fichier lié introuvable (ignoré) : {}", file_path));
            continue;
        }
        let filename = src.file_name().unwrap_or_default();
        let file_dest = dest.join(filename);
        // Gérer les doublons de noms
        let final_dest = if file_dest.exists() {
            let stem = src.file_stem().unwrap_or_default().to_string_lossy().to_string();
            let ext = src.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
            let mut counter = 1;
            loop {
                let candidate = dest.join(format!("{}_{}.{}", stem, counter, ext));
                if !candidate.exists() { break candidate; }
                counter += 1;
            }
        } else {
            file_dest
        };
        fs::copy(&src, &final_dest)
            .map_err(|e| format!("Erreur copie {}: {}", file_path, e))?;
        exported.push(final_dest.to_string_lossy().to_string());
    }

    if !warnings.is_empty() {
        eprintln!("[export_project_bundle] Avertissements :\n{}", warnings.join("\n"));
    }

    Ok(exported)
}

#[tauri::command]
pub async fn generate_template_preview(
    app: tauri::AppHandle,
    template_id: String,
    sidebar_position: String,
) -> Result<String, String> {
    let ftgen_dir = get_ftgen_dir(&app);
    let templates_dir = ftgen_dir.join("templates");
    let tex_path = templates_dir.join(format!("{}.tex", template_id));

    if !tex_path.exists() {
        return Err(format!("Template {} introuvable", template_id));
    }

    // Load preview data
    let preview_data_path = ftgen_dir.join("preview_data.json");
    let preview_values: HashMap<String, serde_json::Value> = if preview_data_path.exists() {
        let content = fs::read_to_string(&preview_data_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    } else {
        HashMap::new()
    };

    // Set sidebar position
    let mut values = preview_values;
    values.insert("SIDEBAR_POSITION".to_string(), serde_json::Value::String(sidebar_position.clone()));

    // Generate tex in a temporary project directory
    let preview_id = format!("__preview_{}", template_id);

    // Use generate_tex logic
    let tex_output = generate_tex(
        app.clone(),
        preview_id.clone(),
        tex_path.to_string_lossy().to_string(),
        values,
    ).await?;

    // Compile
    let result = compile_latex(app.clone(), tex_output.clone()).await?;

    if result.success {
        // Copy PDF to templates directory (alongside the .tex)
        let src_pdf = Path::new(&tex_output).with_extension("pdf");
        let dest_pdf = templates_dir.join(format!("{}.pdf", template_id));
        fs::copy(&src_pdf, &dest_pdf).map_err(|e| e.to_string())?;

        // Clean up preview project dir
        let preview_project = get_ftgen_dir(&app).join("projects").join(&preview_id);
        let _ = fs::remove_dir_all(&preview_project);

        Ok(dest_pdf.to_string_lossy().to_string())
    } else {
        Err(format!("Erreur compilation preview: {:?}", result.errors))
    }
}

// ═══════════════════════════════════════════════════════════════
// Logos
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Serialize)]
pub struct LogoInfo {
    pub filename: String,
    pub path: String,
}

/// Liste les fichiers image disponibles dans .ftgen/logos/
#[tauri::command]
pub async fn list_logos(app: tauri::AppHandle) -> Result<Vec<LogoInfo>, String> {
    let logos_dir = get_ftgen_dir(&app).join("logos");
    if !logos_dir.exists() {
        return Ok(vec![]);
    }
    let mut logos = Vec::new();
    let entries = fs::read_dir(&logos_dir).map_err(|e| e.to_string())?;
    let exts = ["png", "jpg", "jpeg", "svg", "pdf"];
    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if exts.contains(&ext.to_lowercase().as_str()) {
                logos.push(LogoInfo {
                    filename: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }
    logos.sort_by(|a, b| a.filename.cmp(&b.filename));
    Ok(logos)
}

/// Importe un fichier image dans .ftgen/logos/
#[tauri::command]
pub async fn import_logo(app: tauri::AppHandle, source_path: String) -> Result<LogoInfo, String> {
    let logos_dir = get_ftgen_dir(&app).join("logos");
    fs::create_dir_all(&logos_dir).map_err(|e| e.to_string())?;
    let src = Path::new(&source_path);
    let filename = src.file_name()
        .ok_or("Nom de fichier invalide")?
        .to_string_lossy()
        .to_string();
    let dest = logos_dir.join(&filename);
    fs::copy(&src, &dest).map_err(|e| format!("Erreur copie logo: {}", e))?;
    Ok(LogoInfo {
        filename,
        path: dest.to_string_lossy().to_string(),
    })
}

// ═══════════════════════════════════════════════════════════════
// Briques personnalisées (stockage global)
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn load_custom_sections(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let path = get_ftgen_dir(&app).join("snippets").join("custom_sections.json");
    if !path.exists() {
        return Ok(serde_json::json!([]));
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_custom_sections(
    app: tauri::AppHandle,
    sections: serde_json::Value,
) -> Result<(), String> {
    let dir = get_ftgen_dir(&app).join("snippets");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&sections).map_err(|e| e.to_string())?;
    fs::write(dir.join("custom_sections.json"), json).map_err(|e| e.to_string())?;
    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// Configuration des sections (overrides, ordre, masquage)
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn load_section_config(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let path = get_ftgen_dir(&app).join("section_overrides.json");
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_section_config(
    app: tauri::AppHandle,
    config: serde_json::Value,
) -> Result<(), String> {
    let ftgen_dir = get_ftgen_dir(&app);
    fs::create_dir_all(&ftgen_dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(ftgen_dir.join("section_overrides.json"), json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn rename_project(
    app: tauri::AppHandle,
    old_id: String,
    new_id: String,
) -> Result<String, String> {
    let projects_dir = get_ftgen_dir(&app).join("projects");
    let old_path = projects_dir.join(&old_id);
    let new_path = projects_dir.join(&new_id);
    if !old_path.exists() {
        return Err(format!("Projet '{}' introuvable", old_id));
    }
    if new_path.exists() {
        return Err(format!("Un projet '{}' existe déjà", new_id));
    }
    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Erreur renommage: {}", e))?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_project(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    let project_path = get_ftgen_dir(&app).join("projects").join(&project_id);
    if !project_path.exists() {
        return Err(format!("Projet '{}' introuvable", project_id));
    }
    fs::remove_dir_all(&project_path)
        .map_err(|e| format!("Erreur suppression: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_project_dir(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<String, String> {
    let project_path = get_ftgen_dir(&app).join("projects").join(&project_id);
    Ok(project_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_project_image(
    app: tauri::AppHandle,
    project_id: String,
    source_path: String,
) -> Result<String, String> {
    let project_dir = get_ftgen_dir(&app).join("projects").join(&project_id);
    let images_dir = project_dir.join("images");
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    let source = Path::new(&source_path);
    let filename = source
        .file_name()
        .ok_or("Nom de fichier invalide")?
        .to_string_lossy()
        .to_string();
    let dest = images_dir.join(&filename);
    fs::copy(source, &dest).map_err(|e| format!("Erreur copie image: {}", e))?;

    Ok(filename)
}

#[tauri::command]
pub async fn list_project_images(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<String>, String> {
    let images_dir = get_ftgen_dir(&app).join("projects").join(&project_id).join("images");
    if !images_dir.exists() {
        return Ok(vec![]);
    }
    let mut images = Vec::new();
    let entries = fs::read_dir(&images_dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let lower = name.to_lowercase();
        if lower.ends_with(".png") || lower.ends_with(".jpg") || lower.ends_with(".jpeg")
            || lower.ends_with(".svg") || lower.ends_with(".pdf")
        {
            images.push(name);
        }
    }
    images.sort();
    Ok(images)
}

#[tauri::command]
pub async fn save_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    let config_path = get_config_path(&app);
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut config_to_save = config;
    config_to_save.ai_api_key = obfuscate_api_key(&config_to_save.ai_api_key);
    let json = serde_json::to_string_pretty(&config_to_save).map_err(|e| e.to_string())?;
    fs::write(&config_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// Commandes d'export avancé
// ═══════════════════════════════════════════════════════════════

/// Ajoute un fichier ou dossier (récursivement) dans un zip
fn add_path_to_zip<W: std::io::Write + std::io::Seek>(
    zip: &mut zip::ZipWriter<W>,
    opts: zip::write::SimpleFileOptions,
    src: &Path,
    prefix: &str,
) -> Result<(), String> {
    if src.is_dir() {
        let entries = fs::read_dir(src).map_err(|e| e.to_string())?;
        let dir_name = src.file_name().unwrap_or_default().to_string_lossy().to_string();
        let new_prefix = if prefix.is_empty() {
            dir_name
        } else {
            format!("{}/{}", prefix, dir_name)
        };
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            add_path_to_zip(zip, opts, &entry.path(), &new_prefix)?;
        }
    } else if src.exists() {
        let fname = src.file_name().unwrap_or_default().to_string_lossy().to_string();
        let zip_name = if prefix.is_empty() {
            fname
        } else {
            format!("{}/{}", prefix, fname)
        };
        zip.start_file(&zip_name, opts)
            .map_err(|e| format!("Erreur zip {}: {}", zip_name, e))?;
        let data = fs::read(src)
            .map_err(|e| format!("Erreur lecture {}: {}", src.display(), e))?;
        zip.write_all(&data)
            .map_err(|e| format!("Erreur écriture zip: {}", e))?;
    }
    Ok(())
}

/// Copie récursive d'un dossier
fn copy_dir_recursive(src: &Path, dest: &Path) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| format!("Erreur création dossier: {}", e))?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dest_path = dest.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dest_path)?;
        } else {
            fs::copy(&src_path, &dest_path)
                .map_err(|e| format!("Erreur copie {}: {}", src_path.display(), e))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn export_advanced(options: ExportOptions) -> Result<ExportResult, String> {
    let dest = Path::new(&options.destination_dir);
    fs::create_dir_all(dest).map_err(|e| format!("Erreur création dossier: {}", e))?;

    let pdf_src = Path::new(&options.pdf_path);
    if !pdf_src.exists() {
        return Err(format!("PDF introuvable : {}", options.pdf_path));
    }

    let mut exported = Vec::new();
    let pdf_name = format!("{}.pdf", options.base_name);

    match options.mode.as_str() {
        "zip_all" => {
            // Everything in one zip
            let zip_path = dest.join(format!("{}.zip", options.base_name));
            let file = fs::File::create(&zip_path)
                .map_err(|e| format!("Erreur création zip: {}", e))?;
            let mut zip = zip::ZipWriter::new(file);
            let zip_opts = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);

            // Add PDF
            zip.start_file(&pdf_name, zip_opts)
                .map_err(|e| format!("Erreur zip PDF: {}", e))?;
            let pdf_data = fs::read(pdf_src)
                .map_err(|e| format!("Erreur lecture PDF: {}", e))?;
            zip.write_all(&pdf_data)
                .map_err(|e| format!("Erreur écriture zip: {}", e))?;

            // Add linked files/directories
            for file_path in &options.linked_files {
                let src = Path::new(file_path);
                add_path_to_zip(&mut zip, zip_opts, src, "")?;
            }

            zip.finish().map_err(|e| format!("Erreur finalisation zip: {}", e))?;
            exported.push(zip_path.to_string_lossy().to_string());
        }
        "pdf_separate" => {
            // PDF copied separately + linked files in a zip
            let pdf_dest = dest.join(&pdf_name);
            fs::copy(pdf_src, &pdf_dest)
                .map_err(|e| format!("Erreur copie PDF: {}", e))?;
            exported.push(pdf_dest.to_string_lossy().to_string());

            if !options.linked_files.is_empty() {
                // Remplacer le préfixe "fiche_technique_" par "fichiers_lies_"
                let linked_name = if options.base_name.starts_with("fiche_technique_") {
                    format!("fichiers_lies_{}", &options.base_name["fiche_technique_".len()..])
                } else {
                    format!("fichiers_lies_{}", options.base_name)
                };
                let zip_path = dest.join(format!("{}.zip", linked_name));
                let file = fs::File::create(&zip_path)
                    .map_err(|e| format!("Erreur création zip: {}", e))?;
                let mut zip = zip::ZipWriter::new(file);
                let zip_opts = zip::write::SimpleFileOptions::default()
                    .compression_method(zip::CompressionMethod::Deflated);

                for file_path in &options.linked_files {
                    let src = Path::new(file_path);
                    add_path_to_zip(&mut zip, zip_opts, src, "")?;
                }
                zip.finish().map_err(|e| format!("Erreur finalisation zip: {}", e))?;
                exported.push(zip_path.to_string_lossy().to_string());
            }
        }
        _ => {
            // "no_zip" — copy all files flat
            let pdf_dest = dest.join(&pdf_name);
            fs::copy(pdf_src, &pdf_dest)
                .map_err(|e| format!("Erreur copie PDF: {}", e))?;
            exported.push(pdf_dest.to_string_lossy().to_string());

            for file_path in &options.linked_files {
                let src = Path::new(file_path);
                if src.is_dir() {
                    // Copier le dossier entier
                    let dir_name = src.file_name().unwrap_or_default();
                    let dir_dest = dest.join(dir_name);
                    copy_dir_recursive(src, &dir_dest)?;
                    exported.push(dir_dest.to_string_lossy().to_string());
                } else if src.exists() {
                    let filename = src.file_name().unwrap_or_default();
                    let file_dest = dest.join(filename);
                    let final_dest = if file_dest.exists() {
                        let stem = src.file_stem().unwrap_or_default().to_string_lossy().to_string();
                        let ext = src.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
                        let mut counter = 1;
                        loop {
                            let candidate = dest.join(format!("{}_{}.{}", stem, counter, ext));
                            if !candidate.exists() { break candidate; }
                            counter += 1;
                        }
                    } else {
                        file_dest
                    };
                    fs::copy(src, &final_dest)
                        .map_err(|e| format!("Erreur copie {}: {}", file_path, e))?;
                    exported.push(final_dest.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(ExportResult {
        exported_files: exported,
        destination: options.destination_dir,
    })
}

#[tauri::command]
pub async fn show_in_explorer(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    let dir = if p.is_dir() { p.to_path_buf() } else { p.parent().unwrap_or(Path::new(".")).to_path_buf() };

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Erreur ouverture explorateur: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Erreur ouverture Finder: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Erreur ouverture gestionnaire fichiers: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_export_history(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<ExportRecord>, String> {
    let history_path = get_ftgen_dir(&app)
        .join("projects")
        .join(&project_id)
        .join("export_history.json");

    if !history_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&history_path)
        .map_err(|e| format!("Erreur lecture historique: {}", e))?;
    let records: Vec<ExportRecord> = serde_json::from_str(&content)
        .map_err(|e| format!("Erreur parsing historique: {}", e))?;

    Ok(records)
}

#[tauri::command]
pub async fn save_export_record(
    app: tauri::AppHandle,
    project_id: String,
    record: ExportRecord,
) -> Result<(), String> {
    let history_path = get_ftgen_dir(&app)
        .join("projects")
        .join(&project_id)
        .join("export_history.json");

    let mut records = if history_path.exists() {
        let content = fs::read_to_string(&history_path).unwrap_or_default();
        serde_json::from_str::<Vec<ExportRecord>>(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    records.insert(0, record);
    // Garder les 20 derniers exports max
    records.truncate(20);

    let json = serde_json::to_string_pretty(&records)
        .map_err(|e| format!("Erreur sérialisation: {}", e))?;
    fs::write(&history_path, json)
        .map_err(|e| format!("Erreur écriture historique: {}", e))?;

    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// IA — Lecture de documents et génération
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentPayload {
    pub filename: String,
    pub mime_type: String,
    pub content_base64: Option<String>,
    pub content_text: Option<String>,
}

#[tauri::command]
pub async fn read_document_for_ai(path: String) -> Result<DocumentPayload, String> {
    let file_path = Path::new(&path);

    // Si c'est un dossier, retourner un listing
    if file_path.is_dir() {
        let dir_name = file_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let mut listing = format!("Contenu du dossier «{}» :\n", dir_name);
        fn list_dir(dir: &Path, prefix: &str, out: &mut String) {
            if let Ok(entries) = fs::read_dir(dir) {
                let mut entries: Vec<_> = entries.filter_map(|e| e.ok()).collect();
                entries.sort_by_key(|e| e.file_name());
                for entry in entries {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let path = entry.path();
                    if path.is_dir() {
                        out.push_str(&format!("{}📁 {}/\n", prefix, name));
                        list_dir(&path, &format!("{}  ", prefix), out);
                    } else {
                        let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                        let size_str = if size > 1_000_000 {
                            format!("{:.1} Mo", size as f64 / 1_000_000.0)
                        } else if size > 1_000 {
                            format!("{:.0} Ko", size as f64 / 1_000.0)
                        } else {
                            format!("{} o", size)
                        };
                        out.push_str(&format!("{}📄 {} ({})\n", prefix, name, size_str));
                    }
                }
            }
        }
        list_dir(file_path, "  ", &mut listing);
        return Ok(DocumentPayload {
            filename: dir_name,
            mime_type: "text/plain".to_string(),
            content_base64: None,
            content_text: Some(listing),
        });
    }

    let filename = file_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let ext = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime_type = match ext.as_str() {
        "pdf" => "application/pdf",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "tex" => "text/x-tex",
        "txt" => "text/plain",
        "md" => "text/markdown",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        _ => "application/octet-stream",
    }
    .to_string();

    match ext.as_str() {
        "pdf" | "png" | "jpg" | "jpeg" => {
            let bytes = fs::read(file_path)
                .map_err(|e| format!("Erreur lecture {}: {}", path, e))?;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            Ok(DocumentPayload {
                filename,
                mime_type,
                content_base64: Some(b64),
                content_text: None,
            })
        }
        "tex" | "txt" | "md" => {
            let text = fs::read_to_string(file_path)
                .map_err(|e| format!("Erreur lecture {}: {}", path, e))?;
            Ok(DocumentPayload {
                filename,
                mime_type,
                content_base64: None,
                content_text: Some(text),
            })
        }
        "docx" => Ok(DocumentPayload {
            filename,
            mime_type,
            content_base64: None,
            content_text: Some("Document DOCX — extraction non supportée".to_string()),
        }),
        _ => {
            let text = fs::read_to_string(file_path).unwrap_or_else(|_| {
                let bytes = fs::read(file_path).unwrap_or_default();
                base64::engine::general_purpose::STANDARD.encode(&bytes)
            });
            Ok(DocumentPayload {
                filename,
                mime_type,
                content_base64: None,
                content_text: Some(text),
            })
        }
    }
}

fn extract_json_from_response(text: &str) -> Option<&str> {
    // Chercher un bloc ```json ... ```
    if let Some(start) = text.find("```json") {
        let json_start = start + 7;
        if let Some(end) = text[json_start..].find("```") {
            return Some(&text[json_start..json_start + end]);
        }
    }
    // Chercher un bloc ``` ... ```
    if let Some(start) = text.find("```") {
        let block_start = start + 3;
        if let Some(end) = text[block_start..].find("```") {
            let candidate = text[block_start..block_start + end].trim();
            if candidate.starts_with('{') || candidate.starts_with('[') {
                return Some(candidate);
            }
        }
    }
    None
}

/// Construit le JSON Schema de l'outil structuré `submit_fiche` à partir du
/// schéma de champs envoyé par le frontend.
/// Aucun champ n'est `required` : le modèle peut donc renvoyer un objet partiel
/// (mode modification = patch, il ne nomme que les champs réellement modifiés).
fn build_tool_input_schema(schema: &serde_json::Value) -> serde_json::Value {
    let mut field_props = serde_json::Map::new();
    if let Some(fields) = schema.get("fields").and_then(|v| v.as_object()) {
        for (key, meta) in fields {
            let desc = meta.get("description").and_then(|d| d.as_str()).unwrap_or("");
            field_props.insert(
                key.clone(),
                serde_json::json!({ "type": "string", "description": desc }),
            );
        }
    }

    let mut cb_props = serde_json::Map::new();
    if let Some(cbs) = schema.get("checkboxes").and_then(|v| v.as_object()) {
        for (key, meta) in cbs {
            let label = meta.get("label").and_then(|d| d.as_str()).unwrap_or("");
            cb_props.insert(
                key.clone(),
                serde_json::json!({ "type": "integer", "enum": [0, 1], "description": label }),
            );
        }
    }

    // Si la liste est vide, on autorise des clés libres du bon type ; sinon on
    // verrouille à la liste exacte pour empêcher toute clé inventée.
    let fields_addl = if field_props.is_empty() {
        serde_json::json!({ "type": "string" })
    } else {
        serde_json::json!(false)
    };
    let cb_addl = if cb_props.is_empty() {
        serde_json::json!({ "type": "integer" })
    } else {
        serde_json::json!(false)
    };

    serde_json::json!({
        "type": "object",
        "properties": {
            "fields": {
                "type": "object",
                "description": "Champs texte/contenu à écrire (valeurs = strings de texte ou code LaTeX). En mode modification, n'inclure QUE les champs réellement modifiés.",
                "properties": field_props,
                "additionalProperties": fields_addl
            },
            "checkboxes": {
                "type": "object",
                "description": "Cases à cocher (0 = décoché, 1 = coché). En mode modification, n'inclure QUE celles réellement modifiées.",
                "properties": cb_props,
                "additionalProperties": cb_addl
            }
        }
    })
}

#[tauri::command]
pub async fn generate_with_ai(
    app: tauri::AppHandle,
    schema: serde_json::Value,
    documents: Vec<DocumentPayload>,
    user_prompt: String,
    system_prompt: String,
) -> Result<serde_json::Value, String> {
    let config = get_config_from_app(&app);

    if config.ai_api_key.is_empty() && config.ai_provider != "ollama" {
        return Err("Clé API manquante. Configurez-la dans les paramètres.".to_string());
    }

    let client = reqwest::Client::new();

    let response_text = match config.ai_provider.as_str() {
        "anthropic" => {
            let mut content_blocks: Vec<serde_json::Value> = Vec::new();

            for doc in &documents {
                if let Some(ref b64) = doc.content_base64 {
                    if doc.mime_type == "application/pdf" {
                        content_blocks.push(serde_json::json!({
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": b64
                            }
                        }));
                    } else {
                        // Image
                        content_blocks.push(serde_json::json!({
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": doc.mime_type,
                                "data": b64
                            }
                        }));
                    }
                }
                if let Some(ref text) = doc.content_text {
                    content_blocks.push(serde_json::json!({
                        "type": "text",
                        "text": format!("[Fichier : {}]\n{}", doc.filename, text)
                    }));
                }
            }

            let final_user_text = if user_prompt.trim().is_empty() {
                "Analyse les documents fournis et complète le schéma JSON selon les instructions du prompt système.".to_string()
            } else {
                user_prompt.clone()
            };
            content_blocks.push(serde_json::json!({
                "type": "text",
                "text": final_user_text
            }));

            // Outil structuré : l'API Anthropic garantit alors un JSON valide
            // conforme au schéma (plus aucun problème d'échappement LaTeX dans
            // le JSON, ni de troncature silencieuse au milieu d'une string).
            let input_schema = build_tool_input_schema(&schema);
            let body = serde_json::json!({
                "model": config.ai_model,
                "max_tokens": 16384,
                "system": system_prompt,
                "tools": [{
                    "name": "submit_fiche",
                    "description": "Soumet les champs de la fiche technique à injecter directement dans l'éditeur FTGen. En mode modification, ne renseigner que les champs réellement modifiés.",
                    "input_schema": input_schema
                }],
                "tool_choice": { "type": "tool", "name": "submit_fiche" },
                "messages": [{
                    "role": "user",
                    "content": content_blocks
                }]
            });

            let resp = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", &config.ai_api_key)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Erreur de connexion au provider : {}", e))?;

            let status = resp.status();
            let resp_body: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| format!("Erreur de connexion au provider : {}", e))?;

            if !status.is_success() {
                let err_msg = resp_body["error"]["message"]
                    .as_str()
                    .unwrap_or("Erreur inconnue");
                return Err(format!("Erreur de connexion au provider : {}", err_msg));
            }

            // Cas nominal : récupérer le bloc tool_use → son `input` est déjà un
            // objet JSON valide, on le renvoie directement sans parsing fragile.
            if let Some(input) = resp_body["content"]
                .as_array()
                .and_then(|arr| arr.iter().find(|b| b["type"] == "tool_use" && b["name"] == "submit_fiche"))
                .and_then(|b| b.get("input"))
            {
                // Garde-fou : si la réponse a été coupée par max_tokens, prévenir.
                if resp_body["stop_reason"] == "max_tokens" {
                    return Err("La réponse de l'IA a été tronquée (trop longue). Réessayez en ciblant moins de champs ou avec une demande plus précise.".to_string());
                }
                return Ok(input.clone());
            }

            // Repli : pas de tool_use (modèle ancien / refus), on tente le texte.
            resp_body["content"]
                .as_array()
                .and_then(|arr| arr.iter().find(|b| b["type"] == "text"))
                .and_then(|b| b["text"].as_str())
                .unwrap_or("")
                .to_string()
        }

        "openai" | "mistral" => {
            let base_url = if config.ai_provider == "mistral" {
                "https://api.mistral.ai/v1/chat/completions"
            } else {
                "https://api.openai.com/v1/chat/completions"
            };

            let mut user_message = String::new();
            for doc in &documents {
                if let Some(ref text) = doc.content_text {
                    user_message.push_str(&format!("[Fichier : {}]\n{}\n\n", doc.filename, text));
                }
                if let Some(ref _b64) = doc.content_base64 {
                    user_message.push_str(&format!(
                        "[Fichier : {} — contenu binaire non transmis en mode texte]\n\n",
                        doc.filename
                    ));
                }
            }
            if !user_prompt.trim().is_empty() {
                user_message.push_str(&user_prompt);
            } else {
                user_message.push_str("Analyse les documents fournis et complète le schéma JSON selon les instructions du prompt système.");
            }

            // JSON mode : force une réponse JSON syntaxiquement valide.
            let body = serde_json::json!({
                "model": config.ai_model,
                "max_tokens": 16384,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "response_format": { "type": "json_object" }
            });

            let resp = client
                .post(base_url)
                .header("Authorization", format!("Bearer {}", config.ai_api_key))
                .header("content-type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Erreur de connexion au provider : {}", e))?;

            let status = resp.status();
            let resp_body: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| format!("Erreur de connexion au provider : {}", e))?;

            if !status.is_success() {
                let err_msg = resp_body["error"]["message"]
                    .as_str()
                    .unwrap_or("Erreur inconnue");
                return Err(format!("Erreur de connexion au provider : {}", err_msg));
            }

            resp_body["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or("")
                .to_string()
        }

        "ollama" => {
            let endpoint = if config.ai_endpoint.is_empty() {
                "http://localhost:11434".to_string()
            } else {
                config.ai_endpoint.clone()
            };

            let mut user_message = String::new();
            for doc in &documents {
                if let Some(ref text) = doc.content_text {
                    user_message.push_str(&format!("[Fichier : {}]\n{}\n\n", doc.filename, text));
                }
            }
            if !user_prompt.trim().is_empty() {
                user_message.push_str(&user_prompt);
            } else {
                user_message.push_str("Analyse les documents fournis et complète le schéma JSON selon les instructions du prompt système.");
            }

            let body = serde_json::json!({
                "model": config.ai_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "stream": false,
                "format": "json"
            });

            let resp = client
                .post(format!("{}/api/chat", endpoint))
                .header("content-type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Erreur de connexion au provider : {}", e))?;

            let status = resp.status();
            let resp_body: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| format!("Erreur de connexion au provider : {}", e))?;

            if !status.is_success() {
                return Err(format!(
                    "Erreur de connexion au provider : {}",
                    resp_body.to_string()
                ));
            }

            resp_body["message"]["content"]
                .as_str()
                .unwrap_or("")
                .to_string()
        }

        other => {
            return Err(format!("Provider '{}' non reconnu", other));
        }
    };

    // Parser le JSON de la réponse
    let trimmed = response_text.trim();

    // Essayer le parsing direct
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(trimmed) {
        return Ok(json);
    }

    // Essayer d'extraire depuis un bloc de code
    if let Some(json_str) = extract_json_from_response(trimmed) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(json_str.trim()) {
            return Ok(json);
        }
    }

    Err("Le modèle n'a pas retourné un JSON valide. Réessayez.".to_string())
}

// ═══════════════════════════════════════════════════════════════
// IA — Liste dynamique des modèles
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiModelInfo {
    pub id: String,
    pub display_name: String,
}

/// Liste les modèles disponibles auprès du provider configuré
#[tauri::command]
pub async fn list_ai_models(
    provider: String,
    api_key: String,
    endpoint: String,
) -> Result<Vec<AiModelInfo>, String> {
    let client = reqwest::Client::new();

    match provider.as_str() {
        "anthropic" => {
            let resp = client
                .get("https://api.anthropic.com/v1/models")
                .header("x-api-key", &api_key)
                .header("anthropic-version", "2023-06-01")
                .send()
                .await
                .map_err(|e| format!("Erreur de connexion : {}", e))?;

            let status = resp.status();
            let body: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| format!("Erreur lecture réponse : {}", e))?;

            if !status.is_success() {
                let msg = body["error"]["message"].as_str().unwrap_or("Erreur inconnue");
                return Err(format!("Erreur Anthropic : {}", msg));
            }

            let models = body["data"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .map(|m| AiModelInfo {
                    id: m["id"].as_str().unwrap_or("").to_string(),
                    display_name: m["display_name"].as_str().unwrap_or(
                        m["id"].as_str().unwrap_or("")
                    ).to_string(),
                })
                .collect();

            Ok(models)
        }

        "openai" => {
            let base_url = if endpoint.is_empty() {
                "https://api.openai.com/v1/models".to_string()
            } else {
                format!("{}/v1/models", endpoint.trim_end_matches('/'))
            };

            let resp = client
                .get(&base_url)
                .header("Authorization", format!("Bearer {}", api_key))
                .send()
                .await
                .map_err(|e| format!("Erreur de connexion : {}", e))?;

            let status = resp.status();
            let body: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| format!("Erreur lecture réponse : {}", e))?;

            if !status.is_success() {
                let msg = body["error"]["message"].as_str().unwrap_or("Erreur inconnue");
                return Err(format!("Erreur OpenAI : {}", msg));
            }

            let mut models: Vec<AiModelInfo> = body["data"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .filter(|m| {
                    let id = m["id"].as_str().unwrap_or("");
                    id.starts_with("gpt-") || id.starts_with("o1") || id.starts_with("o3") || id.starts_with("o4")
                })
                .map(|m| {
                    let id = m["id"].as_str().unwrap_or("").to_string();
                    AiModelInfo {
                        display_name: id.clone(),
                        id,
                    }
                })
                .collect();

            models.sort_by(|a, b| a.id.cmp(&b.id));
            Ok(models)
        }

        "mistral" => {
            let base_url = if endpoint.is_empty() {
                "https://api.mistral.ai/v1/models".to_string()
            } else {
                format!("{}/v1/models", endpoint.trim_end_matches('/'))
            };

            let resp = client
                .get(&base_url)
                .header("Authorization", format!("Bearer {}", api_key))
                .send()
                .await
                .map_err(|e| format!("Erreur de connexion : {}", e))?;

            let status = resp.status();
            let body: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| format!("Erreur lecture réponse : {}", e))?;

            if !status.is_success() {
                let msg = body["error"]["message"].as_str().unwrap_or("Erreur inconnue");
                return Err(format!("Erreur Mistral : {}", msg));
            }

            let models: Vec<AiModelInfo> = body["data"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .map(|m| {
                    let id = m["id"].as_str().unwrap_or("").to_string();
                    AiModelInfo {
                        display_name: id.clone(),
                        id,
                    }
                })
                .collect();

            Ok(models)
        }

        "ollama" => {
            let base = if endpoint.is_empty() {
                "http://localhost:11434".to_string()
            } else {
                endpoint.clone()
            };

            let resp = client
                .get(format!("{}/api/tags", base.trim_end_matches('/')))
                .send()
                .await
                .map_err(|e| format!("Erreur de connexion à Ollama : {}", e))?;

            let status = resp.status();
            let body: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| format!("Erreur lecture réponse : {}", e))?;

            if !status.is_success() {
                return Err(format!("Erreur Ollama : {}", body));
            }

            let models: Vec<AiModelInfo> = body["models"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .map(|m| {
                    let name = m["name"].as_str().unwrap_or("").to_string();
                    AiModelInfo {
                        display_name: name.clone(),
                        id: name,
                    }
                })
                .collect();

            Ok(models)
        }

        other => Err(format!("Provider '{}' non reconnu", other)),
    }
}
