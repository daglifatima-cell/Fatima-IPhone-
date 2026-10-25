# Agents SEO d'aspyre.fr

Quatre agents Claude travaillent chaque matin sur le référencement d'aspyre.fr, sans intervention :

| Agent | Rôle | Fichier |
|---|---|---|
| **Mots-clés** | Lit Google Search Console et choisit la recherche à cibler | [`.claude/agents/seo-mots-cles.md`](../.claude/agents/seo-mots-cles.md) |
| **Rédaction** | Écrit et publie un article sur WordPress (1 par jour maximum) | [`.claude/agents/seo-redaction.md`](../.claude/agents/seo-redaction.md) |
| **Technique** | Vérifie l'indexation, le sitemap, les balises et la vitesse | [`.claude/agents/seo-technique.md`](../.claude/agents/seo-technique.md) |
| **Refresh** | Retravaille un article qui perd des clics ou stagne (1 par jour maximum) | [`.claude/agents/seo-refresh.md`](../.claude/agents/seo-refresh.md) |

La routine complète est décrite dans [`RUN.md`](RUN.md). Le positionnement, le ton et les règles que les agents doivent respecter sont dans [`brand.md`](brand.md) : c'est le fichier à modifier pour les orienter.

Chaque routine laisse un compte rendu dans [`journal/`](journal/), avec une rubrique **Actions pour Fatima** (ce que les agents ne peuvent pas faire eux-mêmes, comme modifier une page Elementor). Les chiffres s'affichent dans l'espace admin, onglet **Référencement** (`/admin/seo`).

## Installation (environ 30 minutes, une seule fois)

### 1. Google : donner accès à Search Console

1. Va sur [console.cloud.google.com](https://console.cloud.google.com) → **Sélectionner un projet → Nouveau projet** → nom « Aspyre SEO » → **Créer**.
2. Menu **API et services → Bibliothèque** : cherche et **active** « Google Search Console API », puis « PageSpeed Insights API ».
3. **API et services → Identifiants → Créer des identifiants → Compte de service** → nom « agents-seo » → **OK** (pas besoin de rôle).
4. Clique sur le compte de service créé → onglet **Clés → Ajouter une clé → Créer une clé → JSON**. Un fichier `.json` se télécharge : c'est la clé, garde-la privée.
5. Copie l'adresse e-mail du compte de service (`agents-seo@….iam.gserviceaccount.com`).
6. Dans [Search Console](https://search.google.com/search-console) → ta propriété aspyre.fr → **Paramètres → Utilisateurs et autorisations → Ajouter un utilisateur** → colle l'adresse → autorisation **Complète**.
7. Retour dans Google Cloud : **Identifiants → Créer des identifiants → Clé API**. Copie la clé (pour PageSpeed).

### 2. WordPress : autoriser la publication

1. Vérifie que **Yoast SEO** ou **Rank Math** est installé (pour le titre et la méta-description des articles).
2. **Extensions → Ajouter → Téléverser une extension** → choisis [`wordpress/aspyre-seo-agents.zip`](wordpress/aspyre-seo-agents.zip) → **Installer**, puis **Activer**.
3. **Comptes → Profil** → tout en bas, **Mots de passe d'application** → nom « Agents SEO » → **Ajouter**. Copie le mot de passe affiché (il ne sera plus montré).

> Si la section « Mots de passe d'application » n'apparaît pas, une extension de sécurité la désactive (Wordfence, iThemes…) : réactive-la dans ses réglages.

### 3. Claude Code : brancher les accès

Dans Claude Code, menu de l'environnement cloud (en haut de la session) → **Edit** :

**Variables d'environnement** :

| Nom | Valeur |
|---|---|
| `GSC_SERVICE_ACCOUNT_JSON` | tout le contenu du fichier `.json` de l'étape 1.4, entre apostrophes : `'{ … }'` |
| `GSC_SITE_URL` | `sc-domain:aspyre.fr` (propriété de domaine) ou `https://aspyre.fr/` (propriété avec préfixe d'URL) |
| `WP_URL` | `https://aspyre.fr` |
| `WP_USER` | ton identifiant WordPress |
| `WP_APP_PASSWORD` | le mot de passe d'application de l'étape 2.3 |
| `PAGESPEED_API_KEY` | la clé API de l'étape 1.7 |

**Accès réseau** : ajoute `aspyre.fr` (et `www.aspyre.fr`) dans **Allowed domains**, en laissant cochée la case des gestionnaires de paquets.

Les nouvelles sessions prennent en compte ces réglages automatiquement.

### 4. Vérifier

Dans une nouvelle session Claude Code sur ce dépôt, demande : *« Lance les vérifications de seo/RUN.md, étape 0 »*. Tu dois voir ton nom WordPress, l'extension SEO détectée et ta propriété Search Console.

## Lancer la routine à la main

Dans une session Claude Code : *« Suis seo/RUN.md »*.

## Tester un script

```bash
node seo/scripts/gsc.mjs opportunities     # recherches à fort potentiel
node seo/scripts/wp.mjs posts              # articles publiés
node seo/scripts/pagespeed.mjs https://aspyre.fr/
```
