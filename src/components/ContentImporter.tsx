import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ProjectInfo {
  id: string;
  title: string;
  template_id: string;
  created_at: string;
  updated_at: string;
  path: string;
}

interface ContentImporterProps {
  open: boolean;
  onClose: () => void;
  onImport: (content: string) => void;
  currentSectionName?: string;
}

export function ContentImporter({ open, onClose, onImport, currentSectionName }: ContentImporterProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectInfo | null>(null);
  const [projectValues, setProjectValues] = useState<Record<string, unknown> | null>(null);
  const [loadingValues, setLoadingValues] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadProjects();
      // Reset state
      setSelectedProject(null);
      setProjectValues(null);
      setPreviewContent(null);
      setPreviewKey(null);
    }
  }, [open]);

  async function loadProjects() {
    setLoading(true);
    try {
      const prjs = await invoke<ProjectInfo[]>("list_projects");
      setProjects(prjs);
    } catch (err) {
      console.error("Erreur chargement projets:", err);
    } finally {
      setLoading(false);
    }
  }

  async function selectProject(project: ProjectInfo) {
    setSelectedProject(project);
    setLoadingValues(true);
    setPreviewContent(null);
    setPreviewKey(null);
    try {
      const data = await invoke<{ values: Record<string, unknown> }>("load_project", {
        projectId: project.id,
      });
      setProjectValues(data.values || {});
    } catch (err) {
      console.error("Erreur chargement projet:", err);
      setProjectValues(null);
    } finally {
      setLoadingValues(false);
    }
  }

  function selectContent(key: string, content: string) {
    setPreviewContent(content);
    setPreviewKey(key);
  }

  function handleImport() {
    if (previewContent) {
      onImport(previewContent);
      onClose();
    }
  }

  if (!open) return null;

  // Filtrer les valeurs de type contenu (strings longues, pas des checkbox 0/1)
  const contentEntries = projectValues
    ? Object.entries(projectValues).filter(
        ([, val]) => typeof val === "string" && String(val).length > 10
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="card !rounded-xl !shadow-2xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-marine-300/10 shrink-0">
          <div>
            <h2 className="section-title !text-base">Importer du contenu</h2>
            {currentSectionName && (
              <p className="text-xs text-muted mt-0.5">
                Importer vers : <span className="text-creme-300">{currentSectionName}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-marine-200/40 hover:text-creme-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corps */}
        <div className="flex flex-1 overflow-hidden">
          {/* Colonne gauche : liste des projets */}
          <div className="w-64 shrink-0 border-r border-marine-300/10 overflow-auto">
            <p className="section-title !text-sm mx-4 my-2">
              Projets existants
            </p>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-or-500 border-t-transparent rounded-full" />
              </div>
            ) : projects.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">Aucun projet</p>
            ) : (
              <div className="space-y-0.5">
                {projects.map((prj) => (
                  <button
                    key={prj.id}
                    onClick={() => selectProject(prj)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      selectedProject?.id === prj.id
                        ? "bg-or-500/15 text-or-300 border-r-2 border-or-500"
                        : "text-muted-light hover:bg-marine-600 hover:text-creme-200"
                    }`}
                  >
                    <div className="font-medium truncate">{prj.title || prj.id}</div>
                    <div className="text-xs text-muted-dark truncate">{prj.template_id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colonne centrale : sections du projet sélectionné */}
          <div className="w-56 shrink-0 border-r border-marine-300/10 overflow-auto">
            <p className="section-title !text-sm mx-4 my-2">
              Sections
            </p>
            {!selectedProject ? (
              <p className="px-4 py-4 text-sm text-muted">Sélectionnez un projet</p>
            ) : loadingValues ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-or-500 border-t-transparent rounded-full" />
              </div>
            ) : contentEntries.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">Aucun contenu</p>
            ) : (
              <div className="space-y-0.5">
                {contentEntries.map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => selectContent(key, String(val))}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      previewKey === key
                        ? "bg-or-500/15 text-or-300 border-r-2 border-or-500"
                        : "text-muted-light hover:bg-marine-600 hover:text-creme-200"
                    }`}
                  >
                    <div className="font-medium truncate">{key.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-dark">{String(val).length} car.</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colonne droite : preview du contenu */}
          <div className="flex-1 overflow-auto p-4">
            {previewContent ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-or-400">
                    Aperçu : {previewKey?.replace(/_/g, " ")}
                  </h3>
                  <span className="text-xs text-muted">{previewContent.length} caractères</span>
                </div>
                <pre className="card-inset text-sm text-creme-300 whitespace-pre-wrap font-mono max-h-[50vh] overflow-auto">
                  {previewContent}
                </pre>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted text-sm">Sélectionnez une section pour prévisualiser</p>
              </div>
            )}
          </div>
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-marine-300/10 shrink-0">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
            Annuler
          </button>
          <button
            onClick={handleImport}
            disabled={!previewContent}
            className="btn-primary text-sm px-5 py-2 disabled:opacity-40"
          >
            Importer ce contenu
          </button>
        </div>
      </div>
    </div>
  );
}
