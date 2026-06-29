// Types partagés entre les composants

export interface TemplateVariable {
  name: string;
  type: "text" | "checkbox" | "content" | "margin";
  description: string;
  default_value: string;
  group: string;
  label: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  icon: string;
  variable: string;
  color: string;
  fa_icon?: string;      // Commande FontAwesome (ex: "\\faFileAlt")
  frame_color?: string;  // Couleur bordure tcolorbox
  bg_color?: string;     // Couleur fond tcolorbox
}

export interface BodyConfig {
  box_options: string;      // Options tcolorbox de base (ex: "enhanced,boxrule=1pt,arc=0pt")
  title_template: string;   // Template de titre avec %ICON%, %TITLE%, %FRAME% (ex: "title={\\textsc{%TITLE%}}")
  title_options: string;    // Options du titre (ex: "fonttitle=\\bfseries\\small,coltitle=white,colbacktitle=%FRAME%")
  raster_options: string;   // Options tcbitemize (ex: "raster columns=2,raster equal height=rows")
  font_cmd: string;         // Commande de taille (ex: "\\small")
  default_frame_color?: string; // Couleur cadre par défaut pour le template (ex: "marine", "bleuciel")
  style?: string;           // Style du body (ex: "standard", "minimal")
  title_color?: string;     // Couleur des titres (style minimal)
  rule_color?: string;      // Couleur des filets (style minimal)
}

export interface TemplateMeta {
  name: string;
  description: string;
  compiler: string;
  variables: TemplateVariable[];
  sections: TemplateSection[];
  logos: string[];
  body_config?: BodyConfig;
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  tex_path: string;
  meta_path: string;
}

export interface ProjectData {
  template_id: string;
  title: string;
  values: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectInfo {
  id: string;
  title: string;
  template_id: string;
  created_at: string;
  updated_at: string;
  path: string;
}

export interface CompileResult {
  success: boolean;
  pdf_path: string;
  log: string;
  errors: string[];
  compiler_used?: string;
}

export interface AppConfig {
  ftgen_path: string;
  lualatex_path: string;
  compile_on_save: boolean;
  debounce_ms: number;
  preview_mode: "tab" | "side";
  theme: "dark" | "light";
  editor_font_size: number;
  default_template: string;
  default_sidebar: "left" | "right";
  logo_left: string;
  logo_right: string;
  ai_provider: "anthropic" | "openai" | "mistral" | "ollama";
  ai_api_key: string;
  ai_model: string;
  ai_endpoint: string;
  compiler: string;
  font_package: string;
}

// Structure d'un projet (quelles sections sont actives)
export interface ProjectStructure {
  enabledSections: string[];      // IDs des sections activées
  trashedSections: string[];      // IDs des sections désactivées (données conservées)
  profile?: string;               // Profil appliqué
}

// Config d'une section pour le widget factory
export interface SectionWidgetConfig {
  sectionId: string;
  snippetCategory: SnippetCategory;
  placeholder: string;
  completionKeywords: string[];
}

export type SnippetCategory = "resume" | "objectifs" | "modalites_ia" | "deroulement" | "vigilance" | "fichiers" | "general";

// Profil prédéfini
export interface Profile {
  id: string;
  name: string;
  description: string;
  enabledSections: string[];
  defaultCheckboxes: Record<string, number>;
}

// Snippet pour la barre de snippets
export interface Snippet {
  label: string;
  code: string;
  description?: string;
}

// Types pour la génération IA
export interface AiField {
  type: "text" | "content";
  description: string;
  current_value: string;
}

export interface AiCheckbox {
  label: string;
  group: string;
  current_value: number;
}

export interface AiSchema {
  fields: Record<string, AiField>;
  checkboxes: Record<string, AiCheckbox>;
}

export interface DocumentPayload {
  filename: string;
  mime_type: string;
  content_base64: string | null;
  content_text: string | null;
}
