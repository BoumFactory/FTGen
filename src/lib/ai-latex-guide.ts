import type { TemplateMeta } from "./types";

/**
 * Génère un guide LaTeX adapté au template courant,
 * listant les commandes et couleurs disponibles.
 */
export function buildLatexGuide(meta: TemplateMeta): string {
  const colors = new Set<string>();
  meta.sections.forEach(s => {
    if (s.frame_color) colors.add(s.frame_color);
    if (s.bg_color) colors.add(s.bg_color);
  });

  const colorLines = [...colors].map(c => `- \\color{${c}} — Couleur "${c}"`).join("\n");

  return `## Commandes LaTeX autorisées

### Structure
- \\begin{itemize} ... \\end{itemize} — Listes à puces
- \\item — Élément de liste
- \\textbf{texte} — Gras
- \\textit{texte} — Italique
- \\textsc{texte} — Petites capitales
- \\\\ — Retour à la ligne
- \\\\[Xpt] — Espacement vertical (ex: \\\\[4pt])

### Mise en forme
- \\textbullet\\ — Puce manuelle
- \\faIcon{nom} — Icône FontAwesome (ex: \\faIcon{check}, \\faIcon{lightbulb})

### Couleurs du template
${colorLines}

### Conventions
- Écrire en français avec accents
- Utiliser \\begin{itemize}...\\end{itemize} pour les listes d'objectifs
- Utiliser \\textbf{Phase N (durée)} : description pour le déroulement
- Séparer les phases par \\\\
- Pour la liste de fichiers : \\textbullet\\ Nom du fichier\\\\[2pt]
`;
}
