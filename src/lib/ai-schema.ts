import type { TemplateMeta, AiSchema, AiField, AiCheckbox } from "./types";
import type { CustomSection } from "./editor-types";

/**
 * Construit le schéma JSON dynamique depuis l'état éditeur
 * pour l'envoyer à l'IA avec le prompt de génération.
 */
export function buildAiSchema(
  meta: TemplateMeta,
  values: Record<string, unknown>,
  disabledSections: Set<string>,
  disabledMetaGroups: Set<string>,
  hiddenMetaItems: Set<string>,
  customSections: CustomSection[],
): AiSchema {
  const fields: Record<string, AiField> = {};
  const checkboxes: Record<string, AiCheckbox> = {};

  // 1. Champs texte (type "text") — seulement les non-marges
  for (const v of meta.variables.filter(v => v.type === "text")) {
    fields[v.name] = {
      type: "text",
      description: v.label || v.description,
      current_value: String(values[v.name] || ""),
    };
  }

  // 2. Champs contenu (type "content") — seulement les sections actives
  for (const v of meta.variables.filter(v => v.type === "content")) {
    const section = meta.sections.find(s => s.variable === v.name);
    if (section && disabledSections.has(section.id)) continue;
    fields[v.name] = {
      type: "content",
      description: v.label || v.description,
      current_value: String(values[v.name] || ""),
    };
  }

  // 3. Sections custom actives
  for (const cs of customSections) {
    if (disabledSections.has(cs.id)) continue;
    fields[cs.variableName] = {
      type: "content",
      description: cs.title + " — " + cs.description,
      current_value: String(values[cs.variableName] || ""),
    };
  }

  // 4. Checkboxes — seulement les groupes actifs et items non masqués
  for (const v of meta.variables.filter(v => v.type === "checkbox")) {
    if (disabledMetaGroups.has(v.group)) continue;
    if (hiddenMetaItems.has(v.name)) continue;
    checkboxes[v.name] = {
      label: v.label || v.description,
      group: v.group,
      current_value: Number(values[v.name] || 0),
    };
  }

  return { fields, checkboxes };
}
