import type { Profile } from "./types";

export const PROFILES: Profile[] = [
  {
    id: "gt-standard",
    name: "GT Standard",
    description: "Fiche technique complète avec toutes les sections",
    enabledSections: [], // Vide = tout activé
    defaultCheckboxes: {},
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Résumé et objectifs uniquement",
    enabledSections: ["resume", "objectifs"],
    defaultCheckboxes: {},
  },
  {
    id: "ia-focus",
    name: "Focus IA",
    description: "Sections centrées sur les modalités d'usage de l'IA",
    enabledSections: ["resume", "objectifs", "modalites_ia", "vigilance"],
    defaultCheckboxes: {},
  },
  {
    id: "custom",
    name: "Personnalisé",
    description: "Sélection libre des sections",
    enabledSections: [],
    defaultCheckboxes: {},
  },
];

export function getProfile(id: string): Profile | undefined {
  return PROFILES.find((p) => p.id === id);
}

export function getDefaultProfile(): Profile {
  return PROFILES[0];
}
