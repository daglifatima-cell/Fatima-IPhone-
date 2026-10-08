# Aspyre Studio — Espace client

Plateforme où tes clients transmettent toutes les informations nécessaires à la création de leur site internet : un brief guidé en 6 étapes, la rédaction des textes page par page, l'envoi de fichiers (logo, photos, textes) et un tableau de bord pour toi.

## Ce que fait la plateforme

**Pour tes clients**
- Accès **sur invitation uniquement**, par lien magique envoyé par e-mail (aucun mot de passe).
- Questionnaire en 6 étapes : *Votre entreprise · Vos objectifs · Design & style · Structure & contenus · Textes & images · Technique & budget*.
- **Textes & images** : pour chaque page choisie (Accueil, Services, Contact…), le client rédige ses textes section par section et ajoute les images de chaque section. Une structure adaptée à chaque type de page lui est suggérée (modifiable : renommer, réordonner, ajouter ou supprimer des sections, ajouter des pages).
- **Sauvegarde automatique** : le client peut s'arrêter et revenir quand il veut.
- Dépôt de fichiers par glisser-déposer (50 Mo max par fichier), stockés de façon privée.
- Barre de progression, récapitulatif des questions obligatoires manquantes, bouton « Envoyer mon brief ».
- Onglet **Domaine & licences** : vérification de disponibilité du nom de domaine, tutoriels pas à pas pour acheter l'hébergement Ionos et la licence Elementor Pro (avec ton lien affilié), puis formulaire pour te transmettre ses accès, **chiffrés** (AES-256-GCM).
- Onglet **Suivi du projet** : étapes du projet (Brief → Domaine & licences → Installation → Maquette → Corrections → Mise en ligne), validation de la maquette ou demande de modifications, messagerie avec toi.

**Pour toi (admin)**
- Tableau de bord : liste des clients, avancement, statut (Brouillon → Envoyé → Projet en cours → Terminé).
- Formulaire d'invitation d'un nouveau client.
- Fiche détaillée de chaque brief, avec aperçu des images, téléchargement des fichiers et textes classés par page.
- Notes internes, jamais visibles par le client.
- Pilotage du suivi : étape en cours, lien de la maquette, messages au client (prévenu par e-mail).
- Accès transmis par le client : affichés seulement à ta demande, avec bouton copier, et à supprimer après l'installation.
- **Alertes e-mail** quand un client envoie son brief, confirme un achat, transmet ses accès, valide la maquette ou t'écrit.
- **Export Markdown « pour Claude »** : un clic pour télécharger ou copier le brief complet (avec les liens vers les fichiers), à me donner pour générer le site.

Passer un brief en « Projet en cours » le verrouille côté client.

## Technologies

