# /teamplay — Implémentation de la génération IA dans FTGen

## Objectif

Ajouter un bouton "Compléter par IA" dans FTGen qui envoie les documents liés + un schéma JSON dynamique à un LLM (Claude par défaut, multi-provider configurable), reçoit un JSON de réponse, et injecte les valeurs (textes LaTeX + checkboxes) directement dans l'éditeur.

## Architecture cible

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                                │
│                                                                   │
│  1. L'utilisateur configure : template + structure + documents    │
│  2. Clic "Compléter par IA"                                      │
│  3. buildAiSchema() construit le JSON-schéma dynamiquement       │
│  4. Appel Tauri : generate_with_ai(schema, docs, prompt)         │
│  5. Réception du JSON complété → injection dans values            │
└────────────────────┬──────────────────────────────────────────────┘
                     │ Tauri invoke
┌────────────────────▼──────────────────────────────────────────────┐
│  Backend Rust                                                      │
│                                                                     │
│  1. Charge les documents (PDF en base64, texte extrait pour le reste)│
│  2. Construit le prompt système (schéma + guide LaTeX + documents)  │
│  3. Appel HTTP au provider LLM configuré                            │
│  4. Parse la réponse JSON                                           │
│  5. Retourne le JSON au frontend                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Contexte technique complet

### Stack

- **Frontend** : React 18 + TypeScript + Tailwind CSS
- **Backend** : Tauri 2.0 (Rust), crate `reqwest` pour HTTP
- **Compilateur** : LuaLaTeX
- **Package manager** : pnpm

### Fichiers clés existants

| Fichier | Rôle |
|---------|------|
| `src-tauri/src/commands.rs` | Toutes les commandes Tauri (800+ lignes) |
| `src-tauri/src/lib.rs` | Enregistrement des commandes |
| `src-tauri/Cargo.toml` | Dépendances Rust |
| `src/lib/types.ts` | Types TypeScript partagés |
| `src/hooks/useEditorState.ts` | Hook principal de l'éditeur (state, save, compile) |
| `src/components/editor/EditorContent.tsx` | Contenu de l'éditeur (sections, checkboxes) |
| `src/components/editor/EditorToolbar.tsx` | Barre d'outils (boutons save, compile, export) |
| `src/components/SettingsModal.tsx` | Modal de configuration |
| `src/styles/globals.css` | Design system (dark/light mode) |

### Format JSON des projets (NE PAS MODIFIER)

Le format interne de `data.json` reste inchangé. Voir `src-tauri/src/commands.rs` pour les structs `ProjectData`, `AppConfig`, `TemplateMeta`, etc.

L'état de l'éditeur est dans `useEditorState.ts` :
- `values: Record<string, unknown>` — toutes les valeurs (texte, checkboxes 0/1, contenu LaTeX, marges)
- `meta: TemplateMeta` — métadonnées du template (variables, sections, body_config)
- `disabledSections: string[]` — sections désactivées
- `disabledMetaGroups: string[]` — groupes de checkboxes masqués
- `hiddenMetaItems: Set<string>` — items individuels masqués
- `customSections: CustomSection[]` — sections créées par l'utilisateur
- `linkedDocuments: LinkedDocument[]` — documents liés
- `selectedDocIds: Set<string>` — documents sélectionnés pour la fiche

### Prompt système pour le LLM

Le fichier `prompt-generation-ia-fiche.md` à la racine du projet contient le prompt système complet à envoyer au LLM. Il décrit le rôle, les instructions, les contraintes et le format de sortie attendu.

---

## Tâches à réaliser (dans l'ordre)

### Tâche 1 : Configuration provider dans AppConfig

**Fichiers** : `commands.rs`, `types.ts`, `SettingsModal.tsx`

Ajouter à `AppConfig` :

```rust
// commands.rs
pub struct AppConfig {
    // ... existant ...
    #[serde(default = "default_ai_provider")]
    pub ai_provider: String,         // "anthropic", "openai", "mistral", "ollama"
    #[serde(default)]
    pub ai_api_key: String,          // Clé API (vide = désactivé)
    #[serde(default = "default_ai_model")]
    pub ai_model: String,            // ex: "claude-sonnet-4-20250514"
    #[serde(default = "default_ai_endpoint")]
    pub ai_endpoint: String,         // URL custom (pour Ollama ou proxy)
}

fn default_ai_provider() -> String { "anthropic".to_string() }
fn default_ai_model() -> String { "claude-sonnet-4-20250514".to_string() }
fn default_ai_endpoint() -> String { "".to_string() }
```

