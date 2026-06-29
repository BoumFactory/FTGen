import type { SnippetCategory } from "./types";

// Utiliser le type Monaco exposé par @monaco-editor/react (pas d'import direct de monaco-editor)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MonacoInstance = any;

interface CompletionEntry {
  label: string;
  insertText: string;
  detail: string;
  kind: "command" | "environment" | "snippet";
}

// Commandes LaTeX de base
const BASE_COMMANDS: CompletionEntry[] = [
  { label: "\\textbf", insertText: "\\textbf{${1:texte}}", detail: "Texte en gras", kind: "command" },
  { label: "\\textit", insertText: "\\textit{${1:texte}}", detail: "Texte en italique", kind: "command" },
  { label: "\\underline", insertText: "\\underline{${1:texte}}", detail: "Texte souligné", kind: "command" },
  { label: "\\emph", insertText: "\\emph{${1:texte}}", detail: "Emphase", kind: "command" },
  { label: "\\texttt", insertText: "\\texttt{${1:code}}", detail: "Police monospace", kind: "command" },
  { label: "\\textcolor", insertText: "\\textcolor{${1:couleur}}{${2:texte}}", detail: "Texte coloré", kind: "command" },
  { label: "\\href", insertText: "\\href{${1:url}}{${2:texte}}", detail: "Lien hypertexte", kind: "command" },
  { label: "\\section", insertText: "\\section{${1:Titre}}", detail: "Section", kind: "command" },
  { label: "\\subsection", insertText: "\\subsection{${1:Sous-titre}}", detail: "Sous-section", kind: "command" },
  { label: "\\paragraph", insertText: "\\paragraph{${1:titre}}", detail: "Paragraphe", kind: "command" },
  { label: "\\includegraphics", insertText: "\\includegraphics[width=${1:0.8}\\linewidth]{${2:image}}", detail: "Inclure image", kind: "command" },
  { label: "\\vspace", insertText: "\\vspace{${1:5pt}}", detail: "Espace vertical", kind: "command" },
  { label: "\\hspace", insertText: "\\hspace{${1:5pt}}", detail: "Espace horizontal", kind: "command" },
  { label: "\\noindent", insertText: "\\noindent ", detail: "Supprimer indentation", kind: "command" },
  { label: "\\medskip", insertText: "\\medskip\n", detail: "Saut moyen", kind: "command" },
  { label: "\\bigskip", insertText: "\\bigskip\n", detail: "Grand saut", kind: "command" },
  { label: "\\fbox", insertText: "\\fbox{${1:contenu}}", detail: "Cadre", kind: "command" },
  { label: "\\centering", insertText: "\\centering\n", detail: "Centrer", kind: "command" },
  { label: "\\item", insertText: "\\item ${1}", detail: "Élément de liste", kind: "command" },
  { label: "\\caption", insertText: "\\caption{${1:légende}}", detail: "Légende", kind: "command" },
  { label: "\\label", insertText: "\\label{${1:label}}", detail: "Étiquette", kind: "command" },
  { label: "\\ref", insertText: "\\ref{${1:label}}", detail: "Référence", kind: "command" },
  { label: "\\footnote", insertText: "\\footnote{${1:note}}", detail: "Note de bas de page", kind: "command" },
];

// Environnements LaTeX
const BASE_ENVIRONMENTS: CompletionEntry[] = [
  { label: "itemize", insertText: "\\begin{itemize}[leftmargin=*,itemsep=1pt]\n\t\\item ${1}\n\\end{itemize}", detail: "Liste à puces", kind: "environment" },
  { label: "enumerate", insertText: "\\begin{enumerate}[leftmargin=*,itemsep=1pt]\n\t\\item ${1}\n\\end{enumerate}", detail: "Liste numérotée", kind: "environment" },
  { label: "tabular", insertText: "\\begin{tabular}{|${1:l|c|r|}}\n\\hline\n${2:Col1} & ${3:Col2} \\\\\\\\\n\\hline\n\\end{tabular}", detail: "Tableau", kind: "environment" },
  { label: "figure", insertText: "\\begin{figure}[H]\n\\centering\n\\includegraphics[width=0.8\\linewidth]{${1:image}}\n\\caption{${2:Légende}}\n\\end{figure}", detail: "Figure", kind: "environment" },
  { label: "minipage", insertText: "\\begin{minipage}[t]{${1:0.48}\\linewidth}\n${2}\n\\end{minipage}", detail: "Minipage", kind: "environment" },
  { label: "center", insertText: "\\begin{center}\n${1}\n\\end{center}", detail: "Centré", kind: "environment" },
  { label: "quote", insertText: "\\begin{quote}\n${1}\n\\end{quote}", detail: "Citation", kind: "environment" },
  { label: "verbatim", insertText: "\\begin{verbatim}\n${1}\n\\end{verbatim}", detail: "Code brut", kind: "environment" },
  { label: "tcolorbox", insertText: "\\begin{tcolorbox}[title=${1:Titre}]\n${2}\n\\end{tcolorbox}", detail: "Boîte colorée", kind: "environment" },
];

