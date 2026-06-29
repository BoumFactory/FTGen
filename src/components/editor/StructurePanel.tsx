import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TemplateMeta, TemplateVariable } from "../../lib/types";
import type { CustomSection, SectionOverride } from "../../lib/editor-types";
import type { CustomProfile } from "../../lib/editor-types";
import { GROUP_LABELS } from "../../lib/editor-types";
import { PROFILES } from "../../lib/profiles";

interface StructurePanelProps {
  meta: TemplateMeta;
  currentTemplateId: string;
  onChangeTemplate?: (newTemplateId: string) => void;
  selectedProfile: string;
  disabledSections: Set<string>;
  disabledMetaGroups: Set<string>;
  hiddenMetaItems: Set<string>;
  hiddenSections: string[];
  customSections: CustomSection[];
  checkboxGroups: Map<string, Array<{ name: string; label: string }>>;
  customCheckboxItems: Record<string, Array<{ name: string; label: string }>>;
  sectionOverrides: Record<string, SectionOverride>;
  customProfiles: CustomProfile[];
  onApplyProfile: (profileId: string) => void;
  onToggleSection: (sectionId: string) => void;
  onToggleMetaGroup: (group: string) => void;
  onToggleMetaItem: (itemName: string) => void;
  onOpenSectionManager: () => void;
  resolveSectionTitle: (sectionId: string, defaultTitle: string) => string;
  resolveSectionIcon: (sectionId: string, defaultIcon: string) => string;
  onReorderSection: (sectionId: string, direction: "up" | "down") => void;
  onSetSectionColumns: (sectionId: string, columns: number) => void;
  onSaveAsProfile: (name: string, icon: string, description: string) => void;
  onDeleteCustomProfile: (profileId: string) => void;
  onUpdateCustomProfile?: (profileId: string) => void;
  sidebarPosition: "left" | "right";
  onSidebarChange: (pos: "left" | "right") => void;
}