**TypeScript** (types.ts) :
```typescript
export interface AppConfig {
  // ... existant ...
  ai_provider: "anthropic" | "openai" | "mistral" | "ollama";
  ai_api_key: string;
  ai_model: string;
  ai_endpoint: string;
}
```

**SettingsModal.tsx** — Ajouter une section "Intelligence Artificielle" :
- Sélecteur de provider (dropdown)
- Champ clé API (masqué type password)
- Champ modèle (avec suggestions selon le provider)
- Champ endpoint optionnel (pour Ollama)
- Bouton "Tester la connexion" qui fait un ping simple au provider

### Tâche 2 : Commande Rust `generate_with_ai`

**Fichier** : `commands.rs` (+ enregistrer dans `lib.rs`)

**Dépendance Rust à ajouter** dans Cargo.toml :
```toml
reqwest = { version = "0.12", features = ["json", "multipart"] }
```

**Signature** :
```rust
#[tauri::command]
pub async fn generate_with_ai(
    app: tauri::AppHandle,
    schema: serde_json::Value,        // Le schéma JSON construit par le frontend
    documents: Vec<DocumentPayload>,  // Documents à transmettre
    user_prompt: String,              // Prompt additionnel de l'utilisateur
    system_prompt: String,            // Prompt système (depuis prompt-generation-ia-fiche.md)
) -> Result<serde_json::Value, String>
```

