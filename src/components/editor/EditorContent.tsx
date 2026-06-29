import type { TemplateMeta, TemplateVariable, SnippetCategory } from "../../lib/types";
import type { CustomSection, LinkedDocument, Classification } from "../../lib/editor-types";
import { inferSnippetCategory } from "../../lib/snippets";
import { MonacoSection } from "../MonacoSection";
import { ClassificationEditor } from "./ClassificationEditor";

interface EditorContentProps {
  meta: TemplateMeta;
  values: Record<string, unknown>;
  textVars: TemplateVariable[];
  marginVars: TemplateVariable[];
  orderedContentVars: TemplateVariable[];
  customSections: CustomSection[];
  disabledSections: Set<string>;
  hiddenSections: string[];
  expandTriggers: Record<string, number>;
  sectionRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  linkedDocuments: LinkedDocument[];
  selectedDocIds: Set<string>;
  onUpdateValue: (key: string, value: unknown) => void;
  onOpenImporter: (variableName: string) => void;
  onToggleDocSelection: (docId: string) => void;
  onNavigateToDocuments: () => void;
  classification: Classification;
  onUpdateClassification: (classification: Classification) => void;
  resolveSectionTitle: (sectionId: string, defaultTitle: string) => string;
  resolveSectionIcon: (sectionId: string, defaultIcon: string) => string;
  projectImages?: string[];
  onImportImage?: () => void;
}

