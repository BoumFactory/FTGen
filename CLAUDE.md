# FTGen — Générateur de Fiches Techniques LaTeX

## Stack technique

- **Frontend** : React 18.3 + TypeScript + Tailwind CSS + Monaco Editor + React-PDF
- **Backend** : Tauri 2.0 (Rust) + LuaLaTeX
- **Package manager** : pnpm 10.8.0
- **Build** : Vite 6.0
- **Compilateur LaTeX** : LuaLaTeX (auto-détecté ou configurable)

## Structure du projet

```
FTGen/
├── src/                          # Frontend React
│   ├── main.tsx                 # Point d'entrée
│   ├── App.tsx                  # Composant racine (routing, zoom Ctrl+Molette)
│   ├── pages/
│   │   ├── HomePage.tsx         # Accueil : templates + projets récents
│   │   └── EditorPage.tsx       # Éditeur principal (structure/édition/compilation)
│   ├── components/
│   │   ├── MonacoSection.tsx    # Éditeur LaTeX Monaco (collapsible, snippets, fullscreen)
│   │   ├── PdfViewer.tsx        # Aperçu PDF (react-pdf)
│   │   ├── SectionManager.tsx   # Modal gestion sections (renommer, réordonner, icônes)
│   │   ├── SettingsModal.tsx    # Configuration (chemins, police, debounce)
│   │   └── ContentImporter.tsx  # Import contenu cross-projet (3 colonnes)
│   ├── lib/
│   │   ├── types.ts             # Types TypeScript partagés
│   │   ├── snippets.ts          # Bibliothèque de snippets LaTeX
│   │   ├── profiles.ts          # Profils prédéfinis (GT Standard, Minimal, etc.)
│   │   └── latex-completion.ts  # Autocomplétion Monaco pour LaTeX
│   └── styles/
│       └── globals.css          # Design system (classes utilitaires Tailwind)
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs               # Point d'entrée Tauri + enregistrement commandes
│   │   └── commands.rs          # Commandes Rust (templates, projets, compilation)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── tailwind.config.js           # Palette marine/or/crème + typographie
├── package.json
└── vite.config.ts
```

## Design System

### Palette de couleurs
- **Marine** : fond principal (`marine-900` à `marine-500`)
- **Or** : accents, actions, titres (`or-500`, `or-400`, `or-300`)
- **Crème** : texte principal (`creme-200`, `creme-300`)
- **Muted** : texte secondaire (`muted`, `muted-light`, `muted-dark`)

### Classes utilitaires (globals.css)
- `.card` : carte standard (fond marine-700, bordure visible, ombre)
- `.card-elevated` : carte surélevée (bordure or, ombre forte)
- `.card-inset` : zone enfoncée (ombre intérieure, pour éditeurs)
- `.section-title` : titre de section avec barre latérale or
- `.chip` / `.chip-active` / `.chip-inactive` : toggle chips pour métadonnées
- `.btn-primary` : bouton or sur fond marine
- `.btn-secondary` : bouton marine avec bordure
- `.input-field` : champ de saisie

## Commandes Tauri (Rust → Frontend)

| Commande | Description |
|----------|-------------|
| `init_ftgen_dir` | Initialise la structure `.ftgen/` |
| `get_templates` | Liste les templates disponibles |
| `load_template_meta` | Charge les métadonnées d'un template |
| `save_project` / `load_project` | Persistance projet |
| `list_projects` | Liste tous les projets |
| `generate_tex` | Génère le `.tex` à partir du template + valeurs |
| `compile_latex` | Compile avec LuaLaTeX |
| `get_config` / `save_config` | Configuration application |
| `read_pdf_base64` | Lit un PDF en base64 pour l'aperçu |
| `load_custom_sections` / `save_custom_sections` | Briques personnalisées globales |
| `load_section_config` / `save_section_config` | Config sections (overrides, ordre, masquage) |

## Flux de données

```
Template (.tex + .meta.json)
  → EditorPage charge les métadonnées
  → Utilisateur remplit les champs (values)
  → computeGenerationValues() prépare les valeurs :
    - Sections désactivées → valeur vide
    - Checkboxes cochées → CBITEMS_group
    - Sections custom → LaTeX tcolorbox
  → generate_tex (Rust) : remplace {{VAR}}, process %%IF%%
  → compile_latex (Rust) : lualatex → PDF
  → PdfViewer affiche le résultat
```

## Conventions

- **Auto-save** : 2s debounce après modification
- **Auto-compile** : 8s après dernière édition (si un PDF existe déjà)
- **Raccourcis** : Ctrl+S (sauvegarder), Ctrl+B (compiler), Ctrl+Molette (zoom)
- **Sections custom** : stockées globalement dans `.ftgen/snippets/custom_sections.json`
- **Config sections** : stockée dans `.ftgen/section_overrides.json`

## Commandes de développement

```bash
pnpm install          # Installer les dépendances
pnpm tauri dev        # Lancer en mode développement
pnpm build            # Build frontend
pnpm tauri build      # Build application complète
npx tsc --noEmit      # Vérification TypeScript
cargo check           # Vérification Rust (depuis src-tauri/)
```
