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

## Mise en route (environ 20 minutes)

### 1. Créer le projet Supabase
1. Crée un compte sur [supabase.com](https://supabase.com) puis **New project** (région conseillée : *West EU (Paris)* ou *Central EU (Frankfurt)*).
2. Dans **SQL Editor → New query**, colle tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) et clique sur **Run**. Recommence ensuite avec [`supabase/schema-2-domaine-suivi.sql`](supabase/schema-2-domaine-suivi.sql).
3. Dans **Authentication → Sign In / Providers**, désactive **Allow new users to sign up** (seules tes invitations créent des comptes).

### 2. Créer ton compte administratrice
1. **Authentication → Users → Add user → Create new user** : ton e-mail, coche *Auto Confirm User*.
2. Dans **SQL Editor**, exécute (avec ton e-mail) :
   ```sql
   update public.profiles set role = 'admin' where email = 'ton-email@exemple.com';
   ```

### 3. Déployer sur Vercel
1. Sur [vercel.com](https://vercel.com), **Add New → Project** et importe ce dépôt GitHub.
2. Dans **Environment Variables**, ajoute les variables de [`.env.example`](.env.example). Les valeurs se trouvent dans Supabase → **Project Settings → API** :
   | Variable | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` / *publishable* |
   | `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` / *secret* (à garder secrète) |
   | `NEXT_PUBLIC_SITE_URL` | l'adresse du site Vercel, ex. `https://aspyre-espace.vercel.app` |
   | `CREDENTIALS_ENCRYPTION_KEY` | une clé générée avec `openssl rand -base64 32` (ou sur [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)). **Garde-la précieusement et ne la change plus.** |
   | `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` | pour les alertes e-mail (voir ci-dessous) |
3. Clique sur **Deploy**.

### 4. Relier Supabase à ton site
1. Supabase → **Authentication → URL Configuration** :
   - **Site URL** : l'adresse Vercel (la même que `NEXT_PUBLIC_SITE_URL`)
   - **Redirect URLs** : ajoute `https://ton-adresse.vercel.app/**`
2. Supabase → **Authentication → Emails** : remplace les modèles par ceux du dossier [`supabase/email-templates`](supabase/email-templates) :
   - **Invite user** → `invitation.html`
   - **Magic link** → `connexion.html`

   Les liens de ces modèles pointent vers `/auth/confirm` : c'est indispensable pour que la connexion fonctionne.

> **E-mails en production** : le service d'e-mail intégré à Supabase est limité à quelques envois par heure. Avant d'inviter de vrais clients, configure un SMTP (Brevo, Resend, Postmark…) dans **Authentication → Emails → SMTP Settings**. Tu peux aussi y mettre une adresse d'envoi à ton nom.

### 5. Alertes e-mail (recommandé)
1. Crée un compte gratuit sur [resend.com](https://resend.com) et vérifie ton nom de domaine d'envoi (**Domains → Add domain**, puis ajoute les enregistrements DNS indiqués chez Ionos).
2. Crée une clé API (**API Keys**) et renseigne `RESEND_API_KEY`, `EMAIL_FROM` (ex. `Aspyre Studio <contact@ton-domaine.fr>`) et `ADMIN_NOTIFICATION_EMAIL` dans Vercel.

Tant que ces variables sont vides, la plateforme fonctionne normalement, simplement sans e-mails d'alerte.

Astuce : Resend fournit aussi un serveur SMTP, que tu peux utiliser pour les e-mails d'invitation et de connexion de Supabase (étape 4).

### 6. Ton lien affilié Elementor et tes tutoriels
Dans [`src/lib/studio-config.ts`](src/lib/studio-config.ts), remplace `elementorAffiliateUrl` par ton lien affilié. Tu peux y modifier les offres conseillées, les liens Ionos et le texte des tutoriels.

### 7. C'est prêt !
Connecte-toi sur `/connexion` avec ton e-mail : tu arrives sur le tableau de bord `/admin`. Invite un client (essaie d'abord avec une autre de tes adresses pour voir le parcours client).

## Personnaliser le questionnaire

Toutes les questions sont dans [`src/lib/brief-schema.ts`](src/lib/brief-schema.ts). Tu peux ajouter, retirer ou reformuler des questions et des choix sans toucher au reste du code. Types de champs disponibles : `text`, `email`, `tel`, `url`, `date`, `textarea`, `select`, `radio`, `checkboxes`, `colors`, `files`.

Les structures suggérées pour chaque page (étape *Textes & images*) sont dans `PAGE_SUGGESTIONS`, dans ce même fichier.

Ne change pas l'`id` d'une question déjà utilisée par des clients, sinon leurs réponses ne s'afficheront plus.

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

Pour tester en local, ajoute aussi `http://localhost:3000/**` dans les *Redirect URLs* de Supabase.

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
  lib/notify.ts              Alertes e-mail (Resend)
  lib/supabase/              Connexions à Supabase
  proxy.ts                   Protection des pages privées
supabase/
  schema.sql                 Tables, sécurité, stockage
  schema-2-domaine-suivi.sql Domaine & licences, accès chiffrés, suivi projet
  email-templates/           E-mails d'invitation et de connexion
```
