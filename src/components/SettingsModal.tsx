import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppConfig } from "../lib/types";
import { TemplateSelector } from "./TemplateSelector";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface LogoInfo {
  filename: string;
  path: string;
}

const DEFAULT_CONFIG: AppConfig = {
  ftgen_path: "",
  lualatex_path: "lualatex",
  compile_on_save: false,
  debounce_ms: 2000,
  preview_mode: "tab",
  theme: "dark",
  editor_font_size: 14,
  default_template: "template_academique",
  default_sidebar: "left" as const,
  logo_left: "logo-republique-francaise.png",
  logo_right: "logo_gt_ia_maths.png",
  ai_provider: "anthropic" as const,
  ai_api_key: "",
  ai_model: "claude-sonnet-4-20250514",
  ai_endpoint: "",
  compiler: "auto",
  font_package: "fourier",
};

// Suggestions statiques en fallback (si le chargement dynamique échoue)
const AI_MODEL_FALLBACK: Record<string, string[]> = {
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-sonnet-4-20250514"],
  openai: ["gpt-4o", "gpt-4o-mini"],
  mistral: ["mistral-large-latest"],
  ollama: ["llama3", "mixtral"],
};

interface AiModelInfo {
  id: string;
  display_name: string;
}

const AI_ENDPOINT_PLACEHOLDERS: Record<string, string> = {
  anthropic: "https://api.anthropic.com (par défaut)",
  openai: "https://api.openai.com (par défaut)",
  mistral: "https://api.mistral.ai (par défaut)",
  ollama: "http://localhost:11434",
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [availableLogos, setAvailableLogos] = useState<LogoInfo[]>([]);
  const [aiModels, setAiModels] = useState<AiModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [compilers, setCompilers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      invoke<AppConfig>("get_config").then((c) => setConfig(c)).catch(() => {});
      invoke<LogoInfo[]>("list_logos").then(setAvailableLogos).catch(() => {});
      invoke<Record<string, boolean>>("detect_compilers").then(setCompilers).catch(() => {});
    }
  }, [open]);

  // Charger les modèles dynamiquement quand le provider ou la clé change
  async function loadAiModels(provider?: string, key?: string, ep?: string) {
    const p = provider ?? config.ai_provider;
    const k = key ?? config.ai_api_key;
    const e = ep ?? config.ai_endpoint;
    if (!k && p !== "ollama") {
      setAiModels([]);
      setModelsError(null);
      return;
    }
    setLoadingModels(true);
    setModelsError(null);
    try {
      const models = await invoke<AiModelInfo[]>("list_ai_models", {
        provider: p,
        apiKey: k,
        endpoint: e,
      });
      setAiModels(models);
    } catch (err) {
      setModelsError(String(err));
      setAiModels([]);
    } finally {
      setLoadingModels(false);
    }
  }

  // Charger le nom du template sélectionné
  useEffect(() => {
    if (config.default_template) {
      invoke<Array<{ id: string; name: string }>>("get_templates")
        .then((templates) => {
          const found = templates.find((t) => t.id === config.default_template);
          setTemplateName(found?.name || config.default_template);
        })
        .catch(() => setTemplateName(config.default_template));
    }
  }, [config.default_template]);

  async function handleSave() {
    setSaving(true);
    try {
      await invoke("save_config", { config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Erreur sauvegarde config:", err);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  // Modale dédiée de navigation des templates
  if (showTemplateBrowser) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-marine-900/98">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-marine-200/10 bg-marine-800">
          <div>
            <h2 className="section-title !text-base !mb-0">Choisir le template par défaut</h2>
            <p className="text-xs text-muted mt-1">
              Sélectionnez un template et une position de sidebar. Les aperçus sont compilés avec des données d'exemple.
            </p>
          </div>
          <button
            onClick={() => setShowTemplateBrowser(false)}
            className="text-marine-200/40 hover:text-creme-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenu : TemplateSelector avec aperçus PDF */}
        <div className="flex-1 overflow-auto px-6 py-5">
          <TemplateSelector
            selectedId={config.default_template}
            onSelect={(templateId) => setConfig({ ...config, default_template: templateId })}
            sidebarPosition={config.default_sidebar}
            onSidebarChange={(pos) => setConfig({ ...config, default_sidebar: pos })}
          />
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-marine-200/10 bg-marine-800">
          <button
            onClick={() => setShowTemplateBrowser(false)}
            className="btn-primary text-sm px-5 py-2"
          >
            Valider le choix
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="card !rounded-xl !shadow-2xl w-full max-w-xl mx-4">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-marine-200/10">
          <h2 className="section-title !text-base">Configuration</h2>
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
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-auto">
          {/* Chemin .ftgen */}
          <div>
            <label className="block text-sm text-marine-200/60 mb-1">Dossier .ftgen</label>
            <input
              type="text"
              value={config.ftgen_path}
              onChange={(e) => setConfig({ ...config, ftgen_path: e.target.value })}
              placeholder="Chemin vers le dossier .ftgen"
              className="input-field text-sm"
            />
          </div>

          {/* Compilateur */}
          <div>
            <label className="block text-sm text-marine-200/60 mb-1">Compilateur LaTeX</label>
            <select
              value={config.compiler}
              onChange={(e) => setConfig({ ...config, compiler: e.target.value })}
              className="input-field text-sm w-full"
            >
              <option value="auto">Auto (Tectonic → LuaLaTeX → pdfLaTeX)</option>
              <option value="tectonic">Tectonic (intégré, autonome)</option>
              <option value="lualatex">LuaLaTeX</option>
              <option value="pdflatex">pdfLaTeX</option>
              <option value="xelatex">XeLaTeX</option>
            </select>
            <p className="text-xs text-muted-dark mt-1">
              {config.compiler === "auto"
                ? "Utilise Tectonic si disponible, sinon LuaLaTeX ou pdfLaTeX"
                : config.compiler === "tectonic"
                  ? "Tectonic télécharge automatiquement les packages — pas besoin de MiKTeX/TeX Live"
                  : "Nécessite une distribution LaTeX installée (MiKTeX ou TeX Live)"}
            </p>

            {/* Disponibilité des compilateurs */}
            {Object.keys(compilers).length > 0 && (
              <div className="mt-2 p-2.5 rounded-lg bg-marine-800/60 border border-marine-400/10">
                <div className="text-xs text-marine-200/50 mb-1.5 font-medium">Compilateurs détectés :</div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: "tectonic", label: "Tectonic", integrated: true },
                    { id: "lualatex", label: "LuaLaTeX" },
                    { id: "pdflatex", label: "pdfLaTeX" },
                    { id: "xelatex", label: "XeLaTeX" },
                  ].map((c) => {
                    const available = compilers[c.id];
                    const isSelected = config.compiler === c.id || (config.compiler === "auto" && available);
                    return (
                      <div key={c.id} className={`flex items-center gap-1.5 text-xs py-0.5 ${isSelected ? "text-creme-200" : "text-muted"}`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${available ? "bg-green-400" : "bg-red-400/60"}`} />
                        <span>{c.label}</span>
                        {"integrated" in c && available && (
                          <span className="text-[10px] text-green-400/70 ml-0.5">(intégré)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!compilers.tectonic && !compilers.lualatex && !compilers.pdflatex && !compilers.xelatex && (
                  <p className="text-xs text-red-400 mt-2 font-medium">
                    Aucun compilateur LaTeX détecté. Installez MiKTeX, TeX Live, ou sélectionnez Tectonic.
                  </p>
                )}
                {config.compiler !== "auto" && config.compiler !== "" && !compilers[config.compiler] && (
                  <p className="text-xs text-yellow-400 mt-2">
                    Le compilateur sélectionné n'est pas disponible sur cette machine.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Chemin LuaLaTeX (visible seulement si compilateur LaTeX) */}
          {(config.compiler === "lualatex" || config.compiler === "auto") && (
            <div>
              <label className="block text-sm text-marine-200/60 mb-1">Chemin LuaLaTeX (auto = détection automatique)</label>
              <input
                type="text"
                value={config.lualatex_path}
                onChange={(e) => setConfig({ ...config, lualatex_path: e.target.value })}
                placeholder="auto"
                className="input-field text-sm"
              />
            </div>
          )}

          {/* Police du document */}
          <div>
            <label className="block text-sm text-marine-200/60 mb-1">Police des documents</label>
            <select
              value={config.font_package}
              onChange={(e) => setConfig({ ...config, font_package: e.target.value })}
              className="input-field text-sm w-full"
            >
              {[
                { id: "fourier", name: "Fourier (Utopia)", tectonic: false },
                { id: "erewhon", name: "Erewhon (héritière d'Utopia)", tectonic: true },
                { id: "newpx", name: "New PX (Palatino)", tectonic: true },
                { id: "newtx", name: "New TX (Times)", tectonic: true },
                { id: "lmodern", name: "Latin Modern", tectonic: true },
                { id: "kpfonts", name: "KP Fonts (Kepler)", tectonic: true },
                { id: "scholax", name: "ScholaX (Century Schoolbook)", tectonic: true },
                { id: "libertinus", name: "Libertinus", tectonic: true },
                { id: "ebgaramond", name: "EB Garamond", tectonic: false },
                { id: "mathdesign-utopia", name: "MathDesign Utopia", tectonic: true },
              ].map((font) => {
                const disabled = config.compiler === "tectonic" && !font.tectonic;
                return (
                  <option key={font.id} value={font.id} disabled={disabled}>
                    {font.name}{disabled ? " (incompatible Tectonic)" : ""}
                  </option>
                );
              })}
            </select>
            {config.compiler === "tectonic" && !["erewhon","newpx","newtx","lmodern","kpfonts","scholax","libertinus","mathdesign-utopia"].includes(config.font_package) && (
              <p className="text-xs text-yellow-400 mt-1">
                ⚠ Cette police n'est pas compatible avec Tectonic. Choisissez une alternative ou passez à LuaLaTeX.
              </p>
            )}
          </div>

          {/* Taille police éditeur */}
          <div>
            <label className="block text-sm text-marine-200/60 mb-1">
              Taille de police de l'éditeur : {config.editor_font_size}px
            </label>
            <input
              type="range"
              min={10}
              max={24}
              value={config.editor_font_size}
              onChange={(e) => setConfig({ ...config, editor_font_size: Number(e.target.value) })}
              className="w-full accent-or-500"
            />
          </div>

          {/* Mode preview */}
          <div>
            <label className="block text-sm text-marine-200/60 mb-1">Mode aperçu</label>
            <div className="flex gap-2">
              {(["tab", "side"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setConfig({ ...config, preview_mode: mode })}
                  className={`px-4 py-1.5 text-sm rounded transition-colors ${
                    config.preview_mode === mode
                      ? "chip-active"
                      : "chip-inactive"
                  }`}
                >
                  {mode === "tab" ? "Onglet" : "Panneau latéral"}
                </button>
              ))}
            </div>
          </div>

          {/* Thème */}
          <div>
            <label className="block text-sm text-marine-200/60 mb-1">Apparence</label>
            <div className="flex gap-2">
              {([
                { id: "dark" as const, label: "Sombre", icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" },
                { id: "light" as const, label: "Clair", icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setConfig({ ...config, theme: t.id });
                    document.documentElement.classList.toggle("dark", t.id === "dark");
                  }}
                  className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded transition-colors ${
                    config.theme === t.id ? "chip-active" : "chip-inactive"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                  </svg>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template par défaut — bouton ouvrant la modale dédiée */}
          <div>
            <label className="block text-sm text-marine-200/60 mb-1">Template par défaut</label>
            <button
              onClick={() => setShowTemplateBrowser(true)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-marine-400/20 bg-marine-800 hover:border-or-500/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-or-500/10 flex items-center justify-center text-or-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm text-creme-200 font-medium">{templateName}</div>
                  <div className="text-xs text-muted">
                    Sidebar {config.default_sidebar === "left" ? "gauche" : "droite"}
                  </div>
                </div>
              </div>
              <svg className="w-4 h-4 text-muted group-hover:text-or-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Logos */}
          <div>
            <label className="block text-sm text-marine-200/60 mb-2">Logos des fiches</label>
            <div className="space-y-3">
              {/* Logo République (gauche) */}
              <LogoPicker
                label="Logo institutionnel (gauche)"
                value={config.logo_left}
                logos={availableLogos}
                onChange={(filename) => setConfig({ ...config, logo_left: filename })}
                onImport={async () => {
                  try {
                    const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
                    const path = await openDialog({ filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "svg", "pdf"] }] });
                    if (path) {
                      const logo = await invoke<LogoInfo>("import_logo", { sourcePath: path as string });
                      setAvailableLogos((prev) => [...prev, logo].sort((a, b) => a.filename.localeCompare(b.filename)));
                      setConfig({ ...config, logo_left: logo.filename });
                    }
                  } catch (err) { console.error("Erreur import logo:", err); }
                }}
              />
              {/* Logo GT (droite) */}
              <LogoPicker
                label="Logo groupe de travail (droite)"
                value={config.logo_right}
                logos={availableLogos}
                onChange={(filename) => setConfig({ ...config, logo_right: filename })}
                onImport={async () => {
                  try {
                    const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
                    const path = await openDialog({ filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "svg", "pdf"] }] });
                    if (path) {
                      const logo = await invoke<LogoInfo>("import_logo", { sourcePath: path as string });
                      setAvailableLogos((prev) => [...prev, logo].sort((a, b) => a.filename.localeCompare(b.filename)));
                      setConfig({ ...config, logo_right: logo.filename });
                    }
                  } catch (err) { console.error("Erreur import logo:", err); }
                }}
              />
            </div>
          </div>

          {/* Séparateur IA */}
          <div className="border-t border-purple-500/30 pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.591.659H9.061a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2 2 0 01-2 2H7a2 2 0 01-2-2v-2.5" />
              </svg>
              <h3 className="text-sm font-semibold text-purple-300">Intelligence Artificielle</h3>
            </div>

            {/* Provider */}
            <div className="mb-3">
              <label className="block text-sm text-marine-200/60 mb-1">Fournisseur</label>
              <select
                value={config.ai_provider}
                onChange={(e) => {
                  const provider = e.target.value as AppConfig["ai_provider"];
                  const models = AI_MODEL_FALLBACK[provider];
                  setAiModels([]);
                  setModelsError(null);
                  setConfig({
                    ...config,
                    ai_provider: provider,
                    ai_model: models?.[0] || "",
                    ai_endpoint: "",
                  });
                }}
                className="w-full text-sm bg-marine-800 text-creme-200 border border-purple-500/30 rounded px-3 py-1.5 focus:border-purple-400 outline-none"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="mistral">Mistral</option>
                <option value="ollama">Ollama (local)</option>
              </select>
            </div>

            {/* Clé API */}
            <div className="mb-3">
              <label className="block text-sm text-marine-200/60 mb-1">Clé API</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={config.ai_api_key}
                  onChange={(e) => setConfig({ ...config, ai_api_key: e.target.value })}
                  placeholder={config.ai_provider === "ollama" ? "Non requise pour Ollama" : "sk-..."}
                  className="input-field text-sm flex-1 !border-purple-500/30 focus:!border-purple-400"
                />
                <button
                  onClick={() => loadAiModels()}
                  disabled={loadingModels || (!config.ai_api_key && config.ai_provider !== "ollama")}
                  className="text-xs px-3 py-1.5 rounded-md border border-purple-500/30 bg-purple-900/20 text-purple-300 hover:bg-purple-800/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  title="Charger la liste des modèles disponibles"
                >
                  {loadingModels ? "..." : "Charger modèles"}
                </button>
              </div>
            </div>

            {/* Modèle */}
            <div className="mb-3">
              <label className="block text-sm text-marine-200/60 mb-1">Modèle</label>
              {aiModels.length > 0 ? (
                /* Liste déroulante dynamique */
                <select
                  value={config.ai_model}
                  onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                  className="w-full text-sm bg-marine-800 text-creme-200 border border-purple-500/30 rounded px-3 py-1.5 focus:border-purple-400 outline-none"
                >
                  {aiModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name}{m.display_name !== m.id ? ` (${m.id})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                /* Champ texte libre + suggestions statiques en fallback */
                <>
                  <input
                    type="text"
                    value={config.ai_model}
                    onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                    placeholder="Nom du modèle"
                    className="input-field text-sm !border-purple-500/30 focus:!border-purple-400"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(AI_MODEL_FALLBACK[config.ai_provider] || []).map((model) => (
                      <button
                        key={model}
                        onClick={() => setConfig({ ...config, ai_model: model })}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          config.ai_model === model
                            ? "border-purple-500/50 bg-purple-900/30 text-purple-300"
                            : "border-marine-400/20 text-muted hover:text-purple-300 hover:border-purple-500/30"
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {modelsError && (
                <p className="text-xs text-red-400 mt-1">{modelsError}</p>
              )}
              {aiModels.length > 0 && (
                <p className="text-xs text-green-400/70 mt-1">{aiModels.length} modèles disponibles</p>
              )}
            </div>

            {/* Endpoint personnalisé */}
            <div className="mb-3">
              <label className="block text-sm text-marine-200/60 mb-1">Endpoint personnalisé</label>
              <input
                type="text"
                value={config.ai_endpoint}
                onChange={(e) => setConfig({ ...config, ai_endpoint: e.target.value })}
                placeholder={AI_ENDPOINT_PLACEHOLDERS[config.ai_provider] || ""}
                className="input-field text-sm !border-purple-500/30 focus:!border-purple-400"
              />
              <p className="text-xs text-muted mt-1">Laisser vide pour utiliser l'endpoint par défaut du fournisseur.</p>
            </div>

            {/* Bouton test connexion */}
            <button
              onClick={async () => {
                try {
                  await invoke("generate_with_ai", {
                    config: {
                      provider: config.ai_provider,
                      api_key: config.ai_api_key,
                      model: config.ai_model,
                      endpoint: config.ai_endpoint || null,
                    },
                    schema: JSON.stringify({ fields: {}, checkboxes: {} }),
                    documents: [],
                    user_prompt: "",
                    system_prompt: "Réponds uniquement 'ok'.",
                  });
                  alert("Connexion réussie !");
                } catch (err) {
                  alert("Erreur de connexion : " + String(err));
                }
              }}
              className="text-sm px-4 py-1.5 rounded-md border border-purple-500/30 bg-purple-900/20 text-purple-300 hover:bg-purple-800/30 transition-colors"
            >
              Tester la connexion
            </button>
          </div>
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-marine-200/10">
          {saved && (
            <span className="text-sm text-green-400">Configuration sauvegardée</span>
          )}
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-1.5">
            Fermer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sélecteur de logo avec dropdown et bouton d'import */
function LogoPicker({ label, value, logos, onChange, onImport }: {
  label: string;
  value: string;
  logos: LogoInfo[];
  onChange: (filename: string) => void;
  onImport: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-marine-400/20">
        {value ? (
          <span className="text-[11px] text-muted text-center leading-tight px-0.5 break-all">
            {value.replace(/\.(png|jpg|jpeg|svg|pdf)$/i, "").slice(0, 12)}
          </span>
        ) : (
          <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
          </svg>
        )}
      </div>
      <div className="flex-1">
        <div className="text-xs text-marine-200/50 mb-1">{label}</div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs bg-marine-800 text-creme-200 border border-marine-400/20 rounded px-2 py-1.5 focus:border-or-500/40 outline-none"
        >
          {logos.map((logo) => (
            <option key={logo.filename} value={logo.filename}>
              {logo.filename}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={onImport}
        className="flex-shrink-0 p-2 rounded border border-marine-400/20 hover:border-or-500/40 text-muted hover:text-or-400 transition-colors"
        title="Importer un nouveau logo"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
