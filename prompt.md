# FTGen — Générateur de Fiches Techniques LaTeX

## Rôle

Tu es un développeur senior français spécialisé en applications desktop Tauri (Rust + TypeScript). Tu conçois et implémentes **FTGen**, un outil de création de fiches techniques LaTeX destiné à des enseignants de l'académie de Reims (public large, niveau technique variable). L'application doit être intuitive, professionnelle et visuellement soignée.

**critical** : Toute l'application est destinée aux français d'abord donc les accents français seront parfaitement gérés.

## Contexte

Le Groupe de Travail IA/Mathématiques de l'Académie de Reims produit des fiches techniques documentant des ressources pédagogiques. Ces fiches suivent un format LaTeX structuré avec :
- Un bandeau supérieur (logos, titre, année)
- Une barre de métadonnées (cases à cocher : type, niveau, thème, outils IA, compétences)
- Un corps de document avec des boîtes tcolorbox organisées en grille (tcbraster/tcbitemize)

Aujourd'hui ces fiches sont produites manuellement ou via scripts Python + JSON. FTGen remplace ce workflow par une application desktop complète.

**L'application est un outil générique de fiches techniques LaTeX** : le style GT IA/Maths est le cas d'usage principal, mais n'importe quel template .tex avec placeholders `{{NOM}}` peut être ajouté.

## Ressources de référence

Les fichiers suivants servent de modèles pour comprendre la structure et le style des fiches :

<reference_files>
- `{{CHEMIN_PROJET_GT}}/CLAUDE.md` — Documentation du système de templates existant (structure JSON, placeholders, variantes)
- `{{CHEMIN_PROJET_GT}}/templates/` — Les 6 templates LaTeX de référence (sidebar gauche/droite, bandeau top, minimaliste, cartes, académique)
- `{{CHEMIN_PROJET_GT}}/data_exemple.json` — Exemple de données JSON pour remplissage
- `{{CHEMIN_SHOWCASE}}/fiche-loiseau-generator.tex` — Exemple de fiche produite (style sidebar académique)
- `{{CHEMIN_SHOWCASE}}/fiche-showcase.tex` — Exemple de fiche produite (dialogue commenté)
</reference_files>

## Instructions

### Étape 1 : Architecture Tauri + TypeScript

Initialiser un projet Tauri v2 avec :
- **Backend Rust** : gestion fichiers, compilation LaTeX, appels API IA, génération ZIP
- **Frontend TypeScript** (React ou SolidJS) : interface utilisateur, éditeurs Monaco, widgets, prévisualisation PDF
- **Structure du projet** conforme aux conventions Tauri v2

### Étape 2 : Système de templates extensible

Implémenter un moteur de templates :
- Chaque template est un fichier `.tex` contenant des placeholders `{{NOM_VARIABLE}}`
- Un fichier `template.meta.json` accompagne chaque template et décrit :
  - Les variables disponibles (nom, type, description, valeur par défaut)
  - Les sections/boîtes du document et leur organisation en grille
  - Les logos attendus
  - Le compilateur requis (lualatex par défaut)
- L'utilisateur peut ajouter de nouveaux templates en déposant un `.tex` + `.meta.json` dans le dossier templates
- L'application scanne le dossier templates au démarrage et les propose dans l'interface

### Étape 3 : Interface d'édition par widgets

Pour chaque section/boîte définie dans le template :

- **Un widget dédié** avec :
  - Un **éditeur Monaco** intégré avec coloration LaTeX et snippets prédéfinis
  - Des **snippets cliquables** : `\begin{enumerate}...\end{enumerate}`, `\begin{itemize}...\end{itemize}`, `\acc{texte}`, tableaux, etc.
  - Un **mode compact** (par défaut) : hauteur réduite, juste l'essentiel
  - Un **mode étendu** (au clic) : le widget s'agrandit, affiche les commandes avancées et des conseils contextuels

- Pour les champs à cases à cocher (type, niveau, thème, compétences, outils IA) :
  - Widgets dédiés avec cases cochables
  - Mapping automatique vers les variables du template

- **Gestion de logos** : widget de sélection de logo avec aperçu miniature, possibilité de parcourir le dossier logos

### Étape 4 : Système de layout hybride (presets + ajustements)

Implémenter un gestionnaire de mise en page des boîtes :

