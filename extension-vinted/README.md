# Chineur Vinted — extension Chrome

Surveille Vinted pour toi et t'envoie sur **Telegram** chaque nouvelle annonce qui correspond à tes critères.

- **Recherches** : mot-clé et/ou marque, prix min / max, état (neuf, très bon état…).
- **Bonnes affaires** 🔥 : chaque annonce est comparée au prix médian du marché (annonces similaires sans limite de prix, recalculé toutes les 6 h). Tu peux n'être alerté·e que quand le prix est au moins X % sous ce prix médian.
- **Alertes Telegram** avec photo, prix, réduction, taille, état et un bouton « Voir l'annonce ». Notifications sur l'ordinateur en option.
- Seules les **nouvelles** annonces déclenchent une alerte : au premier passage, l'extension mémorise ce qui est déjà en ligne (les meilleures affaires du moment s'affichent quand même dans « Dernières trouvailles »).
- Vérification toutes les 2 à 30 minutes, 10 alertes max par recherche et par passage.

## Installation (5 minutes)

1. Télécharge ce dépôt (bouton **Code → Download ZIP** sur GitHub) et décompresse-le.
2. Dans Chrome (ou Edge, Brave), ouvre `chrome://extensions`.
3. Active le **Mode développeur** (en haut à droite).
4. Clique sur **Charger l'extension non empaquetée** et choisis le dossier `extension-vinted`.
5. La page de réglages s'ouvre : suis les 4 étapes Telegram (créer un bot avec @BotFather, coller le jeton, envoyer `/start` au bot, « Détecter mon chat », « Envoyer un test »).
6. Épingle l'extension (icône puzzle 🧩) puis ajoute tes recherches depuis le popup.

## Bon à savoir

- La surveillance tourne **tant que Chrome est ouvert** (inutile de garder un onglet Vinted). Ordinateur éteint = pas d'alerte.
- Si une recherche affiche une erreur 401/403, ouvre vinted.fr dans un onglet une fois, puis clique sur **↻ Vérifier**.
- Le jeton Telegram reste stocké uniquement dans ton navigateur.
- Usage personnel : l'extension fait les mêmes requêtes que le site quand tu cherches toi-même, à un rythme raisonnable. Les conditions de Vinted interdisent la collecte automatisée massive : garde un intervalle de 3 minutes ou plus et un nombre de recherches raisonnable.

## Fichiers

| Fichier | Rôle |
|---|---|
| `manifest.json` | Déclaration de l'extension (Manifest V3) |
| `background.js` | Vérification périodique, alertes Telegram et notifications |
| `lib.js` | Appel Vinted, filtres, score « bonne affaire », Telegram |
| `popup.html/js` | Ajout et gestion des recherches, dernières trouvailles |
| `options.html/js` | Réglages Telegram, site Vinted, fréquence |
