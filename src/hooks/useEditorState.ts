import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TemplateMeta, CompileResult, AppConfig, DocumentPayload } from "../lib/types";
import { PROFILES } from "../lib/profiles";
import type { CustomSection, SectionOverride, CustomProfile, SaveStatus, EditorTab, NavSection, LinkedDocument, Classification } from "../lib/editor-types";
import { resolveIcon } from "../lib/icons";
import { useToast } from "../components/ToastProvider";
import { invalidateClassificationCache } from "../components/editor/ClassificationEditor";
import { buildAiSchema } from "../lib/ai-schema";
import { buildLatexGuide } from "../lib/ai-latex-guide";
import { AI_SYSTEM_PROMPT_TEMPLATE, AI_COMPLETE_INSTRUCTIONS, AI_MODIFY_INSTRUCTIONS } from "../lib/ai-system-prompt";

interface UseEditorStateOptions {
  projectId: string;
  templateId: string;
}

export function useEditorState({ projectId, templateId }: UseEditorStateOptions) {
  const { toast } = useToast();
  const [meta, setMeta] = useState<TemplateMeta | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [compiling, setCompiling] = useState(false);
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("edit");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfVersion, setPdfVersion] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [activeSection, setActiveSection] = useState<string | null>("structure");
  const [expandTriggers, setExpandTriggers] = useState<Record<string, number>>({});

  // Structure
  const [disabledSections, setDisabledSections] = useState<Set<string>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState("gt-standard");
  const [disabledMetaGroups, setDisabledMetaGroups] = useState<Set<string>>(new Set());

  // Sections custom
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);

  // Custom checkbox items
  const [customCheckboxItems, setCustomCheckboxItems] = useState<Record<string, Array<{ name: string; label: string }>>>({});

  // Section overrides
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, SectionOverride>>({});
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [customProfiles, setCustomProfiles] = useState<CustomProfile[]>([]);

  // Items métadonnées masqués (liste maître gérée dans Structure)
  const [hiddenMetaItems, setHiddenMetaItems] = useState<Set<string>>(new Set());

  // Documents liés
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Classement catégorisé
  const [classification, setClassification] = useState<Classification>({ types: [], themes: [], niveaux: [] });
  const [createdAt, setCreatedAt] = useState<string>("");

  // Position de la sidebar
  const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("left");

  // Génération IA
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isLoadingProject = useRef(true);
  const compilingRef = useRef(false);

  // ═══════════════════════════════════════════
  // Chargement
  // ═══════════════════════════════════════════

  useEffect(() => {
    loadTemplate();
    loadGlobalCustomSections();
    loadSectionConfig();
  }, [templateId]);

  async function loadGlobalCustomSections() {
    try {
      const sections = await invoke<CustomSection[]>("load_custom_sections");
      if (sections && sections.length > 0) {
        setCustomSections(sections);
        setValues((prev) => {
          const next = { ...prev };
          for (const cs of sections) {
            if (!(cs.variableName in next)) next[cs.variableName] = "";
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Erreur chargement briques personnalisées:", err);
    }
  }

  async function saveGlobalCustomSections(sections: CustomSection[]) {
    try {
      await invoke("save_custom_sections", { sections });
    } catch (err) {
      console.error("Erreur sauvegarde briques personnalisées:", err);
    }
  }

  async function loadSectionConfig() {
    try {
      const config = await invoke<Record<string, unknown>>("load_section_config");
      if (config) {
        if (config.section_overrides) setSectionOverrides(config.section_overrides as Record<string, SectionOverride>);
        if (config.hidden_sections) setHiddenSections(config.hidden_sections as string[]);
        if (config.disabled_metadata_groups) setDisabledMetaGroups(new Set(config.disabled_metadata_groups as string[]));
        if (config.custom_checkbox_items) setCustomCheckboxItems(config.custom_checkbox_items as Record<string, Array<{ name: string; label: string }>>);
        if (config.custom_profiles) setCustomProfiles(config.custom_profiles as CustomProfile[]);
      }
    } catch (err) {
      console.error("Erreur chargement config sections:", err);
    }
  }

  async function saveSectionConfig(overrides?: Record<string, SectionOverride>, hidden?: string[], disabledMeta?: Set<string>, profiles?: CustomProfile[]) {
    try {
      await invoke("save_section_config", {
        config: {
          section_overrides: overrides ?? sectionOverrides,
          hidden_sections: hidden ?? hiddenSections,
          disabled_metadata_groups: Array.from(disabledMeta ?? disabledMetaGroups),
          custom_checkbox_items: customCheckboxItems,
          custom_profiles: profiles ?? customProfiles,
        },
      });
    } catch (err) {
      console.error("Erreur sauvegarde config sections:", err);
    }
  }

  async function loadTemplate() {
    try {
      const templates = await invoke<Array<{ id: string; meta_path: string }>>("get_templates");
      const tpl = templates.find((t) => t.id === templateId);
      if (!tpl) return;

      const templateMeta = await invoke<TemplateMeta>("load_template_meta", { metaPath: tpl.meta_path });
      setMeta(templateMeta);

      const defaults: Record<string, unknown> = {};
      for (const v of templateMeta.variables) {
        defaults[v.name] = v.type === "checkbox" ? 0 : (v.default_value || "");
      }

      try {
        const saved = await invoke<{
          values: Record<string, unknown>;
          custom_sections?: CustomSection[];
          disabled_sections?: string[];
          custom_checkbox_items?: Record<string, Array<{ name: string; label: string }>>;
          selected_profile?: string;
          section_overrides?: Record<string, SectionOverride>;
          disabled_meta_groups?: string[];
          linked_documents?: LinkedDocument[];
          selected_doc_ids?: string[];
          hidden_meta_items?: string[];
          classification?: Classification;
          resource_types?: string[];
          themes?: string[];
          niveaux?: string[];
          created_at?: string;
          sidebar_position?: string;
        }>("load_project", { projectId });
        if (saved?.values) {
          setValues({ ...defaults, ...saved.values });
          if (saved.custom_sections) setCustomSections(saved.custom_sections);
          if (saved.disabled_sections) setDisabledSections(new Set(saved.disabled_sections));
          if (saved.custom_checkbox_items) setCustomCheckboxItems(saved.custom_checkbox_items);
          if (saved.selected_profile) setSelectedProfile(saved.selected_profile);
          if (saved.section_overrides) setSectionOverrides(saved.section_overrides);
          if (saved.disabled_meta_groups) setDisabledMetaGroups(new Set(saved.disabled_meta_groups));
          if (saved.linked_documents) setLinkedDocuments(saved.linked_documents);
          if (saved.selected_doc_ids) setSelectedDocIds(new Set(saved.selected_doc_ids));
          if (saved.classification) setClassification(saved.classification);
          // Rétrocompatibilité : si pas de classification mais anciennes clés
          if (!saved.classification && (saved.resource_types || saved.themes || saved.niveaux)) {
            setClassification({
              types: (saved.resource_types as string[]) || [],
              themes: (saved.themes as string[]) || [],
              niveaux: (saved.niveaux as string[]) || [],
            });
          }
          if (saved.created_at) setCreatedAt(saved.created_at);
          if (saved.hidden_meta_items) setHiddenMetaItems(new Set(saved.hidden_meta_items));
          if (saved.sidebar_position) setSidebarPosition(saved.sidebar_position as "left" | "right");
          setSaveStatus("saved");
          // Vérifier si un PDF compilé existe déjà
          checkExistingPdf();
          // Marquer le chargement comme terminé (après un tick pour laisser les states se propager)
          setTimeout(() => { isLoadingProject.current = false; }, 100);
          return;
        }
      } catch { /* nouveau projet */ }

      setValues(defaults);
      // Vérifier si un PDF compilé existe déjà (même pour nouveau projet migré)
      checkExistingPdf();
      setTimeout(() => { isLoadingProject.current = false; }, 100);
    } catch (err) {
      console.error("Erreur chargement template:", err);
      isLoadingProject.current = false;
    }
  }

  async function checkExistingPdf() {
    try {
      const existing = await invoke<string | null>("check_project_pdf", { projectId, templateId });
      if (existing) {
        setPdfUrl(existing);
        setPdfVersion((v) => v + 1);
      }
    } catch { /* ignore */ }
  }

  // ═══════════════════════════════════════════
  // Auto-save & smart auto-compile
  // ═══════════════════════════════════════════

  // Auto-save toutes les 5 minutes + save à la fermeture
  const saveStatusRef = useRef(saveStatus);
  saveStatusRef.current = saveStatus;
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatusRef.current === "unsaved") {
        handleSaveRef.current();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onBeforeUnload() {
      if (saveStatusRef.current === "unsaved") {
        handleSaveRef.current();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Ref pour handleCompile (même pattern que handleSave)
  const handleCompileRef = useRef(handleCompile);
  handleCompileRef.current = handleCompile;

  // Raccourcis clavier (via refs pour toujours avoir les values à jour)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSaveRef.current(); }
      if (e.ctrlKey && e.key === "b") { e.preventDefault(); handleCompileRef.current(); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Pré-remplir la classification depuis les checkboxes cochées (rétrocompatibilité)
  const classificationInitialized = useRef(false);
  useEffect(() => {
    if (!meta || classificationInitialized.current) return;
    // Si la classification est déjà remplie, ne rien faire
    if (classification.types.length > 0 || classification.themes.length > 0 || classification.niveaux.length > 0) {
      classificationInitialized.current = true;
      return;
    }
    // Dériver depuis les checkboxes cochées
    function getLabels(group: string): string[] {
      const items = meta!.variables.filter((v) => v.type === "checkbox" && v.group === group);
      const custom = customCheckboxItems[group] || [];
      return [...items, ...custom.map((c) => ({ name: c.name, label: c.label }))]
        .filter((item) => values[item.name] === 1 || values[item.name] === true)
        .map((item) => item.label || item.name);
    }
    const derived = {
      types: getLabels("type"),
      themes: getLabels("theme"),
      niveaux: getLabels("niveau"),
    };
    if (derived.types.length > 0 || derived.themes.length > 0 || derived.niveaux.length > 0) {
      setClassification(derived);
    }
    classificationInitialized.current = true;
  }, [meta, values, customCheckboxItems]);

  // ═══════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════

  const updateValue = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("unsaved");
  }, []);

  function computeGenerationValues(): Record<string, unknown> {
    const genValues = { ...values };

    // Convertit les exposants Unicode des labels (6ᵉ, 2ᵈᵉ, 1ʳᵉ, Tˡᵉ…) en
    // \textsuperscript{} pour un rendu correct dans le PDF (LaTeX/tectonic ne
    // garantit pas les glyphes exposants Unicode). L'UI, elle, affiche les
    // exposants Unicode tels quels.
    const SUP_MAP: Record<string, string> = {
      "ᵃ": "a", "ᵇ": "b", "ᶜ": "c", "ᵈ": "d", "ᵉ": "e",
      "ᵒ": "o", "ᵐ": "m", "ⁿ": "n", "ʳ": "r", "ˡ": "l",
      "ˢ": "s", "ᵗ": "t",
    };
    const SUP_RE = new RegExp("[" + Object.keys(SUP_MAP).join("") + "]+", "g");
    function labelToLatex(label: string): string {
      return label.replace(SUP_RE, (run) =>
        "\\textsuperscript{" + Array.from(run).map((c) => SUP_MAP[c] || c).join("") + "}"
      );
    }

    for (const v of meta!.variables.filter((v) => v.type === "content")) {
      const sec = meta!.sections.find((s) => s.variable === v.name);
      const sectionId = sec?.id || v.name;
      if (disabledSections.has(sectionId) || hiddenSections.includes(sectionId)) {
        genValues[v.name] = "";
      }
    }

    const groups = new Map<string, Array<{ name: string; label: string }>>();
    for (const v of meta!.variables.filter((v) => v.type === "checkbox")) {
      const group = v.group || "other";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push({ name: v.name, label: v.label || v.name });
    }

    for (const [group, items] of groups.entries()) {
      if (disabledMetaGroups.has(group)) {
        genValues[`CBITEMS_${group}`] = "";
        continue;
      }
      const visibleItems = items.filter((item) => !hiddenMetaItems.has(item.name));
      const visibleCustomItems = (customCheckboxItems[group] || []).filter((item) => !hiddenMetaItems.has(item.name));
      const allVisible = [...visibleItems, ...visibleCustomItems];
      const rendered = allVisible.map((item) => {
        const isChecked = genValues[item.name] === 1 || genValues[item.name] === true;
        const lbl = labelToLatex(item.label);
        return isChecked ? `\\cmark\\ ${lbl}` : `\\xmark\\ ${lbl}`;
      });
      if (rendered.length === 0) {
        genValues[`CBITEMS_${group}`] = "\\textit{---}";
      } else {
        // Layout tabular 2 colonnes pour un affichage propre
        const half = Math.ceil(rendered.length / 2);
        const rows: string[] = [];
        for (let r = 0; r < half; r++) {
          const left = rendered[r];
          const right = rendered[r + half] || "";
          rows.push(`${left} & ${right}`);
        }
        genValues[`CBITEMS_${group}`] =
          `\\begin{tabular}{@{}l@{\\hspace{8pt}}l@{}}\n` +
          rows.join(" \\\\\n") +
          `\n\\end{tabular}`;
      }
    }

    // Les sections custom sont désormais intégrées dans __BODY_CONTENT__
    // via getAllOrderedSections(). On vide __CUSTOM_SECTIONS__ pour éviter les doublons.
    genValues["__CUSTOM_SECTIONS__"] = "";

    // Auto-génération section FICHIERS à partir des documents liés cochés
    // IMPORTANT : doit être avant __BODY_CONTENT__ pour que le body lise la bonne valeur
    const selectedDocs = linkedDocuments.filter((d) => selectedDocIds.has(d.id));
    if (selectedDocs.length > 0) {
      genValues["FICHIERS"] = selectedDocs
        .map((d) => `\\textbullet\\ ${d.displayName}`)
        .join("\\\\[2pt]\n");
    }

    // Génération dynamique du corps (%%BODY_CONTENT%%)
    const bc = meta!.body_config || {
      box_options: "enhanced,boxrule=0.5pt,arc=0pt",
      title_template: "title={%ICON%\\ %TITLE%}",
      title_options: "fonttitle=\\bfseries\\small,coltitle=%FRAME%",
      raster_options: "raster columns=2,raster equal height=rows,raster column skip=6pt",
      font_cmd: "\\small",
      default_frame_color: "black!70",
    };
    const defaultFrameColor = bc.default_frame_color || "black!70";

    function buildBoxOptions(frameColor: string, bgColor: string, titleText: string, faIcon: string): string {
      const boxOpts = bc.box_options
        .replace(/%FRAME%/g, frameColor)
        .replace(/%BG%/g, bgColor);
      const titleTpl = bc.title_template
        .replace(/%ICON%/g, faIcon)
        .replace(/%TITLE%/g, titleText)
        .replace(/%FRAME%/g, frameColor)
        .replace(/%BG%/g, bgColor);
      const titleOpts = bc.title_options
        .replace(/%FRAME%/g, frameColor)
        .replace(/%BG%/g, bgColor);
      return `${boxOpts},colback=${bgColor},colframe=${frameColor},${titleTpl},${titleOpts}`;
    }

    const bodyParts: string[] = [];
    const orderedSecs = getAllOrderedSections();
    let i = 0;
    const bulletCmd = (color: string) =>
      `\\renewcommand{\\labelitemi}{\\color{${color}}\\footnotesize\\faChevronRight}\\renewcommand{\\labelitemii}{\\color{${color}}\\footnotesize\\faAngleRight}`;
    while (i < orderedSecs.length) {
      const sec = orderedSecs[i];
      const sectionMeta = meta!.sections.find((s) => s.id === sec.id);
      const customSec = customSections.find((cs) => cs.id === sec.id);
      const content = String(genValues[sec.variable] || "").trim();
      if (!content) { i++; continue; } // Skip empty sections
      const cols = sectionOverrides[sec.id]?.columns ?? 2;
      const faIcon = sectionMeta?.fa_icon || (customSec ? "\\faFileAlt" : "\\faFileAlt");
      const frameColor = sectionMeta?.frame_color || defaultFrameColor;
      const bgColor = sectionMeta?.bg_color || "white";
      const title = resolveSectionTitle(sec.id, sectionMeta?.title || customSec?.title || sec.id);

      if (cols === 2) {
        // Full-width section
        const opts = buildBoxOptions(frameColor, bgColor, title, faIcon);
        bodyParts.push(
          `\\begin{tcolorbox}[${opts}]\n` +
          `${bulletCmd(frameColor)}\n` +
          `${bc.font_cmd} ${content}\n` +
          `\\end{tcolorbox}\n` +
          `\\vspace{0.25cm}`
        );
        i++;
      } else {
        // Half-width: look for next half-width section with content
        let nextIdx = i + 1;
        let next: typeof orderedSecs[0] | null = null;
        while (nextIdx < orderedSecs.length) {
          const candidate = orderedSecs[nextIdx];
          const candidateCols = sectionOverrides[candidate.id]?.columns ?? 2;
          const candidateContent = String(genValues[candidate.variable] || "").trim();
          if (candidateCols === 1 && candidateContent) {
            next = candidate;
            break;
          }
          if (candidateCols === 2) break; // Stop at next full-width
          nextIdx++;
        }

        if (next) {
          const nextMeta = meta!.sections.find((s) => s.id === next!.id);
          const nextCustomSec = customSections.find((cs) => cs.id === next!.id);
          const nextContent = String(genValues[next.variable] || "").trim();
          const nextFaIcon = nextMeta?.fa_icon || "\\faFileAlt";
          const nextFrameColor = nextMeta?.frame_color || defaultFrameColor;
          const nextBgColor = nextMeta?.bg_color || "white";
          const nextTitle = resolveSectionTitle(next.id, nextMeta?.title || nextCustomSec?.title || next.id);

          const opts1 = buildBoxOptions(frameColor, bgColor, title, faIcon);
          const opts2 = buildBoxOptions(nextFrameColor, nextBgColor, nextTitle, nextFaIcon);
          const rasterOpts = bc.raster_options
            .replace(/%FRAME%/g, frameColor)
            .replace(/%BG%/g, bgColor);

          bodyParts.push(
            `\\begin{tcbitemize}[${rasterOpts}]\n\n` +
            `  \\tcbitem[${opts1}]\n` +
            `  ${bulletCmd(frameColor)}\n` +
            `  ${bc.font_cmd} ${content}\n\n` +
            `  \\tcbitem[${opts2}]\n` +
            `  ${bulletCmd(nextFrameColor)}\n` +
            `  ${bc.font_cmd} ${nextContent}\n\n` +
            `\\end{tcbitemize}\n` +
            `\\vspace{0.25cm}`
          );
          // Skip both sections + any empty half-width sections in between
          i = nextIdx + 1;
        } else {
          // No partner found, render full-width
          const opts = buildBoxOptions(frameColor, bgColor, title, faIcon);
          bodyParts.push(
            `\\begin{tcolorbox}[${opts}]\n` +
            `${bulletCmd(frameColor)}\n` +
            `${bc.font_cmd} ${content}\n` +
            `\\end{tcolorbox}\n` +
            `\\vspace{0.25cm}`
          );
          i++;
        }
      }
    }
    genValues["__BODY_CONTENT__"] = bodyParts.join("\n\n");

    // Génération dynamique de la sidebar (%%SIDEBAR_CONTENT%%)
    const sidebarColorMap: Record<string, { color: string; icon: string; label: string }> = {
      type: { color: "bleu", icon: "\\faTag", label: "Type" },
      niveau: { color: "bleu", icon: "\\faGraduationCap", label: "Niveau" },
      theme: { color: "vert", icon: "\\faBook", label: "Thème" },
      outils_ia: { color: "orange", icon: "\\faRobot", label: "Outils IA" },
      competences: { color: "bleu!50!rouge", icon: "\\faStar", label: "Compétences" },
      ia_aisance: { color: "orange", icon: "\\faBrain", label: "Aisance IA" },
      ia_sophistication: { color: "orange", icon: "\\faCogs", label: "Sophistication IA" },
      compte: { color: "vert", icon: "\\faUserLock", label: "Compte" },
    };

    const sidebarParts: string[] = [];
    for (const [group] of groups.entries()) {
      if (disabledMetaGroups.has(group)) continue;
      const cbitems = genValues[`CBITEMS_${group}`];
      if (!cbitems) continue;
      const style = sidebarColorMap[group] || { color: "gris", icon: "\\faInfoCircle", label: group };
      sidebarParts.push(
        `      \\begin{tcolorbox}[carte,colframe=${style.color}!30,borderline north={2pt}{0pt}{${style.color}}]\n` +
        `        \\textbf{\\color{${style.color}}${style.icon}\\ ${style.label}}\\\\[4pt]\n` +
        `        ${cbitems}\n` +
        `      \\end{tcolorbox}\n` +
        `      \\vspace{0.15cm}`
      );
    }
    // Add sous-theme if present in theme sidebar card
    genValues["__SIDEBAR_CONTENT__"] = sidebarParts.join("\n\n");

    genValues["SIDEBAR_POSITION"] = sidebarPosition;
    genValues["SIDEBAR_LEFT"] = sidebarPosition === "left" ? "1" : "";
    genValues["SIDEBAR_RIGHT"] = sidebarPosition === "right" ? "1" : "";

    return genValues;
  }

  async function handleCompile() {
    if (!meta || compilingRef.current) return;
    setCompiling(true);
    compilingRef.current = true;

    try {
      // Sauvegarder le projet (data.json) avant de compiler
      await handleSave();

      const templates = await invoke<Array<{ id: string; tex_path: string }>>("get_templates");
      const tpl = templates.find((t) => t.id === templateId);
      if (!tpl) throw new Error("Template introuvable");
      const genValues = computeGenerationValues();
      const texPath = await invoke<string>("generate_tex", {
        projectId, templateTexPath: tpl.tex_path, values: genValues,
      });
      const result = await invoke<CompileResult>("compile_latex", { texPath });
      setCompileResult(result);
      if (result.success) {
        setPdfUrl(result.pdf_path);
        setPdfVersion((v) => v + 1);
        if (activeTab !== "split" && activeTab !== "preview") setActiveTab("split");
        const compilerInfo = result.compiler_used ? ` (${result.compiler_used.split(" (")[0]})` : "";
        toast(`Compilation réussie${compilerInfo}`, "success");
      } else {
        const compilerInfo = result.compiler_used ? ` (${result.compiler_used.split(" (")[0]})` : "";
        setActiveTab("log");
        toast(`Erreur de compilation${compilerInfo}`, "error");
      }
    } catch (err) {
      console.error("Erreur compilation:", err);
      setCompileResult({ success: false, pdf_path: "", log: String(err), errors: [String(err)] });
      setActiveTab("log");
      toast("Erreur de compilation", "error");
    } finally {
      setCompiling(false);
      compilingRef.current = false;
    }
  }

  // Export : la modale est gérée dans EditorPage, ici on expose juste les données nécessaires
  const exportTitle = String(values["TITRE_RESSOURCE"] || projectId).trim();

  async function handleShowProjectFolder() {
    try {
      const ftgenDir = await invoke<string>("get_project_dir", { projectId });
      await invoke("show_in_explorer", { path: ftgenDir });
    } catch {
      // Fallback : ouvrir le dossier parent du PDF
      if (pdfUrl) {
        await invoke("show_in_explorer", { path: pdfUrl }).catch(() => {});
      }
    }
  }

  function updateClassification(cls: Classification) {
    setClassification(cls);
    setSaveStatus("unsaved");
  }

  async function handleSave() {
    setSaveStatus("saving");
    try {
      // Classement catégorisé pour l'affichage et les filtres de la page d'accueil
      const allTags = [...new Set([...classification.types, ...classification.themes, ...classification.niveaux])];

      const now = new Date().toISOString();

      await invoke("save_project", {
        projectId,
        data: {
          template_id: templateId,
          title: String(values["TITRE_RESSOURCE"] || projectId),
          subtitle: String(values["SOUS_THEME"] || ""),
          values,
          // Classement structuré
          classification,
          // Clés plates pour la rétrocompatibilité de la HomePage
          resource_types: classification.types,
          themes: classification.themes,
          niveaux: classification.niveaux,
          tags: allTags,
          // Config projet
          custom_sections: customSections,
          disabled_sections: Array.from(disabledSections),
          custom_checkbox_items: customCheckboxItems,
          selected_profile: selectedProfile,
          section_overrides: sectionOverrides,
          disabled_meta_groups: Array.from(disabledMetaGroups),
          linked_documents: linkedDocuments,
          selected_doc_ids: Array.from(selectedDocIds),
          hidden_meta_items: Array.from(hiddenMetaItems),
          sidebar_position: sidebarPosition,
          created_at: createdAt || now,
          updated_at: now,
        },
      });
      setSaveStatus("saved");
      invalidateClassificationCache();
      // Si première sauvegarde, mémoriser la date de création
      if (!createdAt) setCreatedAt(now);
      toast("Projet sauvegardé", "success");
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      setSaveStatus("unsaved");
      toast("Erreur de sauvegarde", "error");
    }
  }

  function navigateToSection(sectionId: string) {
    setActiveSection(sectionId);
    if (sectionId === "structure" || sectionId === "documents") return;
    if (activeTab !== "edit" && activeTab !== "split") setActiveTab("edit");
    if (sectionId.startsWith("content-") || sectionId.startsWith("custom-") || sectionId === "metadata") {
      setExpandTriggers((prev) => ({ ...prev, [sectionId]: (prev[sectionId] || 0) + 1 }));
    }
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = sectionRefs.current.get(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    });
  }

  function toggleSection(sectionId: string) {
    setDisabledSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
      return next;
    });
    setSelectedProfile("custom");
    setSaveStatus("unsaved");
  }

  function toggleMetaGroup(group: string) {
    setDisabledMetaGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      saveSectionConfig(undefined, undefined, next);
      return next;
    });
    setSaveStatus("unsaved");
  }

  function toggleMetaItem(itemName: string) {
    setHiddenMetaItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemName)) next.delete(itemName); else next.add(itemName);
      return next;
    });
    setSaveStatus("unsaved");
  }

  function applyProfile(profileId: string) {
    setSelectedProfile(profileId);
    const builtIn = PROFILES.find((p) => p.id === profileId);
    const custom = customProfiles.find((p) => p.id === profileId);
    toast(`Profil appliqué : ${custom?.name || builtIn?.name || profileId}`, "info");

    if (custom && meta) {
      // Apply custom profile
      const allIds = meta.variables.filter((v) => v.type === "content").map((v) => {
        const sec = meta.sections.find((s) => s.variable === v.name);
        return sec?.id || v.name;
      });
      const enabledSet = new Set(custom.enabledSections);
      setDisabledSections(new Set(allIds.filter((id) => !enabledSet.has(id))));
      setDisabledMetaGroups(new Set(custom.disabledMetaGroups));
      setSectionOverrides(custom.sectionOverrides);
      return;
    }

    if (!builtIn || !meta) return;
    if (builtIn.enabledSections.length === 0) {
      setDisabledSections(new Set());
    } else {
      const allIds = meta.variables.filter((v) => v.type === "content").map((v) => {
        const sec = meta.sections.find((s) => s.variable === v.name);
        return sec?.id || v.name;
      });
      const enabled = new Set(allIds.filter((id) => builtIn.enabledSections.some((kw) => id.toLowerCase().includes(kw))));
      setDisabledSections(new Set(allIds.filter((id) => !enabled.has(id))));
    }
    for (const [key, val] of Object.entries(builtIn.defaultCheckboxes)) {
      updateValue(key, val);
    }
  }

  function handleSectionManagerSave(data: {
    sectionOverrides: Record<string, SectionOverride>;
    hiddenSections: string[];
    customSections: CustomSection[];
  }) {
    setSectionOverrides(data.sectionOverrides);
    setHiddenSections(data.hiddenSections);
    setCustomSections(data.customSections);
    saveGlobalCustomSections(data.customSections);
    saveSectionConfig(data.sectionOverrides, data.hiddenSections);
    setValues((prev) => {
      const next = { ...prev };
      for (const cs of data.customSections) {
        if (!(cs.variableName in next)) next[cs.variableName] = "";
      }
      return next;
    });
    setSaveStatus("unsaved");
  }

  // ═══════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════

  function isSectionEnabled(sectionId: string): boolean {
    return !disabledSections.has(sectionId) && !hiddenSections.includes(sectionId);
  }

  function reorderSection(sectionId: string, direction: "up" | "down") {
    // Get all enabled+visible sections ordered by current order
    const allSections = getAllOrderedSections();
    const idx = allSections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= allSections.length) return;

    const newOverrides = { ...sectionOverrides };
    // Swap order values
    newOverrides[allSections[idx].id] = { ...newOverrides[allSections[idx].id], order: swapIdx };
    newOverrides[allSections[swapIdx].id] = { ...newOverrides[allSections[swapIdx].id], order: idx };
    setSectionOverrides(newOverrides);
    saveSectionConfig(newOverrides);
    setSaveStatus("unsaved");
  }

  function setSectionColumns(sectionId: string, columns: number) {
    const newOverrides = { ...sectionOverrides };
    newOverrides[sectionId] = { ...newOverrides[sectionId], columns };
    setSectionOverrides(newOverrides);
    saveSectionConfig(newOverrides);
    setSaveStatus("unsaved");
  }

  function saveCurrentAsProfile(name: string, icon: string, description: string) {
    const profile: CustomProfile = {
      id: `profile-${Date.now()}`,
      name,
      icon,
      description,
      enabledSections: getAllOrderedSections().map((s) => s.id),
      disabledMetaGroups: Array.from(disabledMetaGroups),
      sectionOverrides: { ...sectionOverrides },
    };
    const newProfiles = [...customProfiles, profile];
    setCustomProfiles(newProfiles);
    saveSectionConfig(undefined, undefined, undefined, newProfiles);
  }

  function deleteCustomProfile(profileId: string) {
    const newProfiles = customProfiles.filter((p) => p.id !== profileId);
    setCustomProfiles(newProfiles);
    saveSectionConfig(undefined, undefined, undefined, newProfiles);
  }

  function updateCustomProfile(profileId: string) {
    const newProfiles = customProfiles.map((p) =>
      p.id === profileId
        ? {
            ...p,
            enabledSections: getAllOrderedSections().map((s) => s.id),
            disabledMetaGroups: Array.from(disabledMetaGroups),
            sectionOverrides: { ...sectionOverrides },
          }
        : p
    );
    setCustomProfiles(newProfiles);
    saveSectionConfig(undefined, undefined, undefined, newProfiles);
  }

  function addLinkedDocument(doc: LinkedDocument) {
    setLinkedDocuments((prev) => [...prev, doc]);
    setSaveStatus("unsaved");
    toast(`Document ajouté : ${doc.displayName}`, "success");
  }

  function removeLinkedDocument(docId: string) {
    setLinkedDocuments((prev) => prev.filter((d) => d.id !== docId));
    setSaveStatus("unsaved");
    toast("Document supprimé", "info");
  }

  function updateLinkedDocument(docId: string, updates: Partial<LinkedDocument>) {
    setLinkedDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, ...updates } : d)));
    setSaveStatus("unsaved");
  }


  function toggleDocSelection(docId: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId); else next.add(docId);
      return next;
    });
    setSaveStatus("unsaved");
  }

  function getAllOrderedSections(): Array<{ id: string; variable: string }> {
    const sections: Array<{ id: string; variable: string; order: number }> = [];
    for (const v of meta!.variables.filter((v) => v.type === "content")) {
      const sec = meta!.sections.find((s) => s.variable === v.name);
      const sectionId = sec?.id || v.name;
      if (disabledSections.has(sectionId) || hiddenSections.includes(sectionId)) continue;
      sections.push({ id: sectionId, variable: v.name, order: sectionOverrides[sectionId]?.order ?? 999 });
    }
    for (const cs of customSections) {
      if (disabledSections.has(cs.id) || hiddenSections.includes(cs.id)) continue;
      sections.push({ id: cs.id, variable: cs.variableName, order: sectionOverrides[cs.id]?.order ?? 999 });
    }
    return sections.sort((a, b) => a.order - b.order);
  }

  function getSectionStatus(varName: string): "empty" | "partial" | "filled" {
    const val = String(values[varName] || "");
    if (val.length === 0) return "empty";
    if (val.length < 50) return "partial";
    return "filled";
  }

  function resolveSectionTitle(sectionId: string, defaultTitle: string): string {
    return sectionOverrides[sectionId]?.title || defaultTitle;
  }

  function resolveSectionIcon(sectionId: string, defaultIcon: string): string {
    return resolveIcon(defaultIcon, sectionOverrides[sectionId]?.icon);
  }

  // ═══════════════════════════════════════════
  // Génération IA
  // ═══════════════════════════════════════════

  // Détermine si du contenu IA ou manuel existe déjà dans les champs
  const hasExistingContent = (() => {
    if (!meta) return false;
    const contentVars = meta.variables.filter(v => v.type === "content");
    return contentVars.some(v => {
      const val = String(values[v.name] || "").trim();
      return val.length > 0;
    });
  })();

  async function handleAiGenerate(userPrompt: string) {
    if (!meta) return;
    const isModifyMode = hasExistingContent;
    setAiGenerating(true);
    setAiError(null);

    try {
      // 1. Construire le schéma IA (inclut les valeurs courantes)
      const schema = buildAiSchema(meta, values, disabledSections, disabledMetaGroups, hiddenMetaItems, customSections);

      // 3. Construire le guide LaTeX
      const latexGuide = buildLatexGuide(meta);

      // 4. Lire les documents liés (optionnel en mode modification)
      const documents: DocumentPayload[] = [];
      for (const doc of linkedDocuments) {
        try {
          const payload = await invoke<DocumentPayload>("read_document_for_ai", { path: doc.path });
          documents.push(payload);
        } catch (err) {
          console.error(`Erreur lecture document ${doc.displayName}:`, err);
        }
      }

      if (documents.length === 0 && !isModifyMode) {
        throw new Error("Aucun document n'a pu être lu. Liez au moins un document source.");
      }

      // 5. Construire l'exemple de sortie dynamique
      const exampleFields: Record<string, string> = {};
      const fieldKeys = Object.keys(schema.fields);
      for (const key of fieldKeys.slice(0, 3)) {
        const f = schema.fields[key];
        exampleFields[key] = f.type === "text" ? `Valeur pour ${f.description}` : `\\begin{itemize}\n  \\item Contenu LaTeX pour ${f.description}\n\\end{itemize}`;
      }
      if (fieldKeys.length > 3) exampleFields["..."] = "...";
      const exampleCheckboxes: Record<string, number> = {};
      const cbKeys = Object.keys(schema.checkboxes);
      for (const key of cbKeys.slice(0, 2)) {
        exampleCheckboxes[key] = 1;
      }
      if (cbKeys.length > 2) exampleCheckboxes["..."] = 0;
      const outputExample = JSON.stringify({ fields: exampleFields, checkboxes: exampleCheckboxes }, null, 2);

      // 6. Construire le prompt système avec le schéma personnalisé et le mode courant
      const modeInstructions = isModifyMode ? AI_MODIFY_INSTRUCTIONS : AI_COMPLETE_INSTRUCTIONS;
      const systemPrompt = AI_SYSTEM_PROMPT_TEMPLATE
        .replace("{{MODE_INSTRUCTIONS}}", modeInstructions)
        .replace("{{LATEX_GUIDE}}", latexGuide)
        .replace("{{SCHEMA}}", JSON.stringify(schema, null, 2))
        .replace("{{OUTPUT_EXAMPLE}}", outputExample);

      // 6bis. Construire le prompt utilisateur enrichi en mode modification
      let finalUserPrompt = userPrompt || "";
      if (isModifyMode) {
        const currentContent = Object.entries(schema.fields)
          .filter(([, f]) => f.current_value && f.current_value.trim().length > 0)
          .map(([key, f]) => `### ${key} (${f.description})\n${f.current_value}`)
          .join("\n\n");
        const instruction = finalUserPrompt
          ? `Demande de l'utilisateur : ${finalUserPrompt}`
          : "Aucune consigne précise : améliore la clarté et corrige les éventuelles erreurs, sans raccourcir le contenu.";
        finalUserPrompt = `MODE MODIFICATION — La fiche contient déjà du contenu. Contenu actuel de chaque champ rempli :\n\n${currentContent}\n\n${instruction}\n\nIMPORTANT : Ne renvoie QUE les champs (fields/checkboxes) que tu modifies réellement, avec leur version finale complète. N'inclus PAS les champs laissés inchangés — l'application conserve l'existant.`;
      }

      // 7. Appeler la commande Tauri (le schéma est passé en objet pour construire l'outil structuré)
      const resultJson = await invoke<unknown>("generate_with_ai", {
        schema,
        documents,
        userPrompt: finalUserPrompt,
        systemPrompt,
      });

      // 9. Utiliser le résultat (déjà parsé par Tauri invoke)
      const result = (typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson) as Record<string, unknown>;

      // Extraction robuste : gère les deux formats possibles
      // Format attendu : { "fields": { "var": "value" }, "checkboxes": { "var": 1 } }
      // Format alternatif : { "fields": { "var": { "current_value": "value", ... } }, ... }
      const extractFieldValue = (val: unknown): string | null => {
        if (typeof val === "string") return val;
        if (val && typeof val === "object" && "current_value" in (val as Record<string, unknown>)) {
          return String((val as Record<string, unknown>).current_value || "");
        }
        return null;
      };

      const extractCheckboxValue = (val: unknown): number | null => {
        if (typeof val === "number") return val;
        if (val && typeof val === "object" && "current_value" in (val as Record<string, unknown>)) {
          return Number((val as Record<string, unknown>).current_value || 0);
        }
        return null;
      };

      const fields = result.fields as Record<string, unknown> | undefined;
      const checkboxes = result.checkboxes as Record<string, unknown> | undefined;

      let appliedCount = 0;

      setValues((prev) => {
        const next = { ...prev };
        if (fields) {
          for (const [key, rawVal] of Object.entries(fields)) {
            const val = extractFieldValue(rawVal);
            if (val !== null && val.trim().length > 0) {
              if (isModifyMode) {
                next[key] = val;
                appliedCount++;
              } else {
                const existing = String(next[key] || "").trim();
                if (existing.length === 0) {
                  next[key] = val;
                  appliedCount++;
                }
              }
            }
          }
        }
        if (checkboxes) {
          for (const [key, rawVal] of Object.entries(checkboxes)) {
            const val = extractCheckboxValue(rawVal);
            if (val !== null) {
              next[key] = val;
              appliedCount++;
            }
          }
        }
        return next;
      });
      setSaveStatus("unsaved");
      if (appliedCount === 0) {
        toast("L'IA a répondu mais aucun champ n'a été modifié. Vérifiez la réponse.", "warning");
      } else {
        toast(isModifyMode ? `Modification IA terminée — ${appliedCount} champ(s) modifié(s)` : `Génération IA terminée — ${appliedCount} champ(s) complété(s)`, "success");
      }
    } catch (err) {
      const errMsg = String(err);
      setAiError(errMsg);
      console.error("Erreur génération IA:", err);
      toast("Erreur de génération IA : " + errMsg, "error");
    } finally {
      setAiGenerating(false);
    }
  }

  // ═══════════════════════════════════════════
  // Computed values
  // ═══════════════════════════════════════════

  const checkboxGroups = new Map<string, Array<{ name: string; label: string }>>();
  if (meta) {
    for (const v of meta.variables.filter((v) => v.type === "checkbox")) {
      const group = v.group || "other";
      if (!checkboxGroups.has(group)) checkboxGroups.set(group, []);
      checkboxGroups.get(group)!.push({ name: v.name, label: v.label || v.name });
    }
  }

  const allContentVars = meta?.variables.filter((v) => v.type === "content") || [];
  const visibleContentVars = allContentVars.filter((v) => {
    const sec = meta?.sections.find((s) => s.variable === v.name);
    return !hiddenSections.includes(sec?.id || v.name);
  });
  const enabledContentVars = visibleContentVars.filter((v) => {
    const sec = meta?.sections.find((s) => s.variable === v.name);
    return isSectionEnabled(sec?.id || v.name);
  });
  const textVars = meta?.variables.filter((v) => v.type === "text") || [];
  const marginVars = meta?.variables.filter((v) => v.type === "margin") || [];

  const orderedContentVars = [...enabledContentVars].sort((a, b) => {
    const secA = meta?.sections.find((s) => s.variable === a.name);
    const secB = meta?.sections.find((s) => s.variable === b.name);
    const orderA = sectionOverrides[secA?.id || a.name]?.order ?? 999;
    const orderB = sectionOverrides[secB?.id || b.name]?.order ?? 999;
    return orderA - orderB;
  });

  // Build nav sections
  const navSections: NavSection[] = [];
  if (checkboxGroups.size > 0) navSections.push({ id: "metadata", label: "Métadonnées", icon: "📊" });
  if (textVars.length > 0) navSections.push({ id: "info-generales", label: "Infos générales", icon: "ℹ️" });
  navSections.push({ id: "tags", label: "Classification", icon: "🏷" });
  if (marginVars.length > 0) navSections.push({ id: "geometry", label: "Géométrie", icon: "📐" });
  for (const v of orderedContentVars) {
    const section = meta?.sections.find((s) => s.variable === v.name);
    const sectionId = section?.id || v.name;
    navSections.push({
      id: `content-${v.name}`,
      label: resolveSectionTitle(sectionId, section?.title || v.label || v.name),
      icon: resolveSectionIcon(sectionId, section?.icon || "📝"),
      status: getSectionStatus(v.name),
    });
  }
  for (const cs of customSections) {
    if (!disabledSections.has(cs.id) && !hiddenSections.includes(cs.id)) {
      navSections.push({
        id: cs.id,
        label: resolveSectionTitle(cs.id, cs.title),
        icon: resolveSectionIcon(cs.id, cs.icon),
        status: getSectionStatus(cs.variableName),
      });
    }
  }

  return {
    // State
    meta, values, compiling, compileResult, activeTab, setActiveTab,
    pdfUrl, pdfVersion, saveStatus, activeSection, setActiveSection,
    expandTriggers,
    disabledSections, selectedProfile, disabledMetaGroups,
    customSections, customCheckboxItems, sectionOverrides, hiddenSections,
    customProfiles,
    hiddenMetaItems,
    linkedDocuments,
    selectedDocIds,
    classification,
    sidebarPosition,
    sectionRefs,

    // Computed
    checkboxGroups, visibleContentVars, enabledContentVars, orderedContentVars, textVars, marginVars, navSections,

    // IA
    aiGenerating, aiError, handleAiGenerate, hasExistingContent,

    // Actions
    updateValue, handleCompile, handleSave, navigateToSection,
    toggleSection, toggleMetaGroup, toggleMetaItem, applyProfile, handleSectionManagerSave,
    isSectionEnabled, getSectionStatus, resolveSectionTitle, resolveSectionIcon,
    reorderSection, setSectionColumns, saveCurrentAsProfile, deleteCustomProfile, updateCustomProfile,
    addLinkedDocument, removeLinkedDocument, updateLinkedDocument, toggleDocSelection,
    updateClassification,
    setSidebarPosition: (pos: "left" | "right") => { setSidebarPosition(pos); setSaveStatus("unsaved"); },
    handleShowProjectFolder,
    exportTitle,

    // Checkbox custom actions
    setCustomCheckboxItems,
  };
}
