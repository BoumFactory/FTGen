# Ajout de champs « maîtrise IA » + « compte » et typographie des niveaux scolaires dans FTGen

## Rôle

Tu es développeur de l'application **FTGen** (Tauri 2 + React/TypeScript, backend Rust, compilation LaTeX via le sidecar **tectonic**). Tu maîtrises son modèle de données : des templates `*.meta.json` décrivant des `variables` (champ `name`, `type`, `label`, `group`, `default_value`), rendus dans un `*.tex` par substitution `{{VAR}}` et blocs `%%IF%%`, avec des groupes de cases à cocher (mécanique `CBITEMS_<group>`) et des surcharges dans `.ftgen/section_overrides.json`.

## Contexte

Les fiches techniques FTGen décrivent des ressources pédagogiques, souvent à base d'IA. Trois besoins :
1. **Maîtrise IA requise pour réutiliser** la ressource (prérequis pour le collègue) — modélisée par **deux échelles** indépendantes.
2. **Besoin d'un compte** pour l'outil/la ressource — modélisé par le **coût**.
3. **Typographie correcte des niveaux scolaires** (exposants), à l'écran ET dans le PDF.

Décisions validées (ne pas re-discuter, implémenter) :
- Maîtrise IA = 2 échelles, en **cases à cocher** (même mécanique que les groupes `niveau` / `outils_ia` existants) :
  - **Aisance** : Novice · Initié · Confirmé · Expert
  - **Sophistication** : Chatbot simple · Prompts avancés · Agents · Skills
  - L'axe « abonnement/€ » est **volontairement écarté** (outils en démocratisation) : ne PAS l'ajouter.
- **Compte** = un champ **Coût** en cases à cocher : Aucun · Gratuit · Payant.
- **Niveaux scolaires** = forme abrégée à exposants : **6ᵉ 5ᵉ 4ᵉ 3ᵉ / 2ᵈᵉ 1ʳᵉ Tˡᵉ** (collège + lycée), à l'écran ET dans le PDF.
- **Portée** = nouveaux groupes dédiés, propagés aux **8 templates** de `.ftgen/templates/`.

## Instructions

### Étape 1 — Inventaire
Lister les 8 `*.meta.json` de `.ftgen/templates/` et leurs `*.tex` associés. Repérer dans chaque meta le groupe `niveau` (variables `NIV_6E`…`NIV_TLE`) et la façon dont les cases à cocher d'un groupe sont rendues dans le `.tex` (mécanique `CBITEMS_<group>` ou équivalent). Identifier le moteur de rendu des labels de cases (pour savoir où la typographie est produite).

### Étape 2 — Corriger la typographie des niveaux scolaires (UI + PDF)
Dans **chaque** `*.meta.json`, remplacer les `label` du groupe `niveau` par la forme abrégée :

| Variable | Ancien label | Nouveau label (UI) |
|----------|--------------|--------------------|
| `NIV_6E`   | 6ème     | 6ᵉ  |
| `NIV_5E`   | 5ème     | 5ᵉ  |
| `NIV_4E`   | 4ème     | 4ᵉ  |
| `NIV_3E`   | 3ème     | 3ᵉ  |
| `NIV_2NDE` | Seconde  | 2ᵈᵉ |
| `NIV_1ERE` | Première | 1ʳᵉ |
| `NIV_TLE`  | Terminale| Tˡᵉ |

- **UI** : utiliser les exposants Unicode ci-dessus (`ᵉ` U+1D49, `ᵈ` U+1D48, `ʳ` U+02B3) pour un affichage correct dans React sans balisage.
- **PDF** : NE PAS injecter ces glyphes Unicode tels quels dans le `.tex` (couverture de police incertaine sous tectonic). Le rendu PDF doit produire un **vrai exposant LaTeX** via `\textsuperscript{…}` : `6\textsuperscript{e}`, `2\textsuperscript{de}`, `1\textsuperscript{re}`, `T\textsuperscript{le}`. Adapter le pipeline de rendu des labels de niveau (mapping Unicode→LaTeX au moment de la génération du `.tex`, OU labels LaTeX dédiés) de sorte que ce qui s'affiche « 6ᵉ » dans l'UI sorte « 6ᵉ » (exposant) dans le PDF.