export function EditorContent({
  meta, values, textVars, marginVars, orderedContentVars, customSections,
  disabledSections, hiddenSections, expandTriggers, sectionRefs,
  linkedDocuments, selectedDocIds,
  classification, onUpdateClassification,
  onUpdateValue, onOpenImporter, onToggleDocSelection, onNavigateToDocuments,
  resolveSectionTitle, resolveSectionIcon,
  projectImages = [], onImportImage,
}: EditorContentProps) {
  const activeCustomSections = customSections.filter(
    (cs) => !disabledSections.has(cs.id) && !hiddenSections.includes(cs.id)
  );

  return (
    <>
      {/* Infos générales */}
      {textVars.length > 0 && (
        <section ref={(el) => { if (el) sectionRefs.current.set("info-generales", el); }}>
          <h3 className="section-title mb-3">
            <span>ℹ️</span> Informations générales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {textVars.map((v) => (
              <div key={v.name}>
                <label className="block text-sm text-muted mb-1">{v.label || v.description || v.name}</label>
                <input
                  type="text"
                  value={String(values[v.name] || "")}
                  onChange={(e) => onUpdateValue(v.name, e.target.value)}
                  placeholder={v.default_value}
                  className="input-field text-sm"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Classement catégorisé */}
      <ClassificationEditor
        classification={classification}
        onUpdate={onUpdateClassification}
        sectionRef={(el) => { if (el) sectionRefs.current.set("tags", el); }}
      />

      {/* Géométrie (marges) */}
      {marginVars.length > 0 && (
        <section ref={(el) => { if (el) sectionRefs.current.set("geometry", el); }}>
          <h3 className="section-title mb-3">
            <span>📐</span> Géométrie du document
          </h3>
          <div className="card p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {marginVars.map((v) => {
                const icons: Record<string, string> = {
                  MARGIN_LEFT: "←", MARGIN_RIGHT: "→",
                  MARGIN_TOP: "↑", MARGIN_BOTTOM: "↓",
                };
                return (
                  <div key={v.name}>
                    <label className="block text-xs text-muted mb-1">
                      {icons[v.name] || ""} {v.label || v.name}
                    </label>
                    <input
                      type="text"
                      value={String(values[v.name] || v.default_value || "")}
                      onChange={(e) => onUpdateValue(v.name, e.target.value)}
                      placeholder={v.default_value}
                      className="input-field text-sm text-center font-mono !min-h-[36px] !py-1.5"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-dark mt-2">
              Valeurs en cm (ex: 1.5cm, 2cm). Les valeurs par défaut sont optimisées pour ce modèle.
            </p>
          </div>
        </section>
      )}

      {/* Contenu de la fiche */}
      {orderedContentVars.length > 0 && (
        <section>
          <h3 className="text-base font-bold text-or-400 mb-3">Contenu de la fiche</h3>
          <div className="space-y-4">
            {orderedContentVars.map((v) => {
              const section = meta.sections.find((s) => s.variable === v.name);
              const sectionId = section?.id || v.name;
              const navId = `content-${v.name}`;

              // Section FICHIERS : widget checkboxes des documents liés
              if (v.name === "FICHIERS") {
                return (
                  <div key={v.name} ref={(el) => { if (el) sectionRefs.current.set(navId, el); }}>
                    <LinkedDocsSelector
                      title={resolveSectionTitle(sectionId, section?.title || v.label || v.name)}
                      icon={resolveSectionIcon(sectionId, section?.icon || "📝")}
                      linkedDocuments={linkedDocuments}
                      selectedDocIds={selectedDocIds}
                      onToggle={onToggleDocSelection}
                      onNavigateToDocuments={onNavigateToDocuments}
                    />
                  </div>
                );
              }

              const category = inferSnippetCategory(v.name);
              return (
                <div key={v.name} ref={(el) => { if (el) sectionRefs.current.set(navId, el); }}>
                  <div className="flex items-center justify-between mb-1">
                    <div />
                    <button onClick={() => onOpenImporter(v.name)}
                      className="text-xs text-muted hover:text-or-300 transition-colors flex items-center gap-1">
                      📥 Importer
                    </button>
                  </div>
                  <MonacoSection
                    title={resolveSectionTitle(sectionId, section?.title || v.label || v.name)}
                    icon={resolveSectionIcon(sectionId, section?.icon || "📝")}
                    value={String(values[v.name] || "")}
                    onChange={(val) => onUpdateValue(v.name, val)}
                    snippetCategory={category}
                    sectionId={section?.id}
                    forceExpand={expandTriggers[navId] || 0}
                    projectImages={projectImages}
                    onImportImage={onImportImage}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sections custom */}
      {activeCustomSections.length > 0 && (
        <section>
          <h3 className="section-title mb-3">Sections personnalisées</h3>
          <div className="space-y-4">
            {activeCustomSections.map((cs) => (
              <div key={cs.id} ref={(el) => { if (el) sectionRefs.current.set(cs.id, el); }}>
                <div className="flex items-center justify-between mb-1">
                  <div />
                  <button onClick={() => onOpenImporter(cs.variableName)}
                    className="text-xs text-muted hover:text-or-300 transition-colors flex items-center gap-1">
                    📥 Importer
                  </button>
                </div>
                <MonacoSection
                  title={resolveSectionTitle(cs.id, cs.title)}
                  icon={resolveSectionIcon(cs.id, cs.icon)}
                  value={String(values[cs.variableName] || "")}
                  onChange={(val) => onUpdateValue(cs.variableName, val)}
                  snippetCategory={"general" as SnippetCategory}
                  sectionId={cs.id}
                  forceExpand={expandTriggers[cs.id] || 0}
                  projectImages={projectImages}
                  onImportImage={onImportImage}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// Widget checkboxes pour la section Fichiers associés
function LinkedDocsSelector({
  title, icon, linkedDocuments, selectedDocIds, onToggle, onNavigateToDocuments,
}: {
  title: string;
  icon: string;
  linkedDocuments: LinkedDocument[];
  selectedDocIds: Set<string>;
  onToggle: (docId: string) => void;
  onNavigateToDocuments: () => void;
}) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h4 className="text-base font-bold text-creme-200 flex-1">{title}</h4>
        <span className="text-xs text-muted">
          {selectedDocIds.size}/{linkedDocuments.length} inclus
        </span>
      </div>

      {linkedDocuments.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted mb-2">Aucun document lié au projet.</p>
          <button
            onClick={onNavigateToDocuments}
            className="text-xs text-or-300 hover:text-or-200 transition-colors"
          >
            Ajouter des documents →
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {linkedDocuments.map((doc) => {
            const checked = selectedDocIds.has(doc.id);
            return (
              <button
                key={doc.id}
                onClick={() => onToggle(doc.id)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-md border transition-all ${
                  checked
                    ? "bg-or-500/10 border-or-500/30 text-creme-200"
                    : "bg-marine-700/40 border-marine-400/15 text-muted hover:border-marine-300/30"
                }`}
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  checked
                    ? "bg-or-500 border-or-500 text-on-accent"
                    : "bg-marine-700 border-marine-400/40 text-transparent"
                }`}>
                  ✓
                </span>
                <span className="text-base shrink-0">📄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{doc.displayName}</div>
                  <div className="text-xs text-muted truncate">{doc.path}</div>
                </div>
              </button>
            );
          })}
          <button
            onClick={onNavigateToDocuments}
            className="w-full text-center text-xs text-muted hover:text-or-300 transition-colors py-1.5"
          >
            Gérer les documents →
          </button>
        </div>
      )}
    </div>
  );
}