export function StructurePanel({
  meta, currentTemplateId, onChangeTemplate,
  selectedProfile, disabledSections, disabledMetaGroups, hiddenMetaItems,
  hiddenSections, customSections, checkboxGroups, customCheckboxItems,
  sectionOverrides, customProfiles,
  onApplyProfile, onToggleSection, onToggleMetaGroup, onToggleMetaItem,
  onOpenSectionManager,
  resolveSectionTitle, resolveSectionIcon,
  onReorderSection, onSetSectionColumns,
  onSaveAsProfile, onDeleteCustomProfile, onUpdateCustomProfile,
  sidebarPosition, onSidebarChange,
}: StructurePanelProps) {
  const visibleContentVars = meta.variables
    .filter((v) => v.type === "content")
    .filter((v) => {
      const sec = meta.sections.find((s) => s.variable === v.name);
      return !hiddenSections.includes(sec?.id || v.name);
    });

  // Sections activées, triées par order
  const enabledSections = visibleContentVars
    .filter((v) => {
      const sec = meta.sections.find((s) => s.variable === v.name);
      return !disabledSections.has(sec?.id || v.name);
    })
    .map((v) => {
      const sec = meta.sections.find((s) => s.variable === v.name);
      const sectionId = sec?.id || v.name;
      return {
        id: sectionId,
        variable: v.name,
        icon: resolveSectionIcon(sectionId, sec?.icon || "📝"),
        title: resolveSectionTitle(sectionId, sec?.title || v.label || v.name),
        order: sectionOverrides[sectionId]?.order ?? 999,
      };
    })
    .concat(
      customSections
        .filter((cs) => !disabledSections.has(cs.id) && !hiddenSections.includes(cs.id))
        .map((cs) => ({
          id: cs.id,
          variable: cs.id,
          icon: resolveSectionIcon(cs.id, cs.icon),
          title: resolveSectionTitle(cs.id, cs.title),
          order: sectionOverrides[cs.id]?.order ?? 999,
        }))
    )
    .sort((a, b) => a.order - b.order);

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-creme-200 mb-1">Structure de la fiche</h2>
        <p className="text-sm text-muted">Choisissez les sections à inclure et gérez les métadonnées.</p>
      </div>

      {/* Sélecteur de template */}
      {onChangeTemplate && (
        <TemplateSelector currentTemplateId={currentTemplateId} onChange={onChangeTemplate} />
      )}

      {/* Position de la sidebar */}
      <section>
        <h3 className="section-title mb-3">Position de la sidebar</h3>
        <div className="flex gap-2">
          {(["left", "right"] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => onSidebarChange(pos)}
              className={`flex-1 px-4 py-2.5 rounded-lg border-2 transition-all text-center ${
                sidebarPosition === pos
                  ? "bg-or-500/15 border-or-500/60 text-or-300 shadow-md shadow-or-500/10"
                  : "bg-marine-700 border-marine-400/20 text-muted-light hover:border-marine-300/40"
              }`}
            >
              <div className="font-semibold text-sm">{pos === "left" ? "◀ Gauche" : "Droite ▶"}</div>
              <div className="text-[11px] mt-0.5 opacity-75">
                {pos === "left" ? "Sidebar à gauche du document" : "Sidebar à droite du document"}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Profils */}
      <section>
        <h3 className="section-title mb-3">Profil de fiche</h3>
        <div className="flex flex-wrap gap-3">
          {PROFILES.map((profile) => (
            <button
              key={profile.id}
              onClick={() => onApplyProfile(profile.id)}
              className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                selectedProfile === profile.id
                  ? "bg-or-500/15 border-or-500/60 text-or-300 shadow-md shadow-or-500/10"
                  : "bg-marine-700 border-marine-400/20 text-muted-light hover:border-marine-300/40"
              }`}
            >
              <div className="font-semibold text-sm">{profile.name}</div>
              <div className="text-xs mt-0.5 opacity-75">{profile.description}</div>
            </button>
          ))}
          {customProfiles.map((profile) => (
            <div key={profile.id} className="relative group/profile">
              <button
                onClick={() => onApplyProfile(profile.id)}
                className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                  selectedProfile === profile.id
                    ? "bg-or-500/15 border-or-500/60 text-or-300 shadow-md shadow-or-500/10"
                    : "bg-marine-700 border-marine-400/20 text-muted-light hover:border-marine-300/40"
                }`}
              >
                <div className="font-semibold text-sm">{profile.icon} {profile.name}</div>
                <div className="text-xs mt-0.5 opacity-75">{profile.description}</div>
              </button>
              <button
                onClick={() => onDeleteCustomProfile(profile.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-900/80 text-red-300 text-xs
                           flex items-center justify-center opacity-0 group-hover/profile:opacity-100 transition-opacity"
                title="Supprimer ce profil"
              >×</button>
            </div>
          ))}
        </div>
      </section>

      {selectedProfile === "custom" && (
        <SaveProfileForm onSave={onSaveAsProfile} />
      )}

      {onUpdateCustomProfile && customProfiles.some((p) => p.id === selectedProfile) && (
        <button
          onClick={() => onUpdateCustomProfile(selectedProfile)}
          className="mt-2 chip chip-inactive text-xs flex items-center gap-1 !border-dashed hover:!border-or-500/50 hover:text-or-300 transition-colors"
        >
          🔄 Mettre à jour ce profil avec la structure actuelle
        </button>
      )}

      {/* Sections de contenu */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-title">Sections de contenu</h3>
          <button
            onClick={onOpenSectionManager}
            className="chip chip-inactive text-xs flex items-center gap-1"
          >
            Gérer <span className="text-or-400">→</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {visibleContentVars.map((v) => {
            const sec = meta.sections.find((s) => s.variable === v.name);
            const sectionId = sec?.id || v.name;
            const enabled = !disabledSections.has(sectionId);
            return (
              <SectionToggleCard
                key={v.name}
                enabled={enabled}
                icon={resolveSectionIcon(sectionId, sec?.icon || "📝")}
                title={resolveSectionTitle(sectionId, sec?.title || v.label || v.name)}
                onClick={() => onToggleSection(sectionId)}
              />
            );
          })}

          {customSections.filter((cs) => !hiddenSections.includes(cs.id)).map((cs) => {
            const enabled = !disabledSections.has(cs.id);
            return (
              <SectionToggleCard
                key={cs.id}
                enabled={enabled}
                icon={resolveSectionIcon(cs.id, cs.icon)}
                title={resolveSectionTitle(cs.id, cs.title)}
                isCustom
                onClick={() => onToggleSection(cs.id)}
              />
            );
          })}
        </div>
      </section>

      {/* Agencement des sections — grid visuel 2 colonnes */}
      {enabledSections.length > 0 && (
        <section>
          <h3 className="section-title mb-3">Disposition du document</h3>
          <p className="text-xs text-muted mb-3">Cliquez sur une boîte pour basculer ½ ↔ pleine largeur. Flèches pour réordonner.</p>
          <div className="card p-3">
            <div className="grid grid-cols-2 gap-2">
              {enabledSections.map((item, idx) => {
                const cols = sectionOverrides[item.id]?.columns ?? 2;
                return (
                  <div
                    key={item.id}
                    className={`relative group/box rounded-lg border-2 p-2.5 transition-all cursor-pointer ${
                      cols === 2 ? "col-span-2" : "col-span-1"
                    } bg-marine-600/40 border-or-500/25 hover:border-or-500/50 hover:bg-marine-600/60`}
                    onClick={() => onSetSectionColumns(item.id, cols === 2 ? 1 : 2)}
                  >
                    {/* Contenu de la boîte */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-dark font-mono w-4">{idx + 1}</span>
                      <span className="text-base">{item.icon}</span>
                      <span className="text-sm text-creme-200 font-medium flex-1 truncate">{item.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                        cols === 2
                          ? "bg-or-500/15 text-or-400 border border-or-500/30"
                          : "bg-marine-700 text-muted border border-marine-400/25"
                      }`}>
                        {cols === 2 ? "100%" : "50%"}
                      </span>
                    </div>

                    {/* Boutons de réordonnancement (visibles au hover) */}
                    <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover/box:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); onReorderSection(item.id, "up"); }}
                        disabled={idx === 0}
                        className="w-5 h-5 flex items-center justify-center text-xs rounded bg-marine-700/80 text-muted hover:text-or-300 disabled:opacity-30 transition-colors"
                      >▲</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onReorderSection(item.id, "down"); }}
                        disabled={idx === enabledSections.length - 1}
                        className="w-5 h-5 flex items-center justify-center text-xs rounded bg-marine-700/80 text-muted hover:text-or-300 disabled:opacity-30 transition-colors"
                      >▼</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Groupes de métadonnées — liste maître */}
      {checkboxGroups.size > 0 && (
        <section>
          <h3 className="section-title mb-3">Métadonnées — options autorisées</h3>
          <p className="text-xs text-muted mb-3">Activez/désactivez les groupes et choisissez quelles options sont disponibles dans l'éditeur.</p>
          <div className="card space-y-1">
            {Array.from(checkboxGroups.entries()).map(([group, templateItems]) => {
              const enabled = !disabledMetaGroups.has(group);
              const customItems = customCheckboxItems[group] || [];
              const allItems = [...templateItems, ...customItems];
              return (
                <MetaGroupMaster
                  key={group}
                  group={group}
                  enabled={enabled}
                  items={allItems}
                  hiddenMetaItems={hiddenMetaItems}
                  onToggleGroup={() => onToggleMetaGroup(group)}
                  onToggleItem={onToggleMetaItem}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// Sous-composant card toggle pour section
function SectionToggleCard({
  enabled, icon, title, isCustom, onClick,
}: {
  enabled: boolean; icon: string; title: string; isCustom?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-3 rounded-lg border-2 transition-all text-left ${
        enabled
          ? "card-elevated !p-3 border-or-500/30"
          : "bg-marine-800 border-marine-400/15 opacity-50 hover:opacity-70"
      }`}
    >
      <div className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
        enabled ? "bg-or-500 text-on-accent" : "bg-marine-600 text-muted border border-marine-400/30"
      }`}>
        {enabled ? "✓" : ""}
      </div>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`font-semibold text-sm ${enabled ? "text-creme-200" : "text-muted"}`}>
        {title}
      </div>
      {isCustom && <div className="text-[11px] text-or-500/60 mt-0.5 uppercase tracking-wider">Custom</div>}
    </button>
  );
}

// Panneau dépliable : liste maître des items d'un groupe de métadonnées
function MetaGroupMaster({
  group, enabled, items, hiddenMetaItems, onToggleGroup, onToggleItem,
}: {
  group: string;
  enabled: boolean;
  items: Array<{ name: string; label: string }>;
  hiddenMetaItems: Set<string>;
  onToggleGroup: () => void;
  onToggleItem: (itemName: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = items.filter((i) => !hiddenMetaItems.has(i.name)).length;

  return (
    <div className="rounded-md overflow-hidden">
      {/* En-tête du groupe */}
      <div className="flex items-center justify-between py-2 px-3 hover:bg-marine-600/30 transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleGroup}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold transition-colors ${
              enabled
                ? "bg-or-500 border-or-500 text-on-accent"
                : "bg-marine-700 border-marine-400/40 text-transparent"
            }`}
          >
            ✓
          </button>
          <span className={`text-sm ${enabled ? "text-creme-200" : "text-muted line-through"}`}>
            {GROUP_LABELS[group] || group}
          </span>
          {!enabled && (
            <span className="text-xs text-muted-dark bg-marine-700 px-1.5 py-0.5 rounded">masqué</span>
          )}
          {enabled && (
            <span className="text-xs text-muted-dark">{visibleCount}/{items.length}</span>
          )}
        </div>
        {enabled && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="chip chip-inactive text-xs flex items-center gap-1"
          >
            {expanded ? "Replier" : "Options"} <span className="text-or-400">{expanded ? "▲" : "▼"}</span>
          </button>
        )}
      </div>

      {/* Items dépliables */}
      {enabled && expanded && (
        <div className="px-3 pb-3 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => {
              const visible = !hiddenMetaItems.has(item.name);
              return (
                <button
                  key={item.name}
                  onClick={() => onToggleItem(item.name)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                    visible
                      ? "bg-or-500/10 border-or-500/30 text-creme-200"
                      : "bg-marine-800 border-marine-400/15 text-muted line-through opacity-60"
                  }`}
                >
                  {visible && <span className="mr-1 text-or-400">✓</span>}
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-dark mt-2">
            Les options désactivées n'apparaîtront pas dans l'éditeur ni dans le PDF.
          </p>
        </div>
      )}
    </div>
  );
}

function SaveProfileForm({ onSave }: { onSave: (name: string, icon: string, description: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📋");
  const [description, setDescription] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 chip chip-inactive text-xs flex items-center gap-1 !border-dashed"
      >
        💾 Sauvegarder cette structure comme profil
      </button>
    );
  }

  return (
    <div className="mt-2 card p-3 space-y-2">
      <p className="text-xs text-or-400 font-semibold uppercase tracking-wider">Nouveau profil</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="input-field text-sm w-12 text-center"
          maxLength={2}
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du profil..."
          className="input-field text-sm flex-1"
          autoFocus
        />
      </div>
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description courte..."
        className="input-field text-sm w-full"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="text-xs text-muted hover:text-creme-200 px-3 py-1">Annuler</button>
        <button
          onClick={() => { if (name.trim()) { onSave(name.trim(), icon, description.trim()); setOpen(false); setName(""); setDescription(""); } }}
          disabled={!name.trim()}
          className="text-xs bg-or-500/20 text-or-300 border border-or-500/40 rounded px-3 py-1 disabled:opacity-40"
        >Enregistrer</button>
      </div>
    </div>
  );
}

// Sélecteur de template (modèle de fiche)
function TemplateSelector({
  currentTemplateId, onChange,
}: {
  currentTemplateId: string;
  onChange: (templateId: string) => void;
}) {
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description: string }>>([]);

  useEffect(() => {
    invoke<Array<{ id: string; name: string; description: string }>>("get_templates")
      .then(setTemplates)
      .catch(() => {});
  }, []);

  if (templates.length <= 1) return null;

  return (
    <section>
      <h3 className="section-title mb-3">Modèle de fiche</h3>
      <div className="flex flex-wrap gap-2">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => { if (tpl.id !== currentTemplateId) onChange(tpl.id); }}
            className={`px-3 py-2 rounded-lg border-2 transition-all text-left ${
              currentTemplateId === tpl.id
                ? "bg-or-500/15 border-or-500/60 text-or-300 shadow-md shadow-or-500/10"
                : "bg-marine-700 border-marine-400/20 text-muted-light hover:border-marine-300/40"
            }`}
          >
            <div className="font-semibold text-xs">{tpl.name}</div>
            <div className="text-xs mt-0.5 opacity-75">{tpl.description}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
