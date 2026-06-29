import { useState } from "react";

interface AiPromptModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (userPrompt: string) => void;
  documentCount: number;
  isModifyMode?: boolean;
}

export function AiPromptModal({ open, onClose, onGenerate, documentCount, isModifyMode = false }: AiPromptModalProps) {
  const [prompt, setPrompt] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="card !rounded-xl !shadow-2xl w-full max-w-lg mx-4">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/30">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.591.659H9.061a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2 2 0 01-2 2H7a2 2 0 01-2-2v-2.5" />
            </svg>
            <h2 className="section-title !text-base !mb-0 !text-purple-300">
              {isModifyMode ? "Modifier par IA" : "Compléter par IA"}
            </h2>
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
        <div className="px-6 py-4 space-y-4">
          {isModifyMode ? (
            <p className="text-sm text-muted">
              L'IA va <span className="text-purple-300 font-medium">modifier le contenu existant</span> de la fiche
              en tenant compte de vos instructions.
              {documentCount > 0 && (
                <> Les <span className="text-purple-300 font-medium">{documentCount} document{documentCount > 1 ? "s" : ""}</span> lié{documentCount > 1 ? "s" : ""} seront aussi pris en compte.</>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted">
              L'IA va analyser{" "}
              <span className="text-purple-300 font-medium">{documentCount} document{documentCount > 1 ? "s" : ""}</span>{" "}
              lié{documentCount > 1 ? "s" : ""} pour compléter les champs vides de la fiche.
            </p>
          )}

          <div>
            <label className="block text-sm text-marine-200/60 mb-1">
              {isModifyMode ? "Que souhaitez-vous modifier ? (optionnel)" : "Instructions supplémentaires (optionnel)"}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isModifyMode
                ? "Ex : Reformule la section déroulement, ajoute plus de détails sur les compétences..."
                : "Ex : Insister sur les compétences du cycle 4, mentionner l'utilisation de GeoGebra..."
              }
              rows={4}
              className="input-field text-sm w-full resize-none !border-purple-500/30 focus:!border-purple-400"
            />
          </div>
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-marine-200/10">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-1.5">
            Annuler
          </button>
          <button
            onClick={() => {
              onGenerate(prompt);
              setPrompt("");
            }}
            className="text-sm px-5 py-1.5 rounded-md border border-purple-500/40 bg-purple-900/30 text-purple-200 hover:bg-purple-800/40 transition-colors font-medium"
          >
            {isModifyMode ? "Modifier" : "Générer"}
          </button>
        </div>
      </div>
    </div>
  );
}
