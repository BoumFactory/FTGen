import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ExportMode, ExportRecord, LinkedDocument } from "../lib/editor-types";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  pdfPath: string;
  projectId: string;
  title: string;
  linkedDocuments: LinkedDocument[];
  selectedDocIds: Set<string>;
}

const MODE_INFO: Record<ExportMode, { label: string; icon: string; description: string }> = {
  pdf_separate: {
    label: "PDF séparé + ZIP fichiers",
    icon: "📄📦",
    description: "Le PDF à part, les fichiers associés dans un ZIP",
  },
  zip_all: {
    label: "Tout en ZIP",
    icon: "📦",
    description: "PDF + fichiers associés dans une archive unique",
  },
  no_zip: {
    label: "Sans ZIP",
    icon: "📁",
    description: "Tous les fichiers copiés à plat dans le dossier",
  },
};

function titleToSlug(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*']/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    || "export";
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function shortenPath(p: string, maxLen = 50): string {
  if (p.length <= maxLen) return p;
  const parts = p.replace(/\\/g, "/").split("/");
  if (parts.length <= 3) return p;
  return parts[0] + "/.../" + parts.slice(-2).join("/");
}

export function ExportModal({
  open: isOpen, onClose, pdfPath, projectId, title, linkedDocuments, selectedDocIds,
}: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>("pdf_separate");
  const [destDir, setDestDir] = useState("");
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [customName, setCustomName] = useState("");

  const selectedDocs = linkedDocuments.filter((d) => selectedDocIds.has(d.id));
  const hasLinkedFiles = selectedDocs.length > 0;

  // Nom de base : personnalisé ou auto-généré
  const slug = customName.trim() ? titleToSlug(customName) : titleToSlug(title);
  const baseName = `fiche_technique_${slug}`;
  const linkedZipName = `fichiers_lies_${slug}`;

  // Preview des fichiers qui seront créés selon le mode
  const outputPreview = useMemo(() => {
    const files: Array<{ name: string; icon: string; type: string }> = [];
    if (mode === "zip_all" && hasLinkedFiles) {
      files.push({ name: `${baseName}.zip`, icon: "📦", type: "ZIP (PDF + fichiers)" });
    } else if (mode === "pdf_separate") {
      files.push({ name: `${baseName}.pdf`, icon: "📄", type: "PDF" });
      if (hasLinkedFiles) {
        files.push({ name: `${linkedZipName}.zip`, icon: "📦", type: "ZIP fichiers associés" });
      }
    } else {
      // no_zip
      files.push({ name: `${baseName}.pdf`, icon: "📄", type: "PDF" });
      for (const doc of selectedDocs) {
        const ext = doc.displayName.split(".").pop() || "";
        files.push({ name: doc.displayName, icon: "📎", type: ext.toUpperCase() });
      }
    }
    return files;
  }, [mode, baseName, linkedZipName, hasLinkedFiles, selectedDocs]);

  // Charger l'historique + pré-remplir destination
  useEffect(() => {
    if (!isOpen) return;
    setCustomName("");
    invoke<ExportRecord[]>("get_export_history", { projectId })
      .then((h) => {
        setHistory(h);
        if (h.length > 0 && !destDir) setDestDir(h[0].destination);
      })
      .catch(() => setHistory([]));
  }, [isOpen, projectId]);

  // Si pas de fichiers liés, forcer un mode compatible
  useEffect(() => {
    if (!hasLinkedFiles && mode === "zip_all") setMode("no_zip");
  }, [hasLinkedFiles, mode]);

  async function handleBrowseDir() {
    try {
      const selected = await open({
        directory: true,
        title: "Choisir le dossier d'export",
        defaultPath: destDir || undefined,
      });
      if (selected) setDestDir(selected as string);
    } catch (err) {
      console.error("Erreur sélection dossier:", err);
    }
  }

  async function handleExport() {
    if (!destDir || !pdfPath) return;
    setExporting(true);
    try {
      const linkedPaths = selectedDocs.map((d) => d.path);
      const result = await invoke<{ exportedFiles: string[]; destination: string }>("export_advanced", {
        options: {
          mode,
          pdfPath,
          destinationDir: destDir,
          baseName,
          linkedFiles: linkedPaths,
        },
      });

      // Sauvegarder dans l'historique
      const record: ExportRecord = {
        date: new Date().toISOString(),
        destination: result.destination,
        mode,
        files: result.exportedFiles,
        base_name: baseName,
      };
      await invoke("save_export_record", { projectId, record }).catch(() => {});
      setHistory((prev) => [record, ...prev].slice(0, 20));

      onClose();

      // Ouvrir le dossier automatiquement
      if (result.exportedFiles.length > 0) {
        await invoke("show_in_explorer", { path: result.destination }).catch(() => {});
      }
    } catch (err) {
      console.error("Erreur export:", err);
      alert(`Erreur export : ${String(err)}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleOpenFolder(path: string) {
    await invoke("show_in_explorer", { path }).catch(() => {});
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-marine-700 border-2 border-marine-300/30 rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-marine-400/20">
          <h2 className="text-lg font-bold text-creme-200">📤 Exporter le projet</h2>
          <button onClick={onClose} className="text-muted hover:text-creme-200 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-5">
          {/* Nom personnalisable */}
          <section>
            <h3 className="text-sm font-semibold text-or-400 uppercase tracking-wider mb-2">Nom du document</h3>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={title}
              className="input-field text-sm w-full"
            />
            <p className="text-xs text-muted mt-1.5">
              Préfixe automatique : <code className="text-or-300">fiche_technique_</code>
            </p>
          </section>

          {/* Mode d'export */}
          <section>
            <h3 className="text-sm font-semibold text-or-400 uppercase tracking-wider mb-2">Mode d'export</h3>
            <div className="space-y-2">
              {(Object.entries(MODE_INFO) as [ExportMode, typeof MODE_INFO[ExportMode]][]).map(([key, info]) => {
                const disabled = !hasLinkedFiles && key === "zip_all";
                return (
                  <button
                    key={key}
                    onClick={() => !disabled && setMode(key)}
                    disabled={disabled}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      mode === key
                        ? "border-or-500/60 bg-or-500/10"
                        : disabled
                        ? "border-marine-400/10 opacity-40 cursor-not-allowed"
                        : "border-marine-400/20 hover:border-marine-300/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{info.icon}</span>
                      <div>
                        <div className={`font-medium text-sm ${mode === key ? "text-or-300" : "text-creme-200"}`}>
                          {info.label}
                        </div>
                        <div className="text-xs text-muted">{info.description}</div>
                      </div>
                      {mode === key && (
                        <span className="ml-auto text-or-500 text-sm font-bold">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {!hasLinkedFiles && (
              <p className="text-xs text-muted mt-2 italic">Aucun fichier associé sélectionné — export PDF uniquement</p>
            )}
          </section>

          {/* Preview des fichiers générés */}
          <section>
            <h3 className="text-sm font-semibold text-or-400 uppercase tracking-wider mb-2">
              Fichiers générés ({outputPreview.length})
            </h3>
            <div className="card-inset px-3 py-2 space-y-1.5">
              {outputPreview.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span>{f.icon}</span>
                  <code className="text-creme-200 break-all flex-1 text-xs">{f.name}</code>
                  <span className="text-xs text-muted shrink-0">{f.type}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Destination */}
          <section>
            <h3 className="text-sm font-semibold text-or-400 uppercase tracking-wider mb-2">Destination</h3>
            <div className="flex gap-2">
              <button
                onClick={handleBrowseDir}
                className="flex-1 text-left px-4 py-2.5 card-inset rounded-lg hover:border-or-500/40 transition-colors"
              >
                {destDir ? (
                  <span className="text-sm text-creme-200 break-all">{shortenPath(destDir)}</span>
                ) : (
                  <span className="text-sm text-muted italic">Choisir un dossier...</span>
                )}
              </button>
              {destDir && (
                <button
                  onClick={() => handleOpenFolder(destDir)}
                  className="px-3 py-2 rounded-lg border-2 border-marine-400/20 hover:border-marine-300/40 text-muted hover:text-creme-200 transition-colors"
                  title="Ouvrir dans l'explorateur"
                >
                  📂
                </button>
              )}
            </div>
          </section>

          {/* Historique */}
          {history.length > 0 && (
            <section>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm text-muted hover:text-creme-200 transition-colors"
              >
                <span className={`text-xs transition-transform ${showHistory ? "rotate-90" : ""}`}>▶</span>
                <span className="font-semibold text-or-400 uppercase tracking-wider text-xs">
                  Historique ({history.length})
                </span>
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1.5 max-h-40 overflow-auto">
                  {history.map((rec, i) => (
                    <div key={i} className="card-inset px-3 py-2 flex items-center gap-3 group/hist">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-creme-200 truncate">{rec.base_name}</div>
                        <div className="text-xs text-muted truncate" title={rec.destination}>
                          {formatDate(rec.date)} — {shortenPath(rec.destination, 35)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenFolder(rec.destination)}
                        className="shrink-0 px-2 py-1 rounded text-xs border border-marine-400/20 text-muted hover:text-or-300 hover:border-or-500/40 transition-colors opacity-0 group-hover/hist:opacity-100"
                        title="Ouvrir le dossier"
                      >
                        📂 Ouvrir
                      </button>
                      <button
                        onClick={() => setDestDir(rec.destination)}
                        className="shrink-0 px-2 py-1 rounded text-xs border border-marine-400/20 text-muted hover:text-or-300 hover:border-or-500/40 transition-colors opacity-0 group-hover/hist:opacity-100"
                        title="Réutiliser cette destination"
                      >
                        ↩
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-marine-400/20">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
            Annuler
          </button>
          <button
            onClick={handleExport}
            disabled={!destDir || exporting}
            className="btn-primary text-sm px-6 py-2.5 disabled:opacity-40"
          >
            {exporting ? "Export en cours..." : `📤 Exporter (${outputPreview.length} fichier${outputPreview.length > 1 ? "s" : ""})`}
          </button>
        </div>
      </div>
    </div>
  );
}
