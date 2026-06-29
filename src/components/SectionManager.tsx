import React, { useState, useMemo } from 'react';

const AVAILABLE_ICONS = [
  '📄', '🎯', '🤖', '📋', '⚠️', '📁', '📖', '✏️', '👥', '🕐',
  '💡', '⚡', '💬', '🔗', '🖼️', '📐', '📊', '🌐', '💻', '🛡️',
  '🔧', '📅', '💼', '🏆', '📚', '📥', '🧪', '🎓', '🗂️', '📝',
];

interface TemplateSection {
  id: string;
  title: string;
  icon: string;
  variable: string;
}

interface CustomSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  variableName: string;
}

interface SectionOverride {
  title?: string;
  icon?: string;
  order?: number;
}

interface SectionManagerProps {
  open: boolean;
  onClose: () => void;
  templateSections: TemplateSection[];
  customSections: CustomSection[];
  sectionOverrides: Record<string, SectionOverride>;
  hiddenSections: string[];
  onSave: (data: {
    sectionOverrides: Record<string, SectionOverride>;
    hiddenSections: string[];
    customSections: CustomSection[];
  }) => void;
}

interface LocalSection extends TemplateSection {
  isTemplate: true;
}

interface LocalCustomSection extends CustomSection {
  isTemplate: false;
}

type LocalSectionItem = LocalSection | LocalCustomSection;

