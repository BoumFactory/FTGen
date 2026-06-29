import type { TemplateMeta, CompileResult, TemplateVariable } from "./types";

export type SaveStatus = "saved" | "unsaved" | "saving";
export type EditorTab = "edit" | "preview" | "split" | "log";

export interface CustomSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  variableName: string;
}

export interface SectionOverride {
  title?: string;
  icon?: string;
  order?: number;
  columns?: number; // 1 ou 2 dans le raster (défaut: 2 = pleine largeur)
}

export interface CustomProfile {
  id: string;
  name: string;
  icon: string;
  description: string;
  enabledSections: string[];
  disabledMetaGroups: string[];
  sectionOverrides: Record<string, SectionOverride>;
}

export interface LinkedDocument {
  id: string;
  path: string;
  label: string;
  displayName: string;
  addedAt: string;
  isDirectory?: boolean;
}

export interface Classification {
  types: string[];
  themes: string[];
  niveaux: string[];
}

export interface NavSection {
  id: string;
  label: string;
  icon: string;
  status?: "empty" | "partial" | "filled";
}

export type ExportMode = "zip_all" | "no_zip" | "pdf_separate";

export interface ExportRecord {
  date: string;
  destination: string;
  mode: ExportMode;
  files: string[];
  base_name: string;
}

export const GROUP_LABELS: Record<string, string> = {
  type: "Type de ressource",
  niveau: "Niveau scolaire",
  theme: "Thème mathématique",
  outils_ia: "Outils IA",
  competences: "Compétences",
};

export const STATUS_DOT: Record<string, string> = {
  empty: "bg-marine-400",
  partial: "bg-or-500",
  filled: "bg-green-400",
};

export const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "Sauvegardé",
  unsaved: "Non sauvegardé",
  saving: "Sauvegarde...",
};

export const SAVE_STATUS_COLOR: Record<SaveStatus, string> = {
  saved: "text-green-400",
  unsaved: "text-or-400",
  saving: "text-muted",
};
