# Compiler FTGen pour macOS (via GitHub Actions)

On ne peut pas compiler du macOS depuis Windows. Ce dépôt utilise un **vrai runner macOS gratuit** de GitHub Actions pour produire un `.dmg` (Intel + Apple Silicon, binaire universel).

## 1. Créer le dépôt GitHub et pousser le projet

Dans le dossier `FTGen/` (PowerShell ou Git Bash) :

```bash
git init
git add .
git commit -m "FTGen : projet + workflow build macOS"
```

Puis créer un dépôt **privé** et pousser. Au choix :

**Avec le CLI gh** (si installé ; tape `! gh auth login` dans la session pour t'authentifier) :
```bash
gh repo create FTGen --private --source=. --remote=origin --push
```

**Ou via le site** : créer un dépôt vide sur github.com, puis :
```bash
git branch -M main
git remote add origin https://github.com/<ton-compte>/FTGen.git
git push -u origin main
```

## 2. Lancer le build

Le push sur `main` déclenche automatiquement le workflow. Sinon : onglet **Actions** → *Build macOS* → **Run workflow**.

Le job (~10-15 min) : installe les dépendances, télécharge les sidecars **tectonic** macOS (Intel + ARM), build le binaire **universel**.

## 3. Récupérer l'application

À la fin du job : section **Artifacts** → télécharger **FTGen-macOS** (contient le `.dmg` et le `.app`).

## 4. Distribution aux collègues Mac (build NON signé)

L'app n'est pas signée (pas de compte Apple Developer). Au 1er lancement, macOS affiche un avertissement. Le collègue doit :

- **Clic droit** sur FTGen.app → **Ouvrir** → confirmer (à faire une seule fois),
- ou en Terminal : `xattr -cr /chemin/vers/FTGen.app`

## Dossier `.ftgen` à fournir à côté de l'app (RÉGLÉ)

L'app a besoin de son dossier `.ftgen` (templates, snippets, logos…). Il n'est **pas** dans le dépôt et **pas** dans l'app : il faut le **fournir à côté du `.app`**.

Le code résout désormais `.ftgen` **à partir de l'emplacement de l'exécutable** (correctif `get_ftgen_dir`), donc il suffit que le collègue garde cette disposition :

```
FTGen/                  ← un dossier au choix
├── FTGen.app           ← l'application (depuis le .dmg)
└── .ftgen/             ← fourni séparément (caché dans le Finder car nom en point)
    ├── templates/
    ├── snippets/
    └── …
```

Double-clic sur `FTGen.app` → l'app trouve `.ftgen` toute seule. **Important** : garder `FTGen.app` et `.ftgen` dans le **même dossier** (comme la version portable Windows). Si on déplace seulement l'app, elle ne trouvera plus `.ftgen`.

Astuce Finder : le dossier `.ftgen` est masqué (nom commençant par un point). Pour le voir : `Cmd+Maj+.` dans le Finder.

## Notes techniques

- Workflow : `.github/workflows/build-mac.yml`. Version tectonic figée par `TECTONIC_VERSION` (0.16.9), ajustable.
- Le binaire Windows reste en local (`src-tauri/binaries/`, gitignoré) ; le CI macOS télécharge ses propres sidecars.
- Pour une app **signée + notarisée** (zéro avertissement) : compte Apple Developer (99 $/an) + secrets de signature dans le workflow. À ajouter plus tard si besoin.