### Étape 3 — Ajouter le groupe « Aisance IA »
Dans chaque `*.meta.json`, ajouter 4 variables `type: "checkbox"`, `group: "ia_aisance"`, `default_value: "0"` :

| name | label |
|------|-------|
| `IA_AISANCE_NOVICE`   | Novice |
| `IA_AISANCE_INITIE`   | Initié |
| `IA_AISANCE_CONFIRME` | Confirmé |
| `IA_AISANCE_EXPERT`   | Expert |

### Étape 4 — Ajouter le groupe « Sophistication IA »
4 variables `type: "checkbox"`, `group: "ia_sophistication"`, `default_value: "0"` :

| name | label |
|------|-------|
| `IA_SOPH_CHATBOT`  | Chatbot simple |
| `IA_SOPH_PROMPTS`  | Prompts avancés |
| `IA_SOPH_AGENTS`   | Agents |
| `IA_SOPH_SKILLS`   | Skills |

### Étape 5 — Ajouter le groupe « Compte »
3 variables `type: "checkbox"`, `group: "compte"`, `default_value: "0"` :

| name | label |
|------|-------|
| `COMPTE_AUCUN`   | Aucun compte |
| `COMPTE_GRATUIT` | Compte gratuit |
| `COMPTE_PAYANT`  | Compte payant |

### Étape 6 — Rendu dans les `.tex`
Pour chaque template, ajouter le rendu PDF des trois nouveaux groupes (réutiliser la mécanique `CBITEMS_<group>` existante : `CBITEMS_ia_aisance`, `CBITEMS_ia_sophistication`, `CBITEMS_compte`), avec un libellé de section lisible (ex. « Maîtrise IA requise », « Sophistication », « Compte »). Respecter le design system du template (marine/or/crème pour l'académique, etc.). Conditionner l'affichage (`%%IF%%`) pour ne rien afficher si aucune case n'est cochée.

### Étape 7 — Cohérence UI / profils
Vérifier que les nouveaux groupes apparaissent dans l'éditeur (HomePage/EditorPage), et qu'ils sont compatibles avec `section_overrides.json` (ordre/colonnes/masquage) et les profils personnalisés. Ne pas casser le profil « Applications » existant.

### Étape 8 — Vérification
Compiler **au moins un** template avec des cases cochées sur les 4 groupes (niveaux + aisance + sophistication + compte) et vérifier dans le PDF : exposants corrects (6ᵉ, 2ᵈᵉ, 1ʳᵉ, Tˡᵉ), et affichage propre des trois nouveaux blocs. Lancer aussi `npx tsc --noEmit` et `cargo check` (depuis `src-tauri/`) si du code TS/Rust a été touché.

## Contraintes

- Ne PAS ajouter d'axe « abonnement / prix de l'abonnement IA » dans la maîtrise (décision explicite).
- Ne PAS injecter de glyphes Unicode exposants dans le LaTeX : exposants via `\textsuperscript{}` uniquement.
- Conserver la rétro-compatibilité : les projets existants (`.ftgen/projects/*`) ne doivent pas casser (les nouvelles cases absentes = décochées par défaut).
- Appliquer les changements aux **8** templates, de façon homogène.
- Français parfait dans tous les labels et libellés affichés (accents corrects).
- Tester la compilation via **tectonic** (sidecar), pas un LaTeX système.

## Format de sortie

Modifications de fichiers (`.meta.json` + `.tex` des 8 templates, et code UI si nécessaire), suivies d'un **rapport** : liste des fichiers modifiés, capture/extrait du PDF de test montrant les exposants et les nouveaux blocs, résultat de `tsc`/`cargo check`.

## Variables

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `{{TEMPLATES_DIR}}` | Dossier des templates FTGen | `.ftgen/templates` |
| `{{TEMPLATE_TEST}}` | Template servant au test de compilation | `template_academique` |
| `{{NIVEAUX_MAP}}` | Mapping niveau→exposant (cf. Étape 2) | obligatoire |
