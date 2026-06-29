import { useState, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type { LinkedDocument } from "../../lib/editor-types";

interface DocumentsPanelProps {
  linkedDocuments: LinkedDocument[];
  onAdd: (doc: LinkedDocument) => void;
  onRemove: (docId: string) => void;
  onUpdate: (docId: string, updates: Partial<LinkedDocument>) => void;
  sectionRef?: (el: HTMLDivElement | null) => void;
}

export function DocumentsPanel({
  linkedDocuments,
  onAdd,
  onRemove,
  onUpdate,
  sectionRef,
}: DocumentsPanelProps) {
  const [addMode, setAddMode] = useState(false);
  const [manualPath, setManualPath] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [label, setLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function extractFileName(path: string): string {
    const parts = path.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || path;
  }

  function createDocument(path: string, isDirectory = false) {
    const fileName = extractFileName(path);
    const doc: LinkedDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      path,
      label: label.trim() || fileName.replace(/\.[^.]+$/, ""),
      displayName: displayName.trim() || fileName,
      addedAt: new Date().toISOString(),
      isDirectory,
    };
    onAdd(doc);
    resetForm();
  }

  function resetForm() {
    setAddMode(false);
    setManualPath("");
    setDisplayName("");
    setLabel("");
  }

  async function handleBrowse() {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Tous les fichiers", extensions: ["*"] },
          { name: "PDF", extensions: ["pdf"] },
          { name: "LaTeX", extensions: ["tex"] },
          { name: "Images", extensions: ["png", "jpg", "jpeg", "svg"] },
        ],
      });
      if (selected) {
        const path = typeof selected === "string" ? selected : selected;
        setManualPath(path);
        if (!displayName) setDisplayName(extractFileName(path));
        if (!label) setLabel(extractFileName(path).replace(/\.[^.]+$/, ""));
        setAddMode(true);
      }
    } catch (err) {
      console.error("Erreur ouverture fichier:", err);
    }
  }

  async function handleBrowseFolder() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected) {
        const path = typeof selected === "string" ? selected : selected;
        const folderName = extractFileName(path);
        setManualPath(path);
        if (!displayName) setDisplayName(folderName);
        if (!label) setLabel(folderName);
        setAddMode(true);
      }
    } catch (err) {
      console.error("Erreur ouverture dossier:", err);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // @ts-expect-error: Electron/Tauri expose path on File
        const filePath = file.path || file.name;
        createDocument(filePath);
      }
    }
  }

  return (
    <div ref={sectionRef} className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title !mb-0">Documents liés</h3>
        <div className="flex gap-1">
          <button
            onClick={handleBrowseFolder}
            className="chip chip-inactive text-xs flex items-center gap-1"
            title="Ajouter un dossier"
          >
            + Dossier
          </button>
          <button
            onClick={handleBrowse}
            className="chip chip-inactive text-xs flex items-center gap-1"
          >
            + Fichier
          </button>
        </div>
      </div>

      {/* Liste des documents */}
      {linkedDocuments.length > 0 && (
        <div className="space-y-2 mb-3">
          {linkedDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isEditing={editingId === doc.id}
              onEdit={() => setEditingId(editingId === doc.id ? null : doc.id)}
              onRemove={() => onRemove(doc.id)}
              onUpdate={(updates) => {
                onUpdate(doc.id, updates);
                setEditingId(null);
              }}
            />
          ))}
        </div>
      )}

      {/* Zone d'ajout */}
      {addMode && (
        <div className="card-inset p-3 space-y-2 mb-3">
          <p className="text-xs text-or-400 font-semibold uppercase tracking-wider">Nouveau document</p>
          <input
            type="text"
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            placeholder="Chemin du fichier ou dossier..."
            className="input-field text-sm w-full"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (ID interne)..."
              className="input-field text-sm flex-1"
            />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nom affiché dans le PDF..."
              className="input-field text-sm flex-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="text-xs text-muted hover:text-creme-200 px-3 py-1">
              Annuler
            </button>
            <button
              onClick={() => { if (manualPath.trim()) createDocument(manualPath.trim()); }}
              disabled={!manualPath.trim()}
              className="text-xs bg-or-500/20 text-or-300 border border-or-500/40 rounded px-3 py-1 disabled:opacity-40"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Zone drag & drop */}
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => { if (!addMode) handleBrowse(); }}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-or-500/60 bg-or-500/10"
            : "border-marine-400/25 hover:border-marine-300/40 hover:bg-marine-600/20"
        }`}
      >
        <p className={`text-xs ${dragOver ? "text-or-300" : "text-muted"}`}>
          Glissez un fichier ici ou cliquez pour parcourir
        </p>
      </div>
    </div>
  );
}

function DocumentCard({
  doc,
  isEditing,
  onEdit,
  onRemove,
  onUpdate,
}: {
  doc: LinkedDocument;
  isEditing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<LinkedDocument>) => void;
}) {
  const [editDisplayName, setEditDisplayName] = useState(doc.displayName);
  const [editLabel, setEditLabel] = useState(doc.label);

  return (
    <div className="card-inset p-3 group/doc">
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
            placeholder="Nom affiché..."
            className="input-field text-sm w-full"
            autoFocus
          />
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder="Label..."
            className="input-field text-sm w-full"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={onEdit} className="text-xs text-muted hover:text-creme-200 px-2 py-1">
              Annuler
            </button>
            <button
              onClick={() => onUpdate({ displayName: editDisplayName, label: editLabel })}
              className="text-xs bg-or-500/20 text-or-300 border border-or-500/40 rounded px-2 py-1"
            >
              OK
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <span className="text-base mt-0.5">{doc.isDirectory ? "📁" : "📄"}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-creme-200 truncate">
              {doc.displayName}
              {doc.isDirectory && <span className="text-xs text-muted ml-1">(dossier)</span>}
            </div>
            <div className="text-xs text-muted truncate" title={doc.path}>{doc.path}</div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover/doc:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="w-6 h-6 flex items-center justify-center text-xs rounded bg-marine-700/80 text-muted hover:text-or-300 transition-colors"
              title="Modifier"
            >✎</button>
            <button
              onClick={onRemove}
              className="w-6 h-6 flex items-center justify-center text-xs rounded bg-marine-700/80 text-muted hover:text-red-300 transition-colors"
              title="Supprimer"
            >×</button>
          </div>
        </div>
      )}
    </div>
  );
}
