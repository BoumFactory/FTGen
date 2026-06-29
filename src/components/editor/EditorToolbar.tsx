import type { CompileResult } from "../../lib/types";
import type { SaveStatus, EditorTab } from "../../lib/editor-types";
import { SAVE_STATUS_LABEL, SAVE_STATUS_COLOR } from "../../lib/editor-types";

interface EditorToolbarProps {
  templateName: string;
  projectId: string;
  saveStatus: SaveStatus;
  compiling: boolean;
  compileResult: CompileResult | null;
  activeTab: EditorTab;
  onBack: () => void;
  onSave: () => void;
  onCompile: () => void;
  onTabChange: (tab: EditorTab) => void;
  onSettingsOpen: () => void;
  onExportPdf: () => void;
  onShowProjectFolder?: () => void;
  hasPdf: boolean;
  onAiGenerate?: () => void;
  aiGenerating?: boolean;
  hasLinkedDocuments?: boolean;
  hasExistingContent?: boolean;
}

export function EditorToolbar({
  templateName, projectId, saveStatus, compiling, compileResult,
  activeTab, onBack, onSave, onCompile,
  onTabChange, onSettingsOpen, onExportPdf, onShowProjectFolder, hasPdf,
  onAiGenerate, aiGenerating = false, hasLinkedDocuments = false, hasExistingContent = false,
}: EditorToolbarProps) {
  return (
    <>
      {/* Toolbar */}
      <header className="bg-marine-800 border-b border-or-500/40 px-3 py-1.5 flex items-center gap-2 shadow-md">
        <button onClick={onBack} className="btn-secondary text-sm px-3 py-1.5">← Retour</button>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-base font-medium text-or-400">{templateName}</span>
          <span className="text-marine-300">|</span>
          <span className="text-sm text-muted">{projectId}</span>
          <span className="text-marine-300">|</span>
          <span className={`text-xs ${SAVE_STATUS_COLOR[saveStatus]}`}>{SAVE_STATUS_LABEL[saveStatus]}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSettingsOpen} className="btn-secondary text-sm px-3 py-1.5" title="Configuration">
            ⚙ Config
          </button>
          <button onClick={onSave} className="btn-secondary text-sm px-3 py-1.5">Sauvegarder</button>
          {onAiGenerate && (
            <button
              onClick={onAiGenerate}
              disabled={aiGenerating || (!hasLinkedDocuments && !hasExistingContent)}
              className={`text-sm px-4 py-1.5 rounded-md border transition-colors ${
                aiGenerating
                  ? "border-purple-500/30 bg-purple-900/20 text-purple-300 animate-pulse"
                  : (hasLinkedDocuments || hasExistingContent)
                    ? "border-purple-500/30 bg-purple-900/20 text-purple-300 hover:bg-purple-800/30"
                    : "border-marine-400/20 bg-marine-700/50 text-muted cursor-not-allowed"
              }`}
              title={
                hasExistingContent
                  ? "Modifier le contenu de la fiche avec l'IA"
                  : hasLinkedDocuments
                    ? "Compléter la fiche avec l'IA"
                    : "Liez au moins un document pour utiliser l'IA"
              }
            >
              {aiGenerating ? "Génération..." : hasExistingContent ? "Modifier par IA" : "Compléter par IA"}
            </button>
          )}
          <button onClick={onCompile} disabled={compiling} className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50">
            {compiling ? "Compilation..." : "▶ Compiler"}
          </button>
          {hasPdf && (
            <button
              onClick={onExportPdf}
              className="text-sm px-3 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-900/20
                         text-emerald-300 hover:bg-emerald-900/40 transition-colors"
              title="Exporter le PDF et les fichiers associés"
            >
              📤 Exporter
            </button>
          )}
          {onShowProjectFolder && (
            <button
              onClick={onShowProjectFolder}
              className="text-sm px-2.5 py-1.5 rounded-md border border-marine-400/20 bg-marine-700
                         text-muted hover:text-creme-200 hover:border-marine-300/40 transition-colors"
              title="Afficher le dossier du projet dans l'explorateur"
            >
              📂
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-marine-800 border-b border-marine-400/20 px-3 flex gap-1">
        {(["edit", "split", "preview", "log"] as const).map((tab) => (
          <button key={tab} onClick={() => onTabChange(tab)}
            className={`px-4 py-2 text-base font-medium transition-colors border-b-2 ${
              activeTab === tab ? "border-or-500 text-or-400" : "border-transparent text-muted hover:text-creme-200"
            }`}>
            {tab === "edit" && "Édition"}
            {tab === "split" && "Éditeur + PDF"}
            {tab === "preview" && "Aperçu PDF"}
            {tab === "log" && `Log${compileResult?.errors.length ? ` (${compileResult.errors.length})` : ""}`}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs text-muted-dark py-1">
          <kbd className="px-1 py-0.5 bg-marine-700 rounded text-muted border border-marine-400/20">Ctrl+S</kbd>
          <kbd className="px-1 py-0.5 bg-marine-700 rounded text-muted border border-marine-400/20">Ctrl+B</kbd>
          <kbd className="px-1 py-0.5 bg-marine-700 rounded text-muted border border-marine-400/20">Ctrl+Molette</kbd>
          <span>Zoom</span>
        </div>
      </div>
    </>
  );
}