// Complétions contextuelles par section
const CONTEXTUAL_COMPLETIONS: Partial<Record<SnippetCategory, CompletionEntry[]>> = {
  objectifs: [
    { label: "objectif-savoir", insertText: "\\item \\textbf{Savoir :} ${1}", detail: "Objectif de savoir", kind: "snippet" },
    { label: "objectif-faire", insertText: "\\item \\textbf{Savoir-faire :} ${1}", detail: "Objectif de savoir-faire", kind: "snippet" },
    { label: "objectif-etre", insertText: "\\item \\textbf{Savoir-être :} ${1}", detail: "Objectif de savoir-être", kind: "snippet" },
    { label: "compétence", insertText: "\\item \\textbf{Compétence :} ${1}", detail: "Item compétence", kind: "snippet" },
  ],
  deroulement: [
    { label: "phase", insertText: "\\item \\textbf{Phase ${1:1} — ${2:Titre}} (${3:10} min) :\n${4}", detail: "Phase du déroulement", kind: "snippet" },
    { label: "consigne", insertText: "\\textbf{Consigne :} «~${1}~»", detail: "Consigne élève", kind: "snippet" },
    { label: "différenciation", insertText: "\\textbf{Différenciation :}\n\\begin{itemize}[leftmargin=*]\n\\item \\textit{Approfondissement :} ${1}\n\\item \\textit{Remédiation :} ${2}\n\\end{itemize}", detail: "Bloc de différenciation", kind: "snippet" },
  ],
  modalites_ia: [
    { label: "prompt-ia", insertText: "\\begin{quote}\n\\textit{Prompt :} «~\\texttt{${1}}~»\n\\end{quote}", detail: "Bloc de prompt IA", kind: "snippet" },
    { label: "dialogue-ia", insertText: "\\textbf{Élève :} «~${1}~»\\\\\\\\\n\\textbf{IA :} «~${2}~»\\\\\\\\[3pt]", detail: "Échange élève/IA", kind: "snippet" },
  ],
  vigilance: [
    { label: "attention", insertText: "\\textbf{\\textcolor{red}{⚠ Point de vigilance :}} ${1}", detail: "Point de vigilance", kind: "snippet" },
    { label: "erreur", insertText: "\\textbf{Erreur fréquente :} ${1}", detail: "Erreur à anticiper", kind: "snippet" },
    { label: "remédiation", insertText: "\\textbf{Remédiation :} ${1}", detail: "Piste de remédiation", kind: "snippet" },
  ],
};

/**
 * Crée et enregistre le provider d'autocomplétion LaTeX pour Monaco.
 * Retourne un IDisposable à nettoyer dans le cleanup du useEffect.
 */
export function registerLatexCompletionProvider(
  monaco: MonacoInstance,
  sectionCategory?: SnippetCategory
): { dispose: () => void } {
  return monaco.languages.registerCompletionItemProvider("latex", {
    triggerCharacters: ["\\"],
    provideCompletionItems(model: MonacoInstance, position: MonacoInstance) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Vérifier si on tape une commande (après \)
      const lineContent = model.getLineContent(position.lineNumber);
      const charBefore = lineContent[position.column - 2];
      const isAfterBackslash = charBefore === "\\";
      // Vérifier si on est dans un \begin{
      const textBefore = lineContent.substring(0, position.column - 1);
      const beginMatch = textBefore.match(/\\begin\{(\w*)$/);

      const suggestions: MonacoInstance[] = [];

      if (beginMatch) {
        // Proposer les environnements
        for (const env of BASE_ENVIRONMENTS) {
          suggestions.push({
            label: env.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: env.insertText.replace(/^\\begin\{[^}]*\}/, beginMatch[0].endsWith("{") ? "" : ""),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: env.detail,
            range,
          });
        }
      } else if (isAfterBackslash) {
        // Proposer les commandes
        for (const cmd of BASE_COMMANDS) {
          suggestions.push({
            label: cmd.label,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: cmd.insertText.replace(/^\\/, ""),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: cmd.detail,
            range,
          });
        }
        // Proposer les environnements via \begin
        suggestions.push({
          label: "\\begin",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "begin{${1:env}}\n\t${2}\n\\\\end{${1:env}}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: "Environnement",
          range,
        });
      }

      // Ajouter les complétions contextuelles
      if (sectionCategory && CONTEXTUAL_COMPLETIONS[sectionCategory]) {
        for (const ctx of CONTEXTUAL_COMPLETIONS[sectionCategory]!) {
          suggestions.push({
            label: ctx.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: ctx.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: `[${sectionCategory}] ${ctx.detail}`,
            range,
            sortText: "0" + ctx.label, // Priorité haute pour les contextuels
          });
        }
      }

      return { suggestions };
    },
  });
}