- **Presets de layout** prédéfinis :
  - 1 colonne pleine largeur
  - 2 colonnes égales
  - 2 colonnes 2/3 + 1/3
  - 3 colonnes égales
  - Grilles imbriquées (tcbraster dans tcbraster)

- **Ajustements ponctuels** par boîte :
  - Nombre de colonnes occupées (raster multicolumn)
  - Possibilité de réorganiser les boîtes par drag-and-drop léger
  - Aperçu schématique de la grille (représentation abstraite, pas WYSIWYG complet)

- **Challenger les presets** : possibilité de tester rapidement plusieurs presets sur le même contenu pour comparer le rendu

- Le layout se traduit en paramètres tcbraster/tcbitemize dans le LaTeX généré

### Étape 5 : Compilation LaTeX et prévisualisation PDF

- **Détection automatique** du chemin LuaLaTeX (TeX Live / MiKTeX) sur le système
- **Possibilité de configurer** manuellement le chemin dans les settings
- **Compilation intelligente** :
  - Déclenchée automatiquement après un délai d'inactivité de l'utilisateur (debounce configurable, ex: 2 secondes)
  - Compilation manuelle via bouton
  - Affichage des erreurs de compilation de manière lisible (pas le log brut)
- **Prévisualisation PDF** :
  - Affichable en onglet séparé ou en side-by-side (préférence utilisateur dans les settings)
  - Actualisation automatique après chaque compilation réussie
  - Zoom, navigation multi-pages

### Étape 6 : Mode IA multi-fournisseur

Deux modes d'utilisation de l'IA :

**Mode A — API intégrée :**
- Configuration des clés API dans les settings (Claude, OpenAI, Gemini, Mistral)
- L'utilisateur sélectionne un fournisseur et un modèle
- Il fournit un **document source** (chemin vers un fichier à décrire) ou une **prédescription textuelle**
- L'app envoie un prompt structuré à l'API avec le contenu source et la structure attendue (basée sur le template.meta.json)
- L'IA retourne un JSON structuré qui remplit automatiquement tous les widgets
- L'utilisateur peut ensuite ajuster manuellement chaque section

**Mode B — Import JSON externe :**
- L'utilisateur colle un JSON (généré par ChatGPT, Claude, etc. en dehors de l'app)
- L'app parse le JSON et remplit les widgets correspondants
- Validation du JSON par rapport au schéma attendu du template

Dans les deux cas, le **chemin du document source** et les **chemins des documents annexes** sont renseignés dans l'interface (champs de sélection de fichiers) et stockés dans le JSON de données pour l'archivage ultérieur.

### Étape 7 : Persistance et gestion des fichiers

**Dossier de travail `.ftgen`** :
- Par défaut : créé à côté de l'exécutable
- Chemin configurable dans les settings de l'app
- Créé automatiquement au premier lancement s'il n'existe pas

**Arborescence `.ftgen/` :**
```
.ftgen/
├── config.json          # Configuration globale de l'app
├── templates/           # Templates .tex + .meta.json (copies actualisables)
├── logos/               # Logos disponibles (copies)
├── projects/            # Fiches créées
│   ├── fiche-001/
│   │   ├── data.json    # Données de la fiche (contenu + métadonnées de classement)
│   │   ├── output.tex   # LaTeX généré
│   │   └── output.pdf   # PDF compilé
│   └── fiche-002/
│       └── ...
└── snippets/            # Snippets LaTeX personnalisés (optionnel)
```

