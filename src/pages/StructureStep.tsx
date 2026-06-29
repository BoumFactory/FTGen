import { useState, useMemo } from "react";
import type { TemplateMeta, ProjectStructure } from "../lib/types";
import { PROFILES } from "../lib/profiles";
import { SectionCard } from "../components/SectionCard";

interface StructureStepProps {
  meta: TemplateMeta;
  values: Record<string, unknown>;
  structure: ProjectStructure;
  onStructureChange: (structure: ProjectStructure) => void;
  onValuesChange: (key: string, value: unknown) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function StructureStep({
  meta,
  values,
  structure,
  onStructureChange,
  onValuesChange,
  onContinue,
  onBack,
}: StructureStepProps) {
  const [selectedProfile, setSelectedProfile] = useState(structure.profile || "gt-standard");

  // Sections de contenu (type="content") associées à leurs TemplateSection
  const contentSections = useMemo(() => {
    return meta.variables
      .filter((v) => v.type === "content")
      .map((v) => {
        const section = meta.sections.find((s) => s.variable === v.name);
        return {
          variable: v,
          section: section || {
            id: v.name,
            title: v.label || v.name,
            icon: "📝",
            variable: v.name,
            color: "marine",
          },
        };
      });
  }, [meta]);

  // Toutes les sections sont activées si enabledSections est vide
  const allSectionIds = contentSections.map((cs) => cs.section.id);
  const effectiveEnabled =
    structure.enabledSections.length === 0
      ? allSectionIds
      : structure.enabledSections;

  function isSectionEnabled(sectionId: string): boolean {
    return effectiveEnabled.includes(sectionId);
  }

  function toggleSection(sectionId: string) {
    let newEnabled: string[];
    let newTrashed: string[];

    if (isSectionEnabled(sectionId)) {
      // Désactiver
      newEnabled = effectiveEnabled.filter((id) => id !== sectionId);
      newTrashed = [...structure.trashedSections.filter((id) => id !== sectionId), sectionId];
    } else {
      // Réactiver
      newEnabled = [...effectiveEnabled, sectionId];
      newTrashed = structure.trashedSections.filter((id) => id !== sectionId);
    }

    onStructureChange({
      ...structure,
      enabledSections: newEnabled,
      trashedSections: newTrashed,
      profile: "custom",
    });
    setSelectedProfile("custom");
  }

  function applyProfile(profileId: string) {
    setSelectedProfile(profileId);
    const profile = PROFILES.find((p) => p.id === profileId);
    if (!profile) return;

    let newEnabled: string[];
    if (profile.enabledSections.length === 0) {
      // Tout activé
      newEnabled = allSectionIds;
    } else {
      // Matcher par nom : le profil contient des mots-clés à chercher dans les ids/variables
      newEnabled = allSectionIds.filter((id) => {
        const cs = contentSections.find((c) => c.section.id === id);
        if (!cs) return false;
        const varName = cs.variable.name.toLowerCase();
        return profile.enabledSections.some(
          (keyword) => varName.includes(keyword) || id.toLowerCase().includes(keyword)
        );
      });
      // Si rien ne matche, tout activer
      if (newEnabled.length === 0) newEnabled = allSectionIds;
    }

    const newTrashed = allSectionIds.filter((id) => !newEnabled.includes(id));

    // Appliquer les checkboxes par défaut du profil
    for (const [key, val] of Object.entries(profile.defaultCheckboxes)) {
      onValuesChange(key, val);
    }

    onStructureChange({
      enabledSections: newEnabled,
      trashedSections: newTrashed,
      profile: profileId,
    });
  }

  const enabledCount = effectiveEnabled.length;
  const totalCount = allSectionIds.length;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-marine-800 border-b border-or-500/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-secondary text-sm px-3 py-1.5">
            Retour
          </button>
          <div>
            <h1 className="text-lg font-bold text-creme-200">Structure de la fiche</h1>
            <p className="text-xs text-muted">{meta.name} — Sélectionnez les sections à inclure</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {enabledCount}/{totalCount} sections actives
          </span>
          <button onClick={onContinue} className="btn-primary text-sm px-5 py-2">
            Continuer vers l'édition →
          </button>
        </div>
      </header>

      {/* Contenu */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Sélection de profil */}
          <section>
            <h2 className="text-lg font-semibold text-or-400 mb-4">Profil de fiche</h2>
            <div className="flex flex-wrap gap-3">
              {PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => applyProfile(profile.id)}
                  className={`px-5 py-3 rounded-lg border-2 transition-all text-left ${
                    selectedProfile === profile.id
                      ? "bg-or-500/15 border-or-500/60 text-or-300"
                      : "bg-marine-700 border-marine-400/20 text-muted-light hover:border-marine-300/40"
                  }`}
                >
                  <div className="font-semibold text-sm">{profile.name}</div>
                  <div className="text-xs mt-0.5 opacity-75">{profile.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Grille des sections */}
          <section>
            <h2 className="text-lg font-semibold text-or-400 mb-4">Sections de contenu</h2>
            {contentSections.length === 0 ? (
              <p className="text-muted">Aucune section de contenu dans ce template.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentSections.map(({ variable, section }) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    variableLabel={variable.description || variable.label}
                    enabled={isSectionEnabled(section.id)}
                    onToggle={() => toggleSection(section.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Sections désactivées */}
          {structure.trashedSections.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted mb-3">
                Sections désactivées ({structure.trashedSections.length})
              </h2>
              <p className="text-xs text-muted-dark mb-2">
                Les données de ces sections sont conservées. Cliquez pour les réactiver.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
