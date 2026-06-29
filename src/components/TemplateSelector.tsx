import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TemplateSelectorProps {
  selectedId: string;
  onSelect: (templateId: string) => void;
  sidebarPosition?: "left" | "right";
  onSidebarChange?: (pos: "left" | "right") => void;
}

interface TemplateCardInfo {
  id: string;
  name: string;
  description: string;
}

// État d'un aperçu : non généré, en cours, prêt, erreur
type PreviewState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "ready"; pdfData: string }
  | { status: "error"; message: string };

export function TemplateSelector({
  selectedId, onSelect, sidebarPosition = "left", onSidebarChange,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateCardInfo[]>([]);
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({});
  const [generatingAll, setGeneratingAll] = useState(false);

  useEffect(() => {
    invoke<TemplateCardInfo[]>("get_templates").then(setTemplates).catch(() => {});
  }, []);

  // Charger les aperçus existants au montage
  useEffect(() => {
    if (templates.length === 0) return;
    loadExistingPreviews();
  }, [templates, sidebarPosition]);

  async function loadExistingPreviews() {
    const newPreviews: Record<string, PreviewState> = {};
    for (const tpl of templates) {
      try {
        // Vérifier si un PDF de preview existe déjà
        const previewPath = await invoke<string | null>("check_preview_pdf", {
          templateId: tpl.id,
          sidebarPosition,
        }).catch(() => null);

        if (previewPath) {
          const b64 = await invoke<string>("read_pdf_base64", { pdfPath: previewPath });
          newPreviews[tpl.id] = { status: "ready", pdfData: `data:application/pdf;base64,${b64}` };
        } else {
          newPreviews[tpl.id] = { status: "idle" };
        }
      } catch {
        newPreviews[tpl.id] = { status: "idle" };
      }
    }
    setPreviews(newPreviews);
  }

  const generatePreview = useCallback(async (templateId: string) => {
    setPreviews((prev) => ({ ...prev, [templateId]: { status: "generating" } }));
    try {
      const pdfPath = await invoke<string>("generate_template_preview", {
        templateId,
        sidebarPosition,
      });
      const b64 = await invoke<string>("read_pdf_base64", { pdfPath });
      setPreviews((prev) => ({
        ...prev,
        [templateId]: { status: "ready", pdfData: `data:application/pdf;base64,${b64}` },
      }));
    } catch (err) {
      setPreviews((prev) => ({
        ...prev,
        [templateId]: { status: "error", message: String(err) },
      }));
    }
  }, [sidebarPosition]);

  async function generateAllPreviews() {
    setGeneratingAll(true);
    for (const tpl of templates) {
      const state = previews[tpl.id];
      if (!state || state.status !== "ready") {
        await generatePreview(tpl.id);
      }
    }
    setGeneratingAll(false);
  }

  // Séparer principaux et fancy
  const mainIds = ["template_academique", "template_moderne", "template_minimaliste", "template_cartes"];
  const mainTemplates = templates.filter((t) => mainIds.includes(t.id));
  const fancyTemplates = templates.filter((t) => !mainIds.includes(t.id));

  const hasAnyPreview = Object.values(previews).some((p) => p.status === "ready");
  const allReady = templates.length > 0 && templates.every((t) => previews[t.id]?.status === "ready");

  return (
    <div className="space-y-5">
      {/* Toggle sidebar + bouton générer */}
      <div className="flex items-center justify-between">
        {onSidebarChange && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">Sidebar :</span>
            {(["left", "right"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => onSidebarChange(pos)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  sidebarPosition === pos
                    ? "bg-or-500/20 text-or-300 border border-or-500/40"
                    : "bg-marine-700 text-muted border border-marine-400/20 hover:border-marine-300/40"
                }`}
              >
                {pos === "left" ? "◀ Gauche" : "Droite ▶"}
              </button>
            ))}
          </div>
        )}

        {!allReady && (
          <button
            onClick={generateAllPreviews}
            disabled={generatingAll}
            className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
          >
            {generatingAll ? "Compilation en cours..." : "Compiler tous les aperçus"}
          </button>
        )}
      </div>

      {/* Templates principaux */}
      {mainTemplates.length > 0 && (
        <div>
          <h4 className="text-sm text-muted uppercase tracking-wider mb-3">Modèles principaux</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {mainTemplates.map((tpl) => (
              <TemplatePreviewCard
                key={tpl.id}
                template={tpl}
                preview={previews[tpl.id] || { status: "idle" }}
                selected={selectedId === tpl.id}
                onClick={() => onSelect(tpl.id)}
                onGenerate={() => generatePreview(tpl.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Templates fancy */}
      {fancyTemplates.length > 0 && (
        <div>
          <h4 className="text-sm text-muted uppercase tracking-wider mb-3">Modèles thématiques</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {fancyTemplates.map((tpl) => (
              <TemplatePreviewCard
                key={tpl.id}
                template={tpl}
                preview={previews[tpl.id] || { status: "idle" }}
                selected={selectedId === tpl.id}
                onClick={() => onSelect(tpl.id)}
                onGenerate={() => generatePreview(tpl.id)}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplatePreviewCard({
  template, preview, selected, onClick, onGenerate, compact,
}: {
  template: TemplateCardInfo;
  preview: PreviewState;
  selected: boolean;
  onClick: () => void;
  onGenerate: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border-2 overflow-hidden transition-all group ${
        selected
          ? "border-or-500/60 shadow-lg shadow-or-500/15 ring-1 ring-or-500/30"
          : "border-marine-400/20 hover:border-marine-300/40"
      }`}
    >
      {/* Zone aperçu PDF */}
      <div className={`${compact ? "h-28" : "h-44"} relative overflow-hidden bg-marine-900 flex items-center justify-center`}>
        {preview.status === "ready" ? (
          <Document file={preview.pdfData} loading={null} error={null}>
            <Page
              pageNumber={1}
              width={compact ? 130 : 200}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        ) : preview.status === "generating" ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-6 h-6 border-2 border-or-500 border-t-transparent rounded-full" />
            <span className="text-xs text-muted">Compilation...</span>
          </div>
        ) : preview.status === "error" ? (
          <div className="flex flex-col items-center gap-1 px-2">
            <span className="text-red-400 text-xs">Erreur</span>
            <button
              onClick={(e) => { e.stopPropagation(); onGenerate(); }}
              className="text-xs text-or-300 hover:text-or-200 underline"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onGenerate(); }}
            className="flex flex-col items-center gap-1.5 text-muted hover:text-or-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">Aperçu</span>
          </button>
        )}

        {selected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-or-500 flex items-center justify-center text-on-accent text-[10px] font-bold shadow-md">
            ✓
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`${compact ? "p-2" : "p-2.5"} bg-marine-800`}>
        <div className={`font-semibold ${compact ? "text-xs" : "text-sm"} ${selected ? "text-or-300" : "text-creme-200"} truncate`}>
          {template.name}
        </div>
        {!compact && (
          <div className="text-xs text-muted mt-0.5 line-clamp-2">{template.description}</div>
        )}
      </div>
    </button>
  );
}
