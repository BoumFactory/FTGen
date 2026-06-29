import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEditorState } from "../hooks/useEditorState";
import { EditorToolbar } from "../components/editor/EditorToolbar";
import { EditorSidebar } from "../components/editor/EditorSidebar";
import { StructurePanel } from "../components/editor/StructurePanel";
import { MetadataBlock } from "../components/editor/MetadataBlock";
import { EditorContent } from "../components/editor/EditorContent";
import { PdfViewer } from "../components/PdfViewer";
import { SettingsModal } from "../components/SettingsModal";
import { ContentImporter } from "../components/ContentImporter";
import { DocumentsPanel } from "../components/editor/DocumentsPanel";
import { ExportModal } from "../components/ExportModal";
import SectionManager from "../components/SectionManager";
import { AiPromptModal } from "../components/AiPromptModal";

interface EditorPageProps {
  projectId: string;
  templateId: string;
  onBack: () => void;
  onChangeTemplate?: (newTemplateId: string) => void;
}

export function EditorPage({ projectId, templateId, onBack, onChangeTemplate }: EditorPageProps) {
  const state = useEditorState({ projectId, templateId });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);
  const [importTargetVar, setImportTargetVar] = useState<string | null>(null);
  const [sectionManagerOpen, setSectionManagerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [projectImages, setProjectImages] = useState<string[]>([]);

  const loadProjectImages = useCallback(async () => {
    try {
      const images = await invoke<string[]>("list_project_images", { projectId });
      setProjectImages(images);
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => { loadProjectImages(); }, [loadProjectImages]);

  const handleImportImage = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "svg", "pdf"] }],
      });
      if (selected) {
        const path = typeof selected === "string" ? selected : selected;
        await invoke<string>("import_project_image", { projectId, sourcePath: path });
        await loadProjectImages();
      }
    } catch (err) {
      console.error("Erreur import image:", err);
    }
  }, [projectId, loadProjectImages]);

  if (!state.meta) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-or-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const showEditor = state.activeTab === "edit" || state.activeTab === "split";

  function handleAddCheckboxItem(group: string, label: string) {
    const varName = `CB_${group}_${Date.now()}`;
    state.setCustomCheckboxItems((prev: Record<string, Array<{ name: string; label: string }>>) => ({
      ...prev,
      [group]: [...(prev[group] || []), { name: varName, label }],
    }));
    state.updateValue(varName, 1);
  }

  function handleRemoveCheckboxItem(group: string, itemName: string) {
    state.setCustomCheckboxItems((prev: Record<string, Array<{ name: string; label: string }>>) => ({
      ...prev,
      [group]: (prev[group] || []).filter((i: { name: string }) => i.name !== itemName),
    }));
    // La suppression de la valeur se fait via updateValue
  }

  // Panneau éditeur complet (métadonnées + contenu)
  const editorPanel = (
    <div className="p-3 space-y-4">
      <MetadataBlock
        checkboxGroups={state.checkboxGroups}
        customCheckboxItems={state.customCheckboxItems}
        disabledMetaGroups={state.disabledMetaGroups}
        hiddenMetaItems={state.hiddenMetaItems}
        values={state.values}
        sectionRef={(el) => { if (el) state.sectionRefs.current.set("metadata", el); }}
        onUpdateValue={state.updateValue}
        onAddCheckboxItem={handleAddCheckboxItem}
        onRemoveCheckboxItem={handleRemoveCheckboxItem}
      />
      <EditorContent
        meta={state.meta}
        values={state.values}
        textVars={state.textVars}
        marginVars={state.marginVars}
        orderedContentVars={state.orderedContentVars}
        customSections={state.customSections}
        disabledSections={state.disabledSections}
        hiddenSections={state.hiddenSections}
        expandTriggers={state.expandTriggers}
        sectionRefs={state.sectionRefs}
        linkedDocuments={state.linkedDocuments}
        selectedDocIds={state.selectedDocIds}
        onUpdateValue={state.updateValue}
        onOpenImporter={(varName) => { setImportTargetVar(varName); setImporterOpen(true); }}
        onToggleDocSelection={state.toggleDocSelection}
        onNavigateToDocuments={() => state.setActiveSection("documents")}
        classification={state.classification}
        onUpdateClassification={state.updateClassification}
        resolveSectionTitle={state.resolveSectionTitle}
        resolveSectionIcon={state.resolveSectionIcon}
        projectImages={projectImages}
        onImportImage={handleImportImage}
      />
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <EditorToolbar
        templateName={state.meta.name}
        projectId={projectId}
        saveStatus={state.saveStatus}
        compiling={state.compiling}
        compileResult={state.compileResult}
        activeTab={state.activeTab}
        onBack={onBack}
        onSave={state.handleSave}
        onCompile={state.handleCompile}
        onTabChange={state.setActiveTab}
        onSettingsOpen={() => setSettingsOpen(true)}
        onExportPdf={() => setExportOpen(true)}
        onShowProjectFolder={state.handleShowProjectFolder}
        hasPdf={!!state.pdfUrl}
        onAiGenerate={() => setAiModalOpen(true)}
        aiGenerating={state.aiGenerating}
        hasLinkedDocuments={state.linkedDocuments.length > 0}
        hasExistingContent={state.hasExistingContent}
      />

      {/* Contenu */}
      <div className="flex-1 flex overflow-hidden">
        {showEditor && (
          <EditorSidebar
            activeSection={state.activeSection}
            navSections={state.navSections}
            linkedDocCount={state.linkedDocuments.length}
            onSelectStructure={() => state.setActiveSection("structure")}
            onSelectDocuments={() => state.setActiveSection("documents")}
            onNavigateToSection={state.navigateToSection}
          />
        )}

        {/* Zone principale — panneau gauche selon la section active */}
        {showEditor && (() => {
          // Contenu du panneau gauche (structure, documents, ou éditeur)
          const leftPanel = state.activeSection === "structure" ? (
            <div className="flex-1 overflow-auto">
              <StructurePanel
                meta={state.meta}
                currentTemplateId={templateId}
                onChangeTemplate={onChangeTemplate}
                selectedProfile={state.selectedProfile}
                disabledSections={state.disabledSections}
                disabledMetaGroups={state.disabledMetaGroups}
                hiddenMetaItems={state.hiddenMetaItems}
                hiddenSections={state.hiddenSections}
                customSections={state.customSections}
                checkboxGroups={state.checkboxGroups}
                customCheckboxItems={state.customCheckboxItems}
                sectionOverrides={state.sectionOverrides}
                customProfiles={state.customProfiles}
                onApplyProfile={state.applyProfile}
                onToggleSection={state.toggleSection}
                onToggleMetaGroup={state.toggleMetaGroup}
                onToggleMetaItem={state.toggleMetaItem}
                onOpenSectionManager={() => setSectionManagerOpen(true)}
                onReorderSection={state.reorderSection}
                onSetSectionColumns={state.setSectionColumns}
                onSaveAsProfile={state.saveCurrentAsProfile}
                onDeleteCustomProfile={state.deleteCustomProfile}
                onUpdateCustomProfile={state.updateCustomProfile}
                resolveSectionTitle={state.resolveSectionTitle}
                resolveSectionIcon={state.resolveSectionIcon}
                sidebarPosition={state.sidebarPosition}
                onSidebarChange={state.setSidebarPosition}
              />
            </div>
          ) : state.activeSection === "documents" ? (
            <div className="flex-1 overflow-auto p-4">
              <DocumentsPanel
                linkedDocuments={state.linkedDocuments}
                onAdd={state.addLinkedDocument}
                onRemove={state.removeLinkedDocument}
                onUpdate={state.updateLinkedDocument}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto">{editorPanel}</div>
          );

          // Mode edit ou split sans PDF : panneau seul en pleine largeur
          if (state.activeTab === "edit" || !state.pdfUrl) return leftPanel;

          // Mode split avec PDF : panneau gauche + PDF à droite
          return (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-auto border-r border-marine-400/30">{leftPanel}</div>
              <div className="flex-1 overflow-hidden">
                <PdfViewer key={state.pdfVersion} filePath={state.pdfUrl} />
              </div>
            </div>
          );
        })()}

        {state.activeTab === "preview" && (
          <div className="flex-1 overflow-hidden">
            {state.pdfUrl ? <PdfViewer key={state.pdfVersion} filePath={state.pdfUrl} /> : (
              <div className="h-full flex items-center justify-center"><p className="text-muted">Compilez d'abord pour voir l'aperçu</p></div>
            )}
          </div>
        )}

        {state.activeTab === "log" && (
          <div className="flex-1 overflow-auto p-4">
            {state.compileResult ? (
              <div className="space-y-3">
                <div className={`px-3 py-2 rounded-md text-sm font-medium ${
                  state.compileResult.success
                    ? "bg-green-900/40 text-green-300 border border-green-500/30"
                    : "bg-red-900/40 text-red-300 border border-red-500/30"
                }`}>
                  {state.compileResult.success ? "Compilation réussie" : "Erreur de compilation"}
                </div>
                {state.compileResult.compiler_used && (
                  <div className="text-xs text-muted bg-marine-800/60 px-3 py-1.5 rounded border border-marine-400/10">
                    Compilateur : <span className="text-creme-200 font-medium">{state.compileResult.compiler_used}</span>
                  </div>
                )}
                {state.compileResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-red-300">Erreurs :</h4>
                    {state.compileResult.errors.map((err, i) => (
                      <pre key={i} className="text-xs text-red-200 bg-red-900/20 p-2 rounded font-mono">{err}</pre>
                    ))}
                  </div>
                )}
                <details>
                  <summary className="text-sm text-muted cursor-pointer hover:text-creme-200">Log complet</summary>
                  <pre className="card-inset text-xs text-muted mt-2 overflow-auto max-h-96 font-mono">
                    {state.compileResult.log}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="text-muted">Aucun log de compilation</p>
            )}
          </div>
        )}
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ContentImporter
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        onImport={(content) => {
          if (importTargetVar) {
            const existing = String(state.values[importTargetVar] || "");
            state.updateValue(importTargetVar, existing ? existing + "\n\n" + content : content);
          }
        }}
        currentSectionName={
          importTargetVar
            ? state.meta.sections.find((s) => s.variable === importTargetVar)?.title ||
              state.customSections.find((cs) => cs.variableName === importTargetVar)?.title ||
              importTargetVar
            : undefined
        }
      />
      <SectionManager
        open={sectionManagerOpen}
        onClose={() => setSectionManagerOpen(false)}
        templateSections={state.meta.sections.map((s) => ({ id: s.id, title: s.title, icon: s.icon, variable: s.variable }))}
        customSections={state.customSections}
        sectionOverrides={state.sectionOverrides}
        hiddenSections={state.hiddenSections}
        onSave={state.handleSectionManagerSave}
      />
      {state.pdfUrl && (
        <ExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          pdfPath={state.pdfUrl}
          projectId={projectId}
          title={state.exportTitle}
          linkedDocuments={state.linkedDocuments}
          selectedDocIds={state.selectedDocIds}
        />
      )}
      <AiPromptModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onGenerate={(userPrompt) => {
          setAiModalOpen(false);
          state.handleAiGenerate(userPrompt);
        }}
        documentCount={state.linkedDocuments.length}
        isModifyMode={state.hasExistingContent}
      />
    </div>
  );
}
