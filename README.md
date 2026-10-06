# Aspyre Studio — Espace client

Plateforme où tes clients transmettent toutes les informations nécessaires à la création de leur site internet : un brief guidé en 5 étapes, l'envoi de fichiers (logo, photos, textes) et un tableau de bord pour toi.

## Ce que fait la plateforme

**Pour tes clients**
- Accès **sur invitation uniquement**, par lien magique envoyé par e-mail (aucun mot de passe).
- Questionnaire en 5 étapes : *Votre entreprise · Vos objectifs · Design & style · Structure & contenus · Technique & budget*.
- **Sauvegarde automatique** : le client peut s'arrêter et revenir quand il veut.
- Dépôt de fichiers par glisser-déposer (50 Mo max par fichier), stockés de façon privée.
- Barre de progression, récapitulatif des questions obligatoires manquantes, bouton « Envoyer mon brief ».

**Pour toi (admin)**
- Tableau de bord : liste des clients, avancement, statut (Brouillon → Envoyé → Projet en cours → Terminé).
- Formulaire d'invitation d'un nouveau client.
- Fiche détaillée de chaque brief, avec aperçu des images et téléchargement des fichiers.
- Notes internes, jamais visibles par le client.
- **Export Markdown « pour Claude »** : un clic pour télécharger ou copier le brief complet (avec les liens vers les fichiers), à me donner pour générer le site.

Passer un brief en « Projet en cours » le verrouille côté client.

## Technologies

- [Next.js](https://nextjs.org) 16 (App Router) + Tailwind CSS 4, hébergé sur **Vercel**
- [Supabase](https://supabase.com) : comptes, base de données Postgres (sécurisée par RLS) et stockage des fichiers

## Mise en route (environ 20 minutes)

### 1. Créer le projet Supabase
1. Crée un compte sur [supabase.com](https://supabase.com) puis **New project** (région conseillée : *West EU (Paris)* ou *Central EU (Frankfurt)*).
2. Dans **SQL Editor → New query**, colle tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) et clique sur **Run**.
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

### 5. C'est prêt !
Connecte-toi sur `/connexion` avec ton e-mail : tu arrives sur le tableau de bord `/admin`. Invite un client (essaie d'abord avec une autre de tes adresses pour voir le parcours client).

## Personnaliser le questionnaire

Toutes les questions sont dans [`src/lib/brief-schema.ts`](src/lib/brief-schema.ts). Tu peux ajouter, retirer ou reformuler des questions et des choix sans toucher au reste du code. Types de champs disponibles : `text`, `email`, `tel`, `url`, `date`, `textarea`, `select`, `radio`, `checkboxes`, `colors`, `files`.

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
    admin/briefs/[id]/       Fiche d'un brief, notes, export Markdown
  components/brief/          Questionnaire (étapes, champs, envoi de fichiers)
  lib/brief-schema.ts        Les questions du brief
  lib/brief-format.ts        Mise en forme et export Markdown
  lib/supabase/              Connexions à Supabase
  proxy.ts                   Protection des pages privées
supabase/
  schema.sql                 Tables, sécurité, stockage
  email-templates/           E-mails d'invitation et de connexion
```
