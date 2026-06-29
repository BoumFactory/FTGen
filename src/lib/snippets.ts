import type { Snippet, SnippetCategory } from "./types";

const GENERAL_SNIPPETS: Snippet[] = [
  { label: "Gras", code: "\\textbf{texte}", description: "Texte en gras" },
  { label: "Italique", code: "\\textit{texte}", description: "Texte en italique" },
  { label: "Souligné", code: "\\underline{texte}", description: "Texte souligné" },
  { label: "Accentué", code: "\\acc{texte}", description: "Accentuation contextuelle" },
  { label: "Liste à puces", code: "\\begin{itemize}\n\\item \n\\item \n\\end{itemize}", description: "Liste non ordonnée" },
  { label: "Liste numérotée", code: "\\begin{enumerate}\n\\item \n\\item \n\\end{enumerate}", description: "Liste ordonnée" },
  { label: "Lien", code: "\\href{url}{texte}", description: "Lien hypertexte" },
  { label: "Couleur", code: "\\textcolor{or}{texte}", description: "Texte en couleur" },
  { label: "Cadre", code: "\\fbox{contenu}", description: "Contenu encadré" },
  { label: "Saut de ligne", code: "\\\\[3pt]\n", description: "Retour à la ligne avec espacement" },
];

const RESUME_SNIPPETS: Snippet[] = [
  { label: "En bref", code: "\\textbf{En bref :} ", description: "Introduction résumé" },
  { label: "Emphase", code: "\\emph{texte important}", description: "Mise en valeur" },
  { label: "2 colonnes", code: "\\begin{minipage}[t]{0.48\\linewidth}\n\n\\end{minipage}\\hfill\n\\begin{minipage}[t]{0.48\\linewidth}\n\n\\end{minipage}", description: "Deux colonnes côte à côte" },
];

const OBJECTIFS_SNIPPETS: Snippet[] = [
  { label: "Objectifs type", code: "\\begin{itemize}\n\\item \\textbf{Savoir} : \n\\item \\textbf{Savoir-faire} : \n\\item \\textbf{Savoir-être} : \n\\end{itemize}", description: "Liste savoir/savoir-faire/savoir-être" },
  { label: "Compétence", code: "\\item \\textbf{Compétence :} ", description: "Item de compétence" },
  { label: "Verbe d'action", code: "\\item \\textbf{Identifier} / \\textbf{Analyser} / \\textbf{Produire} : ", description: "Objectif avec verbe d'action" },
];

const MODALITES_IA_SNIPPETS: Snippet[] = [
  { label: "Prompt IA", code: "\\begin{quote}\n\\textit{Prompt :} «~\\texttt{votre prompt ici}~»\n\\end{quote}", description: "Bloc de prompt" },
  { label: "Dialogue", code: "\\textbf{Élève :} «~question~»\\\\\n\\textbf{IA :} «~réponse~»\\\\[3pt]", description: "Échange élève/IA" },
  { label: "Alerte IA", code: "\\textbf{\\textcolor{red}{Attention :}} Toujours vérifier les réponses de l'IA.", description: "Avertissement IA" },
];

const DEROULEMENT_SNIPPETS: Snippet[] = [
  { label: "Phases", code: "\\begin{enumerate}\n\\item \\textbf{Découverte} (10 min) : \n\\item \\textbf{Pratique} (20 min) : \n\\item \\textbf{Synthèse} (10 min) : \n\\end{enumerate}", description: "Phases du déroulement" },
  { label: "Durée", code: "\\textit{(\\textbf{X} min)}", description: "Indication de durée" },
  { label: "Consigne", code: "\\textbf{Consigne :} «~consigne élève~»", description: "Consigne pour les élèves" },
  { label: "Différenciation", code: "\\textbf{Différenciation :}\n\\begin{itemize}\n\\item \\textit{Approfondissement :} \n\\item \\textit{Remédiation :} \n\\end{itemize}", description: "Bloc de différenciation" },
  { label: "Séparateur", code: "\\medskip\\noindent\\rule{\\linewidth}{0.2pt}\\medskip\n", description: "Séparateur de phase" },
];

const VIGILANCE_SNIPPETS: Snippet[] = [
  { label: "Point de vigilance", code: "\\textbf{\\textcolor{red}{Point de vigilance :}} ", description: "Alerte importante" },
  { label: "Erreur fréquente", code: "\\textbf{Erreur fréquente :} ", description: "Erreur à anticiper" },
  { label: "Remédiation", code: "\\textbf{Remédiation :}\n\\begin{itemize}\n\\item \n\\end{itemize}", description: "Piste de remédiation" },
  { label: "Conseil", code: "\\textbf{Conseil :} \\textit{}", description: "Conseil pédagogique" },
];

const FICHIERS_SNIPPETS: Snippet[] = [
  { label: "Fichier", code: "\\item \\texttt{nom\\_fichier.ext} — Description", description: "Référence fichier" },
  { label: "Lien ressource", code: "\\href{https://}{\\texttt{Nom du lien}}", description: "Lien vers ressource" },
  { label: "Liste fichiers", code: "\\begin{itemize}\n\\item \\texttt{fichier1.pdf} — \n\\item \\texttt{fichier2.pdf} — \n\\end{itemize}", description: "Liste de fichiers" },
];

const SNIPPET_CATALOG: Record<SnippetCategory, Snippet[]> = {
  general: GENERAL_SNIPPETS,
  resume: RESUME_SNIPPETS,
  objectifs: OBJECTIFS_SNIPPETS,
  modalites_ia: MODALITES_IA_SNIPPETS,
  deroulement: DEROULEMENT_SNIPPETS,
  vigilance: VIGILANCE_SNIPPETS,
  fichiers: FICHIERS_SNIPPETS,
};

/** Retourne les snippets pertinents pour une catégorie (general + spécifique) */
export function getSnippetsForCategory(category: SnippetCategory): Snippet[] {
  if (category === "general") return GENERAL_SNIPPETS;
  return [...GENERAL_SNIPPETS, ...SNIPPET_CATALOG[category]];
}

/** Détermine la catégorie de snippet à partir du nom de variable ou de section */
export function inferSnippetCategory(variableName: string): SnippetCategory {
  const lower = variableName.toLowerCase();
  if (lower.includes("resume") || lower.includes("résumé") || lower.includes("synthese")) return "resume";
  if (lower.includes("objectif")) return "objectifs";
  if (lower.includes("ia") || lower.includes("modalit")) return "modalites_ia";
  if (lower.includes("deroulement") || lower.includes("déroulement") || lower.includes("seance")) return "deroulement";
  if (lower.includes("vigilance") || lower.includes("attention") || lower.includes("erreur")) return "vigilance";
  if (lower.includes("fichier") || lower.includes("ressource") || lower.includes("annexe")) return "fichiers";
  return "general";
}

export { SNIPPET_CATALOG, GENERAL_SNIPPETS };
