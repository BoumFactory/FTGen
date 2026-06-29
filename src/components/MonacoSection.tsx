import { useState, useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { Snippet, SnippetCategory } from "../lib/types";
import { getSnippetsForCategory } from "../lib/snippets";
import { registerLatexCompletionProvider } from "../lib/latex-completion";

interface MonacoSectionProps {
  title: string;
  icon: string;
  value: string;
  onChange: (value: string) => void;
  fontSize?: number;
  snippetCategory?: SnippetCategory;
  sectionId?: string;
  forceExpand?: number;
  projectImages?: string[];
  onImportImage?: () => void;
}

export function MonacoSection({
  title,
  icon,
  value,
  onChange,
  fontSize = 14,
  snippetCategory = "general",
  sectionId,
  forceExpand,
  projectImages = [],
  onImportImage,
}: MonacoSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [editorHeight, setEditorHeight] = useState(200);
  const [imageDropdownOpen, setImageDropdownOpen] = useState(false);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const disposableRef = useRef<{ dispose: () => void } | null>(null);
  const imageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceExpand && forceExpand > 0) {
      setExpanded(true);
    }
  }, [forceExpand]);

  const snippets = getSnippetsForCategory(snippetCategory);

  useEffect(() => {
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  // Fermer le dropdown image au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (imageDropdownRef.current && !imageDropdownRef.current.contains(e.target as Node)) {
        setImageDropdownOpen(false);
      }
    }
    if (imageDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [imageDropdownOpen]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    disposableRef.current?.dispose();
    disposableRef.current = registerLatexCompletionProvider(monaco, snippetCategory);
  };

  const insertSnippet = (code: string) => {
    onChange(value + code);
  };

  const insertImage = (filename: string) => {
    const code = `\\includegraphics[width=0.8\\linewidth]{images/${filename}}`;
    onChange(value + code);
    setImageDropdownOpen(false);
  };

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startHeight: editorHeight };

      const handleDragMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = ev.clientY - dragRef.current.startY;
        const newHeight = Math.max(100, Math.min(600, dragRef.current.startHeight + delta));
        setEditorHeight(newHeight);
      };

      const handleDragEnd = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
      };

      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
    },
    [editorHeight]
  );

  const editorOptions = {
    minimap: { enabled: false },
    fontSize,
    lineNumbers: "off" as const,
    wordWrap: "on" as const,
    scrollBeyondLastLine: false,
    padding: { top: 8 },
    renderLineHighlight: "none" as const,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    suggest: {
      showSnippets: true,
      showKeywords: true,
    },
  };

  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  const imageButton = (
    <div className="relative inline-block" ref={imageDropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setImageDropdownOpen(!imageDropdownOpen);
        }}
        className="chip chip-inactive text-xs !px-2 !py-1 flex items-center gap-1"
        title="Insérer une image"
      >
        Image
      </button>
      {imageDropdownOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-marine-700 border border-or-500/30 rounded-lg shadow-xl min-w-[220px] py-1">
          {projectImages.length > 0 ? (
            <>
              <p className="text-xs text-muted px-3 py-1 border-b border-marine-500/30">Images du projet</p>
              {projectImages.map((img) => (
                <button
                  key={img}
                  onClick={(e) => {
                    e.stopPropagation();
                    insertImage(img);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-creme-200 hover:bg-or-500/15 hover:text-or-300 transition-colors truncate"
                  title={img}
                >
                  {img}
                </button>
              ))}
              <div className="border-t border-marine-500/30 mt-1 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageDropdownOpen(false);
                    onImportImage?.();
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-or-400 hover:bg-or-500/15 transition-colors"
                >
                  + Importer une image...
                </button>
              </div>
            </>
          ) : (
            <div className="px-3 py-3 text-center">
              <p className="text-xs text-muted mb-2">Aucune image dans le projet</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageDropdownOpen(false);
                  onImportImage?.();
                }}
                className="text-xs bg-or-500/20 text-or-300 border border-or-500/40 rounded px-3 py-1"
              >
                Importer une image
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const snippetsBar = (
    <div className="flex flex-wrap gap-1 bg-marine-700/50 -mx-1 px-1 py-1.5 rounded-md items-center">
      {snippets.map((s: Snippet) => (
        <button
          key={s.label}
          onClick={(e) => {
            e.stopPropagation();
            insertSnippet(s.code);
          }}
          className="chip chip-inactive text-xs !px-2 !py-1"
          title={s.description || s.label}
        >
          {s.label}
        </button>
      ))}
      <div className="w-px h-4 bg-marine-400/30 mx-1" />
      {imageButton}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-marine-700">
        <div className="flex items-center justify-between px-4 py-2 bg-marine-800 border-b border-or-500/20">
          <h3 className="text-base font-medium text-or-400 flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            {title}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              {wordCount} mots · {charCount} car.
            </span>
            <button
              onClick={() => setFullscreen(false)}
              className="btn-secondary text-xs px-3 py-1"
            >
              Quitter le plein écran
            </button>
          </div>
        </div>

        <div className="px-4 py-2">
          {snippetsBar}
        </div>

        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="latex"
            theme="vs-dark"
            value={value}
            onChange={(val) => onChange(val || "")}
            onMount={handleEditorMount}
            options={{
              ...editorOptions,
              lineNumbers: "on",
              minimap: { enabled: true },
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${expanded ? 'border-l-3 border-l-or-500/40' : ''}`}>
      <div
        className="flex items-center justify-between cursor-pointer bg-marine-600/50 -m-4 mb-0 px-4 py-3 rounded-t-lg border-b border-or-500/20"
        onClick={() => setExpanded(!expanded)}
      >
        <h4 className="text-base font-medium text-or-300 flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          {title}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">
            {charCount > 0 ? `${wordCount} mots · ${charCount} car.` : "vide"}
          </span>
          {expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullscreen(true);
              }}
              className="px-2 py-0.5 text-xs bg-marine-700 text-muted rounded
                         hover:bg-or-500/20 hover:text-or-300 transition-colors
                         border border-marine-400/15"
              title="Plein écran"
            >
              Plein écran
            </button>
          )}
          <svg
            className={`w-4 h-4 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {!expanded && value && (
        <p className="text-xs text-muted mt-2 line-clamp-2">{value.substring(0, 150)}...</p>
      )}

      {expanded && (
        <div className="mt-3 space-y-2">
          {snippetsBar}

          <div className="card-inset !p-0 overflow-hidden">
            <Editor
              height={`${editorHeight}px`}
              defaultLanguage="latex"
              theme="vs-dark"
              value={value}
              onChange={(val) => onChange(val || "")}
              onMount={handleEditorMount}
              options={editorOptions}
            />
          </div>

          <div
            onMouseDown={handleDragStart}
            className="h-2 cursor-row-resize flex items-center justify-center group"
          >
            <div className="w-12 h-1 bg-marine-400/30 rounded group-hover:bg-or-500/50 transition-colors" />
          </div>
        </div>
      )}
    </div>
  );
}