**Struct DocumentPayload** :
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentPayload {
    pub filename: String,
    pub mime_type: String,
    pub content_base64: Option<String>,  // Pour PDF/images (envoi natif)
    pub content_text: Option<String>,    // Pour texte extrait
}
```

**Logique** :
1. Lire `AppConfig` pour obtenir provider/key/model/endpoint
2. Construire le prompt système en injectant le schéma + guide LaTeX
3. Pour chaque document :
   - PDF → lire en base64 depuis le chemin, ajouter comme content block (Anthropic) ou extraire le texte (autres)
   - DOCX/TEX/TXT → lire le contenu texte
4. Appeler l'API du provider :
   - **Anthropic** : POST `https://api.anthropic.com/v1/messages` avec `model`, `system`, `messages` (documents en `content` blocks type `document`/`image`)
   - **OpenAI** : POST `https://api.openai.com/v1/chat/completions` avec `model`, `messages` (documents en texte dans le user message)
   - **Mistral** : POST `https://api.mistral.ai/v1/chat/completions` (même format qu'OpenAI)
   - **Ollama** : POST `http://localhost:11434/api/chat` (ou endpoint custom)
5. Extraire le JSON de la réponse (le LLM retourne un JSON dans un bloc de texte, il faut parser)
6. Valider que les clés correspondent au schéma envoyé
7. Retourner le JSON complété

**Gestion d'erreurs** : retourner des messages explicites en français :
- "Clé API manquante" si vide
- "Erreur de connexion : {detail}" si timeout/réseau
- "Le modèle n'a pas retourné un JSON valide" si parsing échoue
- "Réponse incomplète : les champs X, Y sont manquants" si validation échoue

### Tâche 3 : Commande Rust `read_document_for_ai`

**Fichier** : `commands.rs`

Helper pour lire un document et le préparer pour l'envoi :

```rust
#[tauri::command]
pub async fn read_document_for_ai(
    path: String,
) -> Result<DocumentPayload, String>
```

**Logique** :
- Détecte le mime type depuis l'extension
- PDF/PNG/JPG → lit en base64
- TEX/TXT/MD → lit en texte UTF-8
- DOCX → tente d'extraire le texte (lecture simple du XML interne, ou fallback "Document DOCX — extraction non supportée")
- Retourne `DocumentPayload` avec le bon champ rempli

### Tâche 4 : Construction du schéma côté frontend

**Fichier** : `src/hooks/useEditorState.ts` (ou nouveau fichier `src/lib/ai-schema.ts`)

Fonction `buildAiSchema` qui construit le schéma JSON à partir de l'état actuel :

```typescript
export function buildAiSchema(
  meta: TemplateMeta,
  values: Record<string, unknown>,
  disabledSections: string[],
  disabledMetaGroups: string[],
  hiddenMetaItems: Set<string>,
  customSections: CustomSection[],
): AiSchema {
  const fields: Record<string, AiField> = {};
  const checkboxes: Record<string, AiCheckbox> = {};

  // 1. Champs texte (type "text") — seulement les non-marges
  for (const v of meta.variables.filter(v => v.type === "text")) {
    fields[v.name] = {
      type: "text",
      description: v.label || v.description,
      current_value: String(values[v.name] || ""),
    };
  }

  // 2. Champs contenu (type "content") — seulement les sections actives
  for (const v of meta.variables.filter(v => v.type === "content")) {
    const section = meta.sections.find(s => s.variable === v.name);
    if (section && disabledSections.includes(section.id)) continue;
    fields[v.name] = {
      type: "content",
      description: v.label || v.description,
      current_value: String(values[v.name] || ""),
    };
  }

  // 3. Sections custom actives
  for (const cs of customSections) {
    if (disabledSections.includes(cs.id)) continue;
    fields[cs.variableName] = {
      type: "content",
      description: cs.title + " — " + cs.description,
      current_value: String(values[cs.variableName] || ""),
    };
  }

  // 4. Checkboxes — seulement les groupes actifs et items non masqués
  for (const v of meta.variables.filter(v => v.type === "checkbox")) {
    if (disabledMetaGroups.includes(v.group)) continue;
    if (hiddenMetaItems.has(v.name)) continue;
    checkboxes[v.name] = {
      label: v.label || v.description,
      group: v.group,
      current_value: Number(values[v.name] || 0),
    };
  }

  return { fields, checkboxes };
}
```

### Tâche 5 : Guide LaTeX dynamique

**Fichier** : `src/lib/ai-latex-guide.ts` (nouveau)

Fonction qui génère un guide LaTeX adapté au template :

```typescript
export function buildLatexGuide(meta: TemplateMeta): string {
  const bc = meta.body_config;
  const colors = new Set<string>();
  meta.sections.forEach(s => {
    if (s.frame_color) colors.add(s.frame_color);
    if (s.bg_color) colors.add(s.bg_color);
  });

  return `
## Commandes LaTeX autorisées

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
${[...colors].map(c => `- \\color{${c}} — Couleur "${c}"`).join("\n")}

### Conventions
- Écrire en français avec accents
- Utiliser \\begin{itemize}...\\end{itemize} pour les listes d'objectifs
- Utiliser \\textbf{Phase N (durée)} : description pour le déroulement
- Séparer les phases par \\\\
- Pour la liste de fichiers : \\textbullet\\ Nom du fichier\\\\[2pt]
`;
}
```

### Tâche 6 : Bouton "Compléter par IA" dans l'UI

**Fichiers** : `EditorToolbar.tsx`, `useEditorState.ts`, `EditorPage.tsx`

#### EditorToolbar.tsx

Ajouter un bouton "Compléter par IA" dans la barre d'outils, entre "Sauvegarder" et "Compiler" :

```tsx
<button
  onClick={onAiGenerate}
  disabled={aiGenerating || !hasLinkedDocuments}
  className={`text-sm px-4 py-1.5 rounded-md border transition-colors ${
    aiGenerating
      ? "border-purple-500/30 bg-purple-900/20 text-purple-300 animate-pulse"
      : hasLinkedDocuments
        ? "border-purple-500/30 bg-purple-900/20 text-purple-300 hover:bg-purple-800/30"
        : "border-marine-400/20 bg-marine-700/50 text-muted cursor-not-allowed"
  }`}
  title={hasLinkedDocuments ? "Compléter la fiche avec l'IA" : "Liez au moins un document pour utiliser l'IA"}
>
  {aiGenerating ? "⏳ Génération..." : "🤖 Compléter par IA"}
</button>
```

Si aucun document n'est lié, le bouton est grisé avec un tooltip explicatif.

#### Modal de prompt additionnel

Avant de lancer la génération, afficher une petite modal :
- Zone de texte pour le prompt additionnel (optionnel)
- Rappel des documents qui seront envoyés
- Bouton "Générer" / "Annuler"

#### useEditorState.ts

Ajouter dans le hook :
```typescript
const [aiGenerating, setAiGenerating] = useState(false);
const [aiError, setAiError] = useState<string | null>(null);

const handleAiGenerate = async (userPrompt: string) => {
  if (!meta || linkedDocuments.length === 0) return;

  setAiGenerating(true);
  setAiError(null);

  try {
    // 1. Construire le schéma
    const schema = buildAiSchema(meta, values, disabledSections, disabledMetaGroups, hiddenMetaItems, customSections);

    // 2. Construire le guide LaTeX
    const latexGuide = buildLatexGuide(meta);

    // 3. Préparer les documents
    const docs = await Promise.all(
      linkedDocuments.map(doc => invoke<DocumentPayload>("read_document_for_ai", { path: doc.path }))
    );

    // 4. Lire le prompt système (embarqué ou depuis fichier)
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE
      .replace("{{SCHEMA_JSON}}", JSON.stringify(schema, null, 2))
      .replace("{{LATEX_GUIDE}}", latexGuide);

    // 5. Appeler le backend
    const result = await invoke<{ fields: Record<string, string>; checkboxes: Record<string, number> }>(
      "generate_with_ai",
      { schema, documents: docs, userPrompt, systemPrompt }
    );

    // 6. Injecter les résultats dans values
    const newValues = { ...values };
    for (const [key, val] of Object.entries(result.fields)) {
      newValues[key] = val;
    }
    for (const [key, val] of Object.entries(result.checkboxes)) {
      newValues[key] = val;
    }
    setValues(newValues);

    // 7. Toast de succès
    toast.success("Fiche complétée par l'IA");

  } catch (err) {
    const msg = String(err);
    setAiError(msg);
    toast.error(`Erreur IA : ${msg}`);
  } finally {
    setAiGenerating(false);
  }
};
```

### Tâche 7 : Prompt système embarqué

**Fichier** : `src/lib/ai-system-prompt.ts` (nouveau)

Embarquer le contenu de `prompt-generation-ia-fiche.md` en tant que template string TypeScript, avec les placeholders `{{SCHEMA_JSON}}`, `{{LATEX_GUIDE}}`, `{{USER_PROMPT}}`.

Le frontend construit le prompt complet avant de l'envoyer au backend.

### Tâche 8 : Tests et validation

1. `cargo check` dans `src-tauri/` — compilation Rust OK
2. `npx tsc --noEmit` — compilation TypeScript OK
3. Test fonctionnel : créer une fiche, lier un document PDF, cliquer "Compléter par IA"
4. Vérifier que les champs sont remplis et les checkboxes cochées
5. Vérifier que la compilation LaTeX fonctionne après injection

---

## Résumé des fichiers à modifier/créer

| Fichier | Action | Tâche |
|---------|--------|-------|
| `src-tauri/Cargo.toml` | Ajouter `reqwest` | T2 |
| `src-tauri/src/commands.rs` | Ajouter `AppConfig` fields IA + `generate_with_ai` + `read_document_for_ai` | T1, T2, T3 |
| `src-tauri/src/lib.rs` | Enregistrer les nouvelles commandes | T2, T3 |
| `src/lib/types.ts` | Ajouter types AppConfig IA + `AiSchema` + `DocumentPayload` | T1, T4 |
| `src/lib/ai-schema.ts` | **Créer** — buildAiSchema() | T4 |
| `src/lib/ai-latex-guide.ts` | **Créer** — buildLatexGuide() | T5 |
| `src/lib/ai-system-prompt.ts` | **Créer** — template du prompt système | T7 |
| `src/hooks/useEditorState.ts` | Ajouter handleAiGenerate, aiGenerating, aiError | T6 |
| `src/components/editor/EditorToolbar.tsx` | Ajouter bouton "Compléter par IA" | T6 |
| `src/components/SettingsModal.tsx` | Section config IA (provider, clé, modèle) | T1 |
| `src/pages/EditorPage.tsx` | Passer props IA au toolbar | T6 |

## Conventions à respecter

- **Accents français** partout (code, commentaires, messages)
- **Design system** : utiliser les classes existantes (btn-primary, card, chip, input-field, section-title)
- **Couleur IA** : violet/purple pour distinguer les éléments IA du reste (border-purple-500, bg-purple-900, text-purple-300)
- **Toasts** : utiliser le système de toasts existant pour les retours utilisateur
- **Erreurs explicites en français** : jamais d'anglais dans les messages d'erreur affichés
- **Pas de migration de format** : le format JSON interne des projets ne change pas
- Lire les fichiers avant de les modifier (convention CLAUDE.md)

## Ordre d'exécution recommandé pour le teamplay

```
Agent 1 (Rust) : T1 (AppConfig) → T2 (generate_with_ai) → T3 (read_document_for_ai)
Agent 2 (TS)   : T4 (buildAiSchema) → T5 (buildLatexGuide) → T7 (prompt système)
Agent 3 (UI)   : T1 (SettingsModal section IA) → T6 (bouton + modal + injection)
```

Les agents 1 et 2 peuvent travailler en parallèle. L'agent 3 attend que T1 soit fini (AppConfig types) avant de commencer.

L'agent 8 (tests) intervient quand les 3 autres ont terminé.
