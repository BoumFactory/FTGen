import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HomePage } from "./pages/HomePage";
import { EditorPage } from "./pages/EditorPage";

export type Page = "home" | "editor";

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  tex_path: string;
  meta_path: string;
}

export interface ProjectInfo {
  id: string;
  title: string;
  template_id: string;
  created_at: string;
  updated_at: string;
  path: string;
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [ftgenReady, setFtgenReady] = useState(false);

  useEffect(() => {
    invoke("init_ftgen_dir")
      .then(() => setFtgenReady(true))
      .catch((err) => console.error("Erreur init .ftgen:", err));
    // Appliquer le thème depuis la config
    invoke<{ theme?: string }>("get_config")
      .then((config) => {
        const theme = config?.theme || "dark";
        document.documentElement.classList.toggle("dark", theme === "dark");
      })
      .catch(() => {});
  }, []);

  // Zoom app avec Ctrl+molette (font-size) — ignoré sur zone PDF
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey) return;
    // Si on survole une zone PDF, laisser le PdfViewer gérer le zoom
    const target = e.target as HTMLElement;
    if (target.closest("[data-pdf-zone]")) return;
    e.preventDefault();
    const root = document.documentElement;
    const current = parseFloat(root.style.getPropertyValue("--app-zoom") || "1");
    const delta = e.deltaY > 0 ? -0.03 : 0.03;
    const next = Math.min(1.6, Math.max(0.7, current + delta));
    root.style.setProperty("--app-zoom", String(next));
  }, []);

  useEffect(() => {
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleNewProject = (templateId: string) => {
    const id = `fiche-${Date.now()}`;
    setCurrentProjectId(id);
    setCurrentTemplateId(templateId);
    setPage("editor");
  };

  const handleOpenProject = (projectId: string, templateId: string) => {
    setCurrentProjectId(projectId);
    setCurrentTemplateId(templateId);
    setPage("editor");
  };

  const handleBackHome = () => {
    setPage("home");
    setCurrentProjectId(null);
    setCurrentTemplateId(null);
  };

  if (!ftgenReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-or-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-creme-300">Initialisation de FTGen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {page === "home" && (
        <HomePage
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
        />
      )}
      {page === "editor" && currentProjectId && currentTemplateId && (
        <EditorPage
          key={currentTemplateId}
          projectId={currentProjectId}
          templateId={currentTemplateId}
          onBack={handleBackHome}
          onChangeTemplate={(newTemplateId) => setCurrentTemplateId(newTemplateId)}
        />
      )}
    </div>
  );
}

export default App;
