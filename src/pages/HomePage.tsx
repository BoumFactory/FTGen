import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TemplateInfo, AppConfig } from "../lib/types";
import { useToast } from "../components/ToastProvider";

interface HomePageProps {
  onNewProject: (templateId: string) => void;
  onOpenProject: (projectId: string, templateId: string) => void;
}

// Le backend retourne maintenant tout le data.json + id/path
interface ProjectEntry {
  id: string;
  path: string;
  title: string;
  subtitle?: string;
  template_id: string;
  created_at: string;
  updated_at: string;
  resource_types?: string[];
  themes?: string[];
  niveaux?: string[];
  tags?: string[];
  classification?: { types: string[]; themes: string[]; niveaux: string[] };
}

type FilterMode = "all" | "type" | "theme" | "niveau" | "template";

export function HomePage({ onNewProject, onOpenProject }: HomePageProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>("template_academique");
  const [ftgenInfo, setFtgenInfo] = useState<{ path: string; template_count: number } | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    invoke<AppConfig>("get_config")
      .then((c) => { if (c.default_template) setDefaultTemplateId(c.default_template); })
      .catch(() => {});
  }, []);

  async function loadData() {
    try {
      const [tpls, prjs, info] = await Promise.all([
        invoke<TemplateInfo[]>("get_templates"),
        invoke<ProjectEntry[]>("list_projects"),
        invoke<{ path: string; template_count: number }>("get_ftgen_info").catch(() => null),
      ]);
      setTemplates(tpls);
      setFtgenInfo(info);
      setProjects(prjs.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")));
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(projectId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Supprimer la fiche "${projectId}" ?`)) return;
    try {
      await invoke("delete_project", { projectId });
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast("Fiche supprimée", "info");
    } catch (err) {
      toast("Erreur suppression", "error");
      console.error(err);
    }
  }

  // Extraire tous les filtres disponibles
  const filterOptions = useMemo(() => {
    const types = new Set<string>();
    const themes = new Set<string>();
    const niveaux = new Set<string>();
    const tplIds = new Set<string>();
    for (const p of projects) {
      const cls = p.classification;
      const pTypes = cls?.types?.length ? cls.types : (p.resource_types || []);
      const pThemes = cls?.themes?.length ? cls.themes : (p.themes || []);
      const pNiveaux = cls?.niveaux?.length ? cls.niveaux : (p.niveaux || []);
      pTypes.forEach((t) => types.add(t));
      pThemes.forEach((t) => themes.add(t));
      pNiveaux.forEach((t) => niveaux.add(t));
      tplIds.add(p.template_id);
    }
    return {
      type: Array.from(types).sort(),
      theme: Array.from(themes).sort(),
      niveau: Array.from(niveaux).sort(),
      template: Array.from(tplIds).sort(),
    };
  }, [projects]);

  // Filtrer les projets
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Filtre texte
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.subtitle || "").toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    // Filtre par catégorie
    if (activeFilter && filterMode !== "all") {
      result = result.filter((p) => {
        const cls = p.classification;
        switch (filterMode) {
          case "type": return (cls?.types?.length ? cls.types : (p.resource_types || [])).includes(activeFilter);
          case "theme": return (cls?.themes?.length ? cls.themes : (p.themes || [])).includes(activeFilter);
          case "niveau": return (cls?.niveaux?.length ? cls.niveaux : (p.niveaux || [])).includes(activeFilter);
          case "template": return p.template_id === activeFilter;
          default: return true;
        }
      });
    }

    return result;
  }, [projects, search, filterMode, activeFilter]);

  function getTemplateLabel(templateId: string): string {
    const tpl = templates.find((t) => t.id === templateId);
    return tpl?.name || templateId.replace("template_", "").replace(/_/g, " ");
  }

  function formatDate(iso: string): string {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch { return iso; }
  }

  const FILTER_TABS: { mode: FilterMode; label: string }[] = [
    { mode: "all", label: "Toutes" },
    { mode: "type", label: "Type" },
    { mode: "theme", label: "Thème" },
    { mode: "niveau", label: "Niveau" },
    { mode: "template", label: "Modèle" },
  ];

  const currentFilterValues = filterMode !== "all"
    ? filterOptions[filterMode as keyof typeof filterOptions] || []
    : [];

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-marine-800 border-b border-or-500/40 px-6 py-3 flex items-center gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-or-500 rounded-lg flex items-center justify-center">
            <span className="text-on-accent font-bold text-lg">FT</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-creme-200 leading-tight">FTGen</h1>
            <p className="text-xs text-muted leading-tight">Générateur de Fiches Techniques</p>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="flex-1 max-w-md ml-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une fiche..."
              className="w-full pl-9 pr-3 py-2 bg-marine-700 border border-marine-400/25 rounded-lg text-sm text-creme-200
                         placeholder:text-muted-dark focus:outline-none focus:border-or-500/50 focus:ring-1 focus:ring-or-500/30"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-creme-200 text-xs">
                ✕
              </button>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-dark ml-auto">{projects.length} fiche{projects.length !== 1 ? "s" : ""}</span>
      </header>

      {/* Barre de filtres */}
      <div className="bg-marine-800/60 border-b border-marine-400/15 px-6 py-2 flex items-center gap-2">
        {/* Onglets de filtre */}
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => { setFilterMode(tab.mode); setActiveFilter(null); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filterMode === tab.mode
                ? "bg-or-500/15 text-or-300 border border-or-500/30"
                : "text-muted hover:text-creme-200 hover:bg-marine-600/30"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Valeurs du filtre actif */}
        {currentFilterValues.length > 0 && (
          <>
            <div className="w-px h-5 bg-marine-400/20 mx-1" />
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {currentFilterValues.map((val) => (
                <button
                  key={val}
                  onClick={() => setActiveFilter(activeFilter === val ? null : val)}
                  className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all border ${
                    activeFilter === val
                      ? "bg-or-500/20 text-or-300 border-or-500/40"
                      : "bg-marine-700/50 text-muted border-marine-400/15 hover:text-creme-300 hover:border-marine-300/30"
                  }`}
                >
                  {filterMode === "template" ? getTemplateLabel(val) : val}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Compteur filtré */}
        {(search || activeFilter) && (
          <span className="text-xs text-muted ml-auto shrink-0">
            {filteredProjects.length}/{projects.length}
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-or-500 border-t-transparent rounded-full" />
          </div>
        ) : templates.length === 0 ? (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="rounded-xl border-2 border-or-500/60 bg-marine-700 p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">⚠️</span>
                <h2 className="text-lg font-bold text-or-300">Aucun template dans le dossier <code>.ftgen</code></h2>
              </div>
              <p className="text-sm text-creme-300 mb-3">
                L'application n'a trouvé aucun template. Elle cherche un dossier <code>.ftgen</code> contenant
                des modèles, à partir de son propre emplacement.
              </p>
              {ftgenInfo && (
                <p className="text-xs text-muted mb-4">
                  Dossier cherché : <code className="text-creme-300 break-all">{ftgenInfo.path}</code>
                </p>
              )}
              <div className="rounded-lg bg-marine-800/70 border border-marine-400/20 p-4">
                <p className="text-sm font-semibold text-creme-200 mb-2">Pour la faire fonctionner :</p>
                <ul className="text-sm text-creme-300 space-y-1.5 list-disc list-inside">
                  <li>placer l'application <strong>dans le même dossier</strong> que <code>.ftgen</code>,</li>
                  <li>ou copier le dossier <code>.ftgen</code> <strong>à côté de l'application</strong>.</li>
                </ul>
                <p className="text-xs text-muted mt-3">
                  Puis relancer l'application (ou recharger avec <kbd>Ctrl</kbd>+<kbd>R</kbd>).
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

              {/* Carte Nouvelle fiche — utilise le template par défaut */}
              <button
                onClick={() => onNewProject(defaultTemplateId)}
                className="min-h-[170px] rounded-xl border-2 border-dashed border-or-500/25
                           bg-gradient-to-br from-or-500/5 to-marine-800
                           hover:border-or-500/50 hover:from-or-500/10
                           transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-or-500/15 flex items-center justify-center
                                group-hover:bg-or-500/25 group-hover:scale-110 transition-all">
                  <svg className="w-5 h-5 text-or-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-or-300">Nouvelle fiche</p>
                  <p className="text-xs text-muted mt-0.5">{getTemplateLabel(defaultTemplateId)}</p>
                </div>
              </button>

              {/* Fiches existantes */}
              {filteredProjects.map((prj) => (
                <ProjectCard
                  key={prj.id}
                  project={prj}
                  templateLabel={getTemplateLabel(prj.template_id)}
                  formatDate={formatDate}
                  onClick={() => onOpenProject(prj.id, prj.template_id)}
                  onDelete={(e) => handleDelete(prj.id, e)}
                />
              ))}
            </div>

            {/* Message vide */}
            {projects.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-3 opacity-20">📄</div>
                <p className="text-muted-light">Aucune fiche pour le moment</p>
                <p className="text-sm text-muted mt-1">Cliquez sur "Nouvelle fiche" pour commencer</p>
              </div>
            )}

            {/* Message aucun résultat filtré */}
            {projects.length > 0 && filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-light">Aucune fiche ne correspond aux critères</p>
                <button
                  onClick={() => { setSearch(""); setActiveFilter(null); setFilterMode("all"); }}
                  className="text-xs text-or-300 hover:text-or-200 mt-2 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// Carte de projet
function ProjectCard({
  project, templateLabel, formatDate, onClick, onDelete,
}: {
  project: ProjectEntry;
  templateLabel: string;
  formatDate: (iso: string) => string;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  // Lire classification en priorité, fallback sur les clés plates
  const cls = project.classification;
  const types = cls?.types?.length ? cls.types : (project.resource_types || []);
  const themes = cls?.themes?.length ? cls.themes : (project.themes || []);
  const niveaux = cls?.niveaux?.length ? cls.niveaux : (project.niveaux || []);
  const hasMeta = types.length > 0 || themes.length > 0 || niveaux.length > 0;

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border border-marine-400/20 overflow-hidden
                 bg-gradient-to-b from-marine-700/60 to-marine-800/80
                 hover:border-or-500/40 hover:shadow-lg hover:shadow-or-500/5
                 transition-all cursor-pointer relative"
    >
      {/* Bouton supprimer */}
      <div
        onClick={onDelete}
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-marine-800/80 border border-marine-400/20
                   flex items-center justify-center text-muted hover:text-red-300 hover:border-red-500/30
                   opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        title="Supprimer"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>

      {/* En-tête */}
      <div className="px-4 pt-3.5 pb-2">
        <h3 className="font-semibold text-lg text-creme-200 group-hover:text-or-300 transition-colors truncate pr-6">
          {project.title || project.id}
        </h3>
        {project.subtitle && (
          <p className="text-[11px] text-muted mt-0.5 line-clamp-2">{project.subtitle}</p>
        )}
      </div>

      {/* Pastilles de classification */}
      {hasMeta && (
        <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
          {types.map((t) => (
            <span key={`t-${t}`} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                                             bg-or-500/12 text-or-300 border border-or-500/25 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-or-400 shrink-0" />
              {t}
            </span>
          ))}
          {niveaux.map((n) => (
            <span key={`n-${n}`} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                                             bg-blue-500/12 text-blue-300 border border-blue-500/25 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              {n}
            </span>
          ))}
          {themes.map((t) => (
            <span key={`th-${t}`} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                                              bg-emerald-500/12 text-emerald-300 border border-emerald-500/25 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Pied */}
      <div className="px-4 py-2 bg-marine-800/50 border-t border-marine-400/10 flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 rounded-full bg-marine-600/40 border border-marine-400/15 text-muted font-medium">
          {templateLabel}
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-dark">
          {project.created_at && (
            <span title="Créé le">📅 {formatDate(project.created_at)}</span>
          )}
          <span title="Modifié le">✏️ {formatDate(project.updated_at)}</span>
        </div>
      </div>
    </button>
  );
}
