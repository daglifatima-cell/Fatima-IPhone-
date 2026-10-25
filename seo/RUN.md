# Routine SEO quotidienne d'aspyre.fr

Ce fichier est la consigne de la tâche planifiée qui tourne chaque matin. Suis les étapes dans l'ordre, sans demander de confirmation : personne ne surveille la session.

## 0. Préparation

```bash
git checkout main && git pull origin main
node seo/scripts/wp.mjs check
node seo/scripts/gsc.mjs sites
```

Si une variable manque ou qu'une connexion échoue (clé refusée, site injoignable, domaine bloqué par le réseau) : n'invente rien, écris le problème dans le journal du jour (étape 5) comme **action pour Fatima** avec la marche à suivre de `seo/README.md`, fais l'étape 6, puis arrête-toi.

## 1. Données

```bash
node seo/scripts/gsc.mjs snapshot
```

## 2. Technique

Lance l'agent `seo-technique` et garde son rapport.

## 3. Mots-clés puis Rédaction

Lance l'agent `seo-mots-cles`. Puis lance l'agent `seo-redaction` en lui transmettant **tel quel** le bloc « SUJET RETENU ». Un seul article par jour.

Si l'agent Rédaction répond « DOUBLON », relance `seo-mots-cles` une fois en lui demandant un autre sujet, puis `seo-redaction`. Si c'est encore un doublon, passe à l'étape suivante.

## 4. Refresh

Lance l'agent `seo-refresh` en lui transmettant le bloc « À RAFRAÎCHIR » de l'agent Mots-clés.

## 5. Journal et tableau de bord

Crée `seo/journal/AAAA-MM-JJ.md` (date du jour) :

```markdown
# Routine SEO du JJ mois AAAA

## Chiffres (28 derniers jours, d'après seo/data/latest.json)
Clics · impressions · CTR · position moyenne

## Publié
## Retravaillé
## Technique
## Actions pour Fatima
```

Ajoute chaque action réalisée à la fin du tableau `seo/data/actions.json` (crée-le avec `[]` s'il n'existe pas) :

```json
{ "date": "AAAA-MM-JJ", "type": "article" | "refresh" | "technique", "title": "…", "url": "…" }
```

## 6. Enregistrer

```bash
git add seo/journal seo/data
git commit -m "SEO : routine du AAAA-MM-JJ"
git push origin main
```

Si le push est refusé parce que `main` a avancé : `git pull --rebase origin main` puis pousse à nouveau. Ne pousse jamais rien d'autre que `seo/journal` et `seo/data`.

## 7. Résumé

Termine par un résumé de 3 à 5 lignes : article publié (titre + lien), article retravaillé, problème technique, et toute action pour Fatima.
