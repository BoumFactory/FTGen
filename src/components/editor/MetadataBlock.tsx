import { useState } from "react";
import { GROUP_LABELS } from "../../lib/editor-types";

interface MetadataBlockProps {
  checkboxGroups: Map<string, Array<{ name: string; label: string }>>;
  customCheckboxItems: Record<string, Array<{ name: string; label: string }>>;
  disabledMetaGroups: Set<string>;
  hiddenMetaItems: Set<string>;
  values: Record<string, unknown>;
  sectionRef: (el: HTMLElement | null) => void;
  onUpdateValue: (key: string, value: unknown) => void;
  onAddCheckboxItem: (group: string, label: string) => void;
  onRemoveCheckboxItem: (group: string, itemName: string) => void;
}

export function MetadataBlock({
  checkboxGroups, customCheckboxItems, disabledMetaGroups, hiddenMetaItems, values,
  sectionRef, onUpdateValue, onAddCheckboxItem, onRemoveCheckboxItem,
}: MetadataBlockProps) {
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [newCheckboxLabel, setNewCheckboxLabel] = useState("");

  if (checkboxGroups.size === 0) return null;

  const enabledGroups = Array.from(checkboxGroups.entries())
    .filter(([group]) => !disabledMetaGroups.has(group));

  if (enabledGroups.length === 0) return null;

  function handleAdd(group: string) {
    if (!newCheckboxLabel.trim()) return;
    onAddCheckboxItem(group, newCheckboxLabel.trim());
    setNewCheckboxLabel("");
    setAddingToGroup(null);
  }

  return (
    <section ref={sectionRef}>
      <h3 className="section-title mb-3">
        <span>📊</span> Métadonnées
      </h3>
      <div className="card space-y-4">
        {enabledGroups.map(([group, templateItems]) => {
          const customItems = customCheckboxItems[group] || [];
          const allItems = [...templateItems, ...customItems].filter((i) => !hiddenMetaItems.has(i.name));
          return (
            <div key={group}>
              <p className="text-sm text-muted-dark font-semibold uppercase tracking-wider mb-2">
                {GROUP_LABELS[group] || group}
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                {allItems.map((item) => {
                  const checked = values[item.name] === 1 || values[item.name] === true;
                  const isCustom = customItems.some((ci) => ci.name === item.name);
                  return (
                    <div key={item.name} className="relative group/item">
                      <button
                        onClick={() => onUpdateValue(item.name, checked ? 0 : 1)}
                        className={`chip ${checked ? "chip-active" : "chip-inactive"}`}
                      >
                        {checked && <span className="mr-1">✓</span>}
                        {item.label}
                      </button>
                      {isCustom && (
                        <button
                          onClick={() => onRemoveCheckboxItem(group, item.name)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-900/80 text-red-300 text-xs
                                     flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity"
                          title="Supprimer cette option"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}

                {addingToGroup === group ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newCheckboxLabel}
                      onChange={(e) => setNewCheckboxLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAdd(group); if (e.key === "Escape") setAddingToGroup(null); }}
                      placeholder="Nouveau label..."
                      className="px-2 py-1 text-sm bg-marine-700 border border-or-500/40 rounded text-creme-200 w-32"
                      autoFocus
                    />
                    <button onClick={() => handleAdd(group)} disabled={!newCheckboxLabel.trim()} className="px-2 py-1 text-sm bg-or-500/20 text-or-300 rounded disabled:opacity-40">✓</button>
                    <button onClick={() => { setAddingToGroup(null); setNewCheckboxLabel(""); }} className="px-2 py-1 text-sm text-muted hover:text-creme-200">×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingToGroup(group); setNewCheckboxLabel(""); }}
                    className="chip chip-inactive !border-dashed"
                    title="Ajouter une option"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