**Métadonnées de classement** (dans chaque `data.json`) :
- Titre, auteur, date de création, date de modification
- Type de ressource, niveau, thème, sous-thème
- Tags libres
- Chemins des documents source et annexes (pour l'archivage)

**Gestion des métadonnées manquantes** :
- Si un JSON importé (manuellement ou via copier-coller) ne contient pas de métadonnées de classement, **ce n'est pas une erreur**
- L'app affiche un formulaire dédié invitant l'utilisateur à renseigner les métadonnées manquantes
- Un **mode IA express** est proposé : l'app envoie le contenu disponible (texte des sections remplies) au fournisseur IA actif, qui analyse et pré-remplit automatiquement les métadonnées (type, niveau, thème, tags). L'utilisateur valide ou ajuste avant insertion
- Les métadonnées sont insérées dans le `data.json` automatiquement après validation

**Fichiers éditables en dehors de l'app** : l'utilisateur peut modifier les `.tex` et `.json` manuellement, l'app détecte les changements et propose de recharger.

### Étape 8 : Archivage et partage

L'export de partage produit **deux fichiers distincts** :
1. **Le PDF** de la fiche technique (fichier seul, prêt à l'upload)
2. **Un ZIP** contenant :
   - Les documents annexes référencés par l'utilisateur (chemins stockés dans data.json)
   - L'app va chercher les **versions actuelles** des fichiers au moment du ZIP (pas de copie anticipée)
   - Les fichiers sont copiés dans le ZIP avec une arborescence plate ou structurée (au choix)

Pas de stockage des annexes dans `.ftgen` — seuls les chemins sont conservés, les fichiers sont récupérés à la volée au moment de l'archivage.

### Étape 9 : Fichiers de configuration

**`config.json` principal** contrôlant l'application :

```json
{
  "general": {
    "ftgen_path": "./.ftgen",
    "language": "fr",
    "theme": "dark"
  },
  "compilation": {
    "lualatex_path": "auto",
    "compile_on_save": true,
    "debounce_ms": 2000
  },
  "preview": {
    "mode": "tab",
    "auto_refresh": true
  },
  "ai": {
    "providers": {
      "claude": { "api_key": "", "default_model": "claude-sonnet-4-20250514" },
      "openai": { "api_key": "", "default_model": "gpt-4o" },
      "gemini": { "api_key": "", "default_model": "gemini-2.5-pro" },
      "mistral": { "api_key": "", "default_model": "mistral-large-latest" }
    },
    "active_provider": "claude"
  },
  "editor": {
    "font_size": 14,
    "word_wrap": true,
    "minimap": false
  }
}
```

### Étape 10 : UX et design

L'interface doit être **professionnelle et soignée** :
- Palette marine/or/crème inspirée des fiches GT (cohérence visuelle)
- Layout responsive avec panneaux redimensionnables
- Navigation claire : liste des fiches → édition → prévisualisation
- Raccourcis clavier pour les actions fréquentes (compiler, sauvegarder, basculer aperçu)
- Messages d'erreur humains et contextuels (pas de traces techniques brutes)
- Onboarding : premier lancement guidé (détection LuaLaTeX, choix du dossier, import des templates de base)

## Contraintes

- **Stack technique** : Tauri v2 + Rust (backend) + TypeScript + React ou SolidJS (frontend)
- **Compilateur LaTeX** : LuaLaTeX requis sur la machine de l'utilisateur (pas embarqué)
- **Éditeur de code** : Monaco Editor (pas CodeMirror)
- **Encodage** : UTF-8 partout
- **OS cible** : Windows principalement (les utilisateurs sont sur Windows), compatibilité macOS/Linux souhaitée
- **Pas de serveur distant** : tout est local (sauf les appels API IA)
- **Clés API** : stockées localement dans le config, jamais transmises à un tiers autre que le fournisseur choisi
- **Performance** : la compilation ne doit pas bloquer l'interface (processus asynchrone)

## Format de sortie

L'implémentation doit produire :
1. Un projet Tauri v2 complet et compilable
2. Un README.md avec instructions d'installation et d'utilisation
3. Les templates GT IA/Maths de référence pré-intégrés dans le dossier templates
4. Un fichier de configuration par défaut fonctionnel

## Variables

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `{{CHEMIN_PROJET_GT}}` | Chemin vers le projet modele_fiche_doc_GT | obligatoire |
| `{{CHEMIN_SHOWCASE}}` | Chemin vers les fiches showcase de référence | obligatoire |
| `{{NOM_APP}}` | Nom affiché de l'application | `FTGen` |
| `{{VERSION}}` | Version de l'application | `1.0.0` |
| `{{PALETTE_PRIMAIRE}}` | Couleur primaire de l'interface | `#00203F` (marine) |
| `{{PALETTE_ACCENT}}` | Couleur accent de l'interface | `#B48C3C` (or) |
| `{{DEBOUNCE_MS}}` | Délai avant recompilation auto | `2000` |
| `{{DEFAULT_AI_PROVIDER}}` | Fournisseur IA par défaut | `claude` |
