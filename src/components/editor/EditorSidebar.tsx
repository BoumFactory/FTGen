import type { NavSection } from "../../lib/editor-types";
import { STATUS_DOT } from "../../lib/editor-types";

interface EditorSidebarProps {
  activeSection: string | null;
  navSections: NavSection[];
  linkedDocCount: number;
  onSelectStructure: () => void;
  onSelectDocuments: () => void;
  onNavigateToSection: (sectionId: string) => void;
}

export function EditorSidebar({ activeSection, navSections, linkedDocCount, onSelectStructure, onSelectDocuments, onNavigateToSection }: EditorSidebarProps) {
  return (
    <aside className="w-[180px] shrink-0 bg-marine-800 border-r border-marine-400/20 overflow-auto flex flex-col">
      <nav className="flex-1 py-1">
        <button
          onClick={onSelectStructure}
          className={`w-full text-left px-2 py-2 text-xs transition-colors flex items-center gap-1.5 ${
            activeSection === "structure"
              ? "bg-or-500/15 text-or-300 border-r-2 border-or-500"
              : "text-muted-light hover:text-creme-200 hover:bg-marine-700"
          }`}
        >
          <span className="text-base w-6 text-center shrink-0">⚙️</span>
          <span className="truncate flex-1 leading-tight font-semibold">Structure</span>
        </button>

        <button
          onClick={onSelectDocuments}
          className={`w-full text-left px-2 py-2 text-xs transition-colors flex items-center gap-1.5 ${
            activeSection === "documents"
              ? "bg-or-500/15 text-or-300 border-r-2 border-or-500"
              : "text-muted-light hover:text-creme-200 hover:bg-marine-700"
          }`}
        >
          <span className="text-base w-6 text-center shrink-0">📎</span>
          <span className="truncate flex-1 leading-tight font-semibold">Documents</span>
          {linkedDocCount > 0 && (
            <span className="text-xs bg-or-500/20 text-or-400 px-1.5 rounded-full">{linkedDocCount}</span>
          )}
        </button>

        <div className="my-1 mx-2 border-t border-marine-400/15" />

        <p className="px-2 py-0.5 text-xs text-muted-dark uppercase tracking-wider font-semibold">Sections</p>
        {navSections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => onNavigateToSection(sec.id)}
            className={`w-full text-left px-2 py-2 text-xs transition-colors flex items-center gap-1.5 ${
              activeSection === sec.id
                ? "bg-or-500/15 text-or-300 border-r-2 border-or-500"
                : "text-muted-light hover:text-creme-200 hover:bg-marine-700"
            }`}
          >
            <span className="text-base w-6 text-center shrink-0 leading-none">{sec.icon}</span>
            <span className="truncate flex-1 leading-tight">{sec.label}</span>
            {sec.status && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[sec.status]}`} />}
          </button>
        ))}
      </nav>
    </aside>
  );
}