- [Next.js](https://nextjs.org) 16 (App Router) + Tailwind CSS 4, hébergé sur **Vercel**
- [Supabase](https://supabase.com) : comptes, base de données Postgres (sécurisée par RLS) et stockage des fichiers

## Mise en route

Environ 45 minutes, sans aucune ligne de code à écrire.

### 1. Supabase (base de données)
1. Sur [supabase.com](https://supabase.com) : **New project**, région **West EU (Paris)**, offre **Free**.
2. **SQL Editor → New query** : colle tout le fichier [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. Note 3 valeurs (bouton **Connect** en haut, ou **Project Settings → API Keys**) : l'URL du projet, la clé publique (`anon` / *publishable*) et la clé secrète (`service_role` / *secret*).

### 2. Resend (e-mails)
1. Sur [resend.com](https://resend.com) : **Domains → Add Domain** avec ton domaine (ex. `aspyre-studio.fr`), région Europe.
2. Copie les enregistrements DNS affichés dans ton espace Ionos (**Domaines & SSL → ton domaine → DNS → Ajouter un enregistrement**), puis **Verify** dans Resend.
3. **API Keys → Create API Key** et note la clé `re_…`.

### 3. Vercel (mise en ligne)
1. Sur [vercel.com](https://vercel.com) (connexion avec GitHub) : **Add New → Project** → importe ce dépôt.
2. Dans **Environment Variables**, ajoute les 5 réglages :
   | Nom | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publique Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | clé secrète Supabase |
   | `RESEND_API_KEY` | clé `re_…` |
   | `EMAIL_FROM` | `Aspyre Studio <contact@ton-domaine.fr>` |
3. **Deploy**.

### 4. Installation
Ouvre `https://ton-site.vercel.app/installation` : la page vérifie que tout est bien branché, puis crée ton compte administratrice et te connecte directement.

C'est tout : la plateforme envoie elle-même ses e-mails (invitations, connexions, alertes) et détecte toute seule son adresse. Les réglages facultatifs sont listés dans [`.env.example`](.env.example).

> Si un réglage change dans Vercel, pense à **Deployments → ⋯ → Redeploy** pour qu'il soit pris en compte.

### Bon à savoir
- **Supabase gratuit** se met en pause après 7 jours sans activité (réactivation en un clic depuis Supabase).
- **Vercel gratuit (Hobby)** est réservé à un usage non commercial ; pour ton activité, l'offre Pro est prévue par leurs conditions.
- **Clé secrète Supabase** : si tu la régénères un jour, les accès clients déjà reçus deviendront illisibles (ils servent de toute façon seulement le temps de l'installation).

## Personnaliser le questionnaire

Toutes les questions sont dans [`src/lib/brief-schema.ts`](src/lib/brief-schema.ts). Tu peux ajouter, retirer ou reformuler des questions et des choix sans toucher au reste du code. Types de champs disponibles : `text`, `email`, `tel`, `url`, `date`, `textarea`, `select`, `radio`, `checkboxes`, `colors`, `files`.

Les structures suggérées pour chaque page (étape *Textes & images*) sont dans `PAGE_SUGGESTIONS`, dans ce même fichier.

Ne change pas l'`id` d'une question déjà utilisée par des clients, sinon leurs réponses ne s'afficheront plus.

Ton lien affilié Elementor (déjà configuré), les liens Ionos et le texte des tutoriels de l'onglet *Domaine & licences* sont dans [`src/lib/studio-config.ts`](src/lib/studio-config.ts).

Les couleurs et polices de la plateforme sont dans [`src/app/globals.css`](src/app/globals.css) et [`src/app/layout.tsx`](src/app/layout.tsx).

## Du brief au site avec Claude

1. Ouvre le brief du client dans `/admin`, puis clique sur **Télécharger (.md)** ou **Copier pour Claude**.
2. Ouvre une session Claude Code et colle le brief en demandant par exemple :
   *« Voici le brief de mon client. Crée-lui un site vitrine en respectant ses couleurs, son ambiance et les pages demandées. »*
3. Les liens vers les fichiers (logo, photos) restent valables 7 jours après l'export.

## Développement en local

```bash
npm install
cp .env.example .env.local   # puis remplis les valeurs
npm run dev                  # http://localhost:3000
```


## Structure du code

```
src/
  app/
    page.tsx                 Page d'accueil
    connexion/               Connexion par lien magique
    auth/confirm/            Arrivée des liens e-mail (invitation, connexion)
    espace/                  Espace client : le brief
    admin/                   Tableau de bord, invitations
    espace/domaine/          Onglet Domaine & licences (tutoriels, accès chiffrés)
    espace/suivi/            Onglet Suivi du projet (étapes, maquette, messages)
    api/domaine/             Vérification de disponibilité des noms de domaine
    admin/briefs/[id]/       Fiche d'un brief : suivi, accès, messages, notes, export
  components/brief/          Questionnaire (étapes, champs, envoi de fichiers, éditeur de pages)
  lib/brief-schema.ts        Les questions du brief
  lib/brief-format.ts        Mise en forme et export Markdown
  lib/studio-config.ts       Ton lien affilié, liens Ionos, textes des tutoriels
  lib/crypto.ts              Chiffrement des accès
  lib/notify.ts              E-mails : invitations, connexions, alertes (Resend)
  lib/supabase/              Connexions à Supabase
  app/installation/          Vérification de la config et création du compte admin
  proxy.ts                   Protection des pages privées
supabase/
  schema.sql                 Toute la base : tables, sécurité, stockage
```
