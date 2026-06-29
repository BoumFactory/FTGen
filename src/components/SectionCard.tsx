import type { TemplateSection } from "../lib/types";

interface SectionCardProps {
  section: TemplateSection;
  variableLabel: string;
  enabled: boolean;
  onToggle: () => void;
}

export function SectionCard({ section, variableLabel, enabled, onToggle }: SectionCardProps) {
  return (
    <button
      onClick={onToggle}
      className={`relative p-5 rounded-xl border-2 transition-all duration-200 text-left w-full group ${
        enabled
          ? "bg-marine-500 border-or-500/60 shadow-lg shadow-or-500/10"
          : "bg-marine-700 border-marine-400/20 opacity-60 hover:opacity-80"
      }`}
    >
      {/* Toggle indicator */}
      <div className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
        enabled
          ? "bg-or-500 text-on-accent"
          : "bg-marine-600 text-muted border border-marine-400/30"
      }`}>
        {enabled ? "✓" : ""}
      </div>

      {/* Icône grande */}
      <div className={`text-4xl mb-3 ${enabled ? "" : "grayscale"}`}>
        {section.icon}
      </div>

      {/* Titre */}
      <h3 className={`font-semibold text-base mb-1 ${
        enabled ? "text-creme-200" : "text-muted"
      }`}>
        {section.title}
      </h3>

      {/* Description */}
      <p className={`text-sm ${enabled ? "text-muted-light" : "text-muted-dark"}`}>
        {variableLabel}
      </p>
    </button>
  );
}