export default function SectionManager({
  open,
  onClose,
  templateSections,
  customSections,
  sectionOverrides,
  hiddenSections: initialHiddenSections,
  onSave,
}: SectionManagerProps) {
  // Local state for editing
  const [localOverrides, setLocalOverrides] = useState<Record<string, SectionOverride>>(sectionOverrides);
  const [localHidden, setLocalHidden] = useState<string[]>(initialHiddenSections);
  const [localCustomSections, setLocalCustomSections] = useState<CustomSection[]>(customSections);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionIcon, setNewSectionIcon] = useState('📝');
  const [newSectionDesc, setNewSectionDesc] = useState('');

  // Sync state when props change (only when modal opens)
  React.useEffect(() => {
    if (open) {
      setLocalOverrides(sectionOverrides);
      setLocalHidden(initialHiddenSections);
      setLocalCustomSections(customSections);
      setEditingId(null);
      setShowIconPicker(null);
      setShowAddForm(false);
    }
  }, [open, sectionOverrides, initialHiddenSections, customSections]);

  // Build combined sections list with ordering
  const allSections = useMemo<LocalSectionItem[]>(() => {
    const sections: LocalSectionItem[] = [
      ...templateSections.map((s) => ({ ...s, isTemplate: true as const })),
      ...localCustomSections.map((s) => ({ ...s, isTemplate: false as const })),
    ];

    // Sort by order if defined
    return sections.sort((a, b) => {
      const orderA = localOverrides[a.id]?.order ?? sections.indexOf(a);
      const orderB = localOverrides[b.id]?.order ?? sections.indexOf(b);
      return orderA - orderB;
    });
  }, [templateSections, localCustomSections, localOverrides]);

  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingText(currentTitle);
    setShowIconPicker(null);
  };

  const handleSaveEdit = (id: string) => {
    if (editingText.trim()) {
      setLocalOverrides((prev) => ({
        ...prev,
        [id]: { ...prev[id], title: editingText.trim() },
      }));
    }
    setEditingId(null);
    setEditingText('');
  };

  const handleIconSelect = (id: string, icon: string) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [id]: { ...prev[id], icon },
    }));
    setShowIconPicker(null);
  };

  const handleToggleHidden = (id: string) => {
    if (localHidden.includes(id)) {
      setLocalHidden(localHidden.filter((hid) => hid !== id));
    } else {
      setLocalHidden([...localHidden, id]);
    }
  };

  const handleDeleteCustom = (id: string) => {
    setLocalCustomSections(localCustomSections.filter((s) => s.id !== id));
  };

  const handleMoveUp = (id: string) => {
    const idx = allSections.findIndex((s) => s.id === id);
    if (idx > 0) {
      const targetIdx = idx - 1;
      const currentOrder = localOverrides[id]?.order ?? idx;
      const targetOrder = localOverrides[allSections[targetIdx].id]?.order ?? targetIdx;

      setLocalOverrides((prev) => ({
        ...prev,
        [id]: { ...prev[id], order: targetOrder },
        [allSections[targetIdx].id]: { ...prev[allSections[targetIdx].id], order: currentOrder },
      }));
    }
  };

  const handleMoveDown = (id: string) => {
    const idx = allSections.findIndex((s) => s.id === id);
    if (idx < allSections.length - 1) {
      const targetIdx = idx + 1;
      const currentOrder = localOverrides[id]?.order ?? idx;
      const targetOrder = localOverrides[allSections[targetIdx].id]?.order ?? targetIdx;

      setLocalOverrides((prev) => ({
        ...prev,
        [id]: { ...prev[id], order: targetOrder },
        [allSections[targetIdx].id]: { ...prev[allSections[targetIdx].id], order: currentOrder },
      }));
    }
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;

    const id = `custom_${Date.now()}`;
    const newSection: CustomSection = {
      id,
      title: newSectionTitle.trim(),
      icon: newSectionIcon,
      description: newSectionDesc.trim(),
      variableName: newSectionTitle.trim().toLowerCase().replace(/\s+/g, '_'),
    };

    setLocalCustomSections([...localCustomSections, newSection]);
    setNewSectionTitle('');
    setNewSectionIcon('📝');
    setNewSectionDesc('');
    setShowAddForm(false);
  };

  const handleSave = () => {
    onSave({
      sectionOverrides: localOverrides,
      hiddenSections: localHidden,
      customSections: localCustomSections,
    });
    onClose();
  };

  const getDisplayIcon = (section: LocalSectionItem): string => {
    return localOverrides[section.id]?.icon ?? section.icon;
  };

  const getDisplayTitle = (section: LocalSectionItem): string => {
    return localOverrides[section.id]?.title ?? section.title;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-marine-600">
          <h2 className="text-xl font-semibold text-creme-100">Gérer les sections</h2>
          <button
            onClick={onClose}
            className="text-creme-400 hover:text-creme-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Template Sections */}
          <div>
            <h3 className="section-title mb-4">Sections du modèle</h3>
            <div className="card-inset space-y-2 p-4">
              {allSections
                .filter((s) => 'isTemplate' in s && s.isTemplate)
                .map((section, idx) => {
                  const isHidden = localHidden.includes(section.id);
                  return (
                    <div
                      key={section.id}
                      className={`flex items-center gap-3 p-3 bg-marine-700 rounded border border-marine-600 transition-opacity ${
                        isHidden ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Move buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleMoveUp(section.id)}
                          disabled={idx === 0}
                          className="px-2 py-1 text-sm text-creme-300 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:text-or-400 transition-colors"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveDown(section.id)}
                          disabled={idx === allSections.filter((s) => 'isTemplate' in s && s.isTemplate).length - 1}
                          className="px-2 py-1 text-sm text-creme-300 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:text-or-400 transition-colors"
                        >
                          ↓
                        </button>
                      </div>

                      {/* Icon and Title */}
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={() => setShowIconPicker(section.id)}
                          className="text-2xl hover:scale-110 transition-transform"
                        >
                          {getDisplayIcon(section)}
                        </button>

                        {editingId === section.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => handleSaveEdit(section.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(section.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="input-field flex-1"
                          />
                        ) : (
                          <span className="text-creme-100 flex-1">{getDisplayTitle(section)}</span>
                        )}
                      </div>

                      {/* Rename button */}
                      <button
                        onClick={() => handleStartEdit(section.id, getDisplayTitle(section))}
                        className="px-3 py-1 text-sm bg-marine-600 hover:bg-marine-500 text-creme-200 rounded transition-colors"
                      >
                        Renommer
                      </button>

                      {/* Hide/Show toggle */}
                      <button
                        onClick={() => handleToggleHidden(section.id)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          isHidden
                            ? 'bg-marine-600 text-creme-300 hover:bg-marine-500'
                            : 'bg-or-600 text-on-accent hover:bg-or-500'
                        }`}
                      >
                        {isHidden ? '🙈' : '👁️'}
                      </button>

                      {/* Icon Picker */}
                      {showIconPicker === section.id && (
                        <div className="absolute right-6 top-32 bg-marine-800 border border-or-500 rounded-lg p-4 shadow-lg z-10 max-w-xs">
                          <div className="grid grid-cols-6 gap-2">
                            {AVAILABLE_ICONS.map((icon) => (
                              <button
                                key={icon}
                                onClick={() => handleIconSelect(section.id, icon)}
                                className={`text-2xl p-2 rounded hover:bg-marine-700 transition-colors ${
                                  getDisplayIcon(section) === icon ? 'bg-or-500' : ''
                                }`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Custom Sections */}
          <div>
            <h3 className="section-title mb-4">Sections personnalisées</h3>
            <div className="card-inset space-y-2 p-4">
              {allSections
                .filter((s) => !('isTemplate' in s) || !s.isTemplate)
                .map((section, idx) => {
                  const allCustom = allSections.filter((s) => !('isTemplate' in s) || !s.isTemplate);
                  return (
                    <div
                      key={section.id}
                      className="flex items-center gap-3 p-3 bg-marine-700 rounded border border-marine-600"
                    >
                      {/* Move buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleMoveUp(section.id)}
                          disabled={idx === 0}
                          className="px-2 py-1 text-sm text-creme-300 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:text-or-400 transition-colors"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveDown(section.id)}
                          disabled={idx === allCustom.length - 1}
                          className="px-2 py-1 text-sm text-creme-300 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:text-or-400 transition-colors"
                        >
                          ↓
                        </button>
                      </div>

                      {/* Icon and Title */}
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={() => setShowIconPicker(section.id)}
                          className="text-2xl hover:scale-110 transition-transform"
                        >
                          {getDisplayIcon(section)}
                        </button>

                        {editingId === section.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => handleSaveEdit(section.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(section.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="input-field flex-1"
                          />
                        ) : (
                          <span className="text-creme-100 flex-1">{getDisplayTitle(section)}</span>
                        )}
                      </div>

                      {/* Rename button */}
                      <button
                        onClick={() => handleStartEdit(section.id, getDisplayTitle(section))}
                        className="px-3 py-1 text-sm bg-marine-600 hover:bg-marine-500 text-creme-200 rounded transition-colors"
                      >
                        Renommer
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteCustom(section.id)}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                      >
                        🗑️
                      </button>

                      {/* Icon Picker */}
                      {showIconPicker === section.id && (
                        <div className="absolute right-6 top-80 bg-marine-800 border border-or-500 rounded-lg p-4 shadow-lg z-10 max-w-xs">
                          <div className="grid grid-cols-6 gap-2">
                            {AVAILABLE_ICONS.map((icon) => (
                              <button
                                key={icon}
                                onClick={() => handleIconSelect(section.id, icon)}
                                className={`text-2xl p-2 rounded hover:bg-marine-700 transition-colors ${
                                  getDisplayIcon(section) === icon ? 'bg-or-500' : ''
                                }`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              {localCustomSections.length === 0 && (
                <p className="text-creme-400 text-sm italic">Aucune section personnalisée</p>
              )}
            </div>
          </div>

          {/* Add Section Button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-secondary w-full"
          >
            + Ajouter une section
          </button>

          {/* Add Form */}
          {showAddForm && (
            <div className="card-inset p-4 space-y-3 border border-or-500">
              <div>
                <label className="block text-creme-200 text-sm mb-1">Titre</label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Ex: Workflow"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-creme-200 text-sm mb-1">Description</label>
                <input
                  type="text"
                  value={newSectionDesc}
                  onChange={(e) => setNewSectionDesc(e.target.value)}
                  placeholder="Ex: Étapes du processus"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-creme-200 text-sm mb-2">Icône</label>
                <div className="grid grid-cols-8 gap-2">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewSectionIcon(icon)}
                      className={`text-2xl p-2 rounded hover:bg-marine-700 transition-colors ${
                        newSectionIcon === icon ? 'bg-or-500' : 'bg-marine-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewSectionTitle('');
                    setNewSectionIcon('📝');
                    setNewSectionDesc('');
                  }}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddSection}
                  disabled={!newSectionTitle.trim()}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t border-marine-600">
          <button onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button onClick={handleSave} className="btn-primary">
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
