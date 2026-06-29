import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Classification } from "../../lib/editor-types";

// Cache global des suggestions — partagé entre toutes les instances
let cachedSuggestions: { types: string[]; themes: string[]; niveaux: string[] } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

async function fetchSuggestions(): Promise<{ types: string[]; themes: string[]; niveaux: string[] }> {
  const now = Date.now();
  if (cachedSuggestions && now - cacheTimestamp < CACHE_TTL) {
    return cachedSuggestions;
  }
  try {
    // list_all_tags retourne tous les tags mélangés — on fait aussi un appel dédié
    // En attendant, on récupère les valeurs existantes depuis les projets
    const projects = await invoke<Array<Record<string, unknown>>>("list_projects");
    const types = new Set<string>();
    const themes = new Set<string>();
    const niveaux = new Set<string>();
    for (const p of projects) {
      const cls = p.classification as Classification | undefined;
      if (cls) {
        cls.types?.forEach((t) => types.add(t));
        cls.themes?.forEach((t) => themes.add(t));
        cls.niveaux?.forEach((t) => niveaux.add(t));
      }
      // Rétrocompatibilité avec l'ancien format
      const rt = p.resource_types as string[] | undefined;
      const th = p.themes as string[] | undefined;
      const nv = p.niveaux as string[] | undefined;
      if (rt) rt.forEach((t) => types.add(t));
      if (th) th.forEach((t) => themes.add(t));
      if (nv) nv.forEach((t) => niveaux.add(t));
    }
    cachedSuggestions = {
      types: Array.from(types).sort(),
      themes: Array.from(themes).sort(),
      niveaux: Array.from(niveaux).sort(),
    };
    cacheTimestamp = now;
    return cachedSuggestions;
  } catch {
    return cachedSuggestions || { types: [], themes: [], niveaux: [] };
  }
}

export function invalidateClassificationCache() {
  cachedSuggestions = null;
  cacheTimestamp = 0;
}

interface ClassificationEditorProps {
  classification: Classification;
  onUpdate: (classification: Classification) => void;
  sectionRef?: (el: HTMLElement | null) => void;
}

const CATEGORIES: Array<{
  key: keyof Classification;
  label: string;
  icon: string;
  placeholder: string;
}> = [
  { key: "types", label: "Type de ressource", icon: "🎯", placeholder: "ex : Cours, Exercices, Évaluation..." },
  { key: "themes", label: "Thème", icon: "📚", placeholder: "ex : Fractions, Géométrie, Probabilités..." },
  { key: "niveaux", label: "Niveau", icon: "🎓", placeholder: "ex : 6ème, 4ème, 2nde, Terminale..." },
];

export function ClassificationEditor({ classification, onUpdate, sectionRef }: ClassificationEditorProps) {
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({ types: [], themes: [], niveaux: [] });

  useEffect(() => {
    fetchSuggestions().then((s) => setSuggestions(s));
  }, []);

  function handleAdd(key: keyof Classification, value: string) {
    const v = value.trim();
    if (!v || classification[key].includes(v)) return;
    onUpdate({ ...classification, [key]: [...classification[key], v] });
  }

  function handleRemove(key: keyof Classification, value: string) {
    onUpdate({ ...classification, [key]: classification[key].filter((t) => t !== value) });
  }

  return (
    <section ref={sectionRef}>
      <h3 className="section-title mb-3">
        <span>🏷</span> Classification
      </h3>
      <div className="card p-3 space-y-3">
        {CATEGORIES.map((cat) => (
          <CategoryField
            key={cat.key}
            icon={cat.icon}
            label={cat.label}
            placeholder={cat.placeholder}
            values={classification[cat.key]}
            suggestions={suggestions[cat.key] || []}
            onAdd={(v) => handleAdd(cat.key, v)}
            onRemove={(v) => handleRemove(cat.key, v)}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryField({
  icon, label, placeholder, values, suggestions, onAdd, onRemove,
}: {
  icon: string;
  label: string;
  placeholder: string;
  values: string[];
  suggestions: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = input.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(input.toLowerCase()) && !values.includes(s))
    : suggestions.filter((s) => !values.includes(s));

  function handleSubmit(value: string) {
    onAdd(value);
    setInput("");
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      handleSubmit(input.trim());
    }
    if (e.key === "Escape") setShowDropdown(false);
    if (e.key === "Backspace" && !input && values.length > 0) {
      onRemove(values[values.length - 1]);
    }
  }

  return (
    <div ref={containerRef}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">{icon}</span>
        <label className="text-xs font-medium text-creme-200">{label}</label>
      </div>
      {/* Chips */}
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs
                       bg-or-500/15 text-or-300 border border-or-500/25"
          >
            {v}
            <button
              onClick={() => onRemove(v)}
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center
                         hover:bg-or-500/30 text-or-400 hover:text-or-200 transition-colors text-xs"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 bg-marine-800 border border-marine-400/25 rounded-lg text-xs text-creme-200
                     placeholder:text-muted-dark focus:outline-none focus:border-or-500/50 focus:ring-1 focus:ring-or-500/30"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-marine-700 border border-marine-400/30
                          rounded-lg shadow-xl overflow-hidden max-h-32 overflow-y-auto">
            {filtered.slice(0, 6).map((s) => (
              <button
                key={s}
                onClick={() => handleSubmit(s)}
                className="w-full text-left px-3 py-1.5 text-xs text-creme-200 hover:bg-or-500/10
                           transition-colors border-b border-marine-400/5 last:border-b-0"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
