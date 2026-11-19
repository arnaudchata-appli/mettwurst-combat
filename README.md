# 🔥 Mettwurst Combat

Jeu de combat en 2D sur le thème du barbecue. Six grilladins et un boss secret s'affrontent sur la grille, au-dessus des braises.

**Jouer en ligne :** https://arnaudchata-appli.github.io/mettwurst-combat/

Le jeu tourne dans n'importe quel navigateur, sur ordinateur comme sur mobile. Sur Android, on peut l'installer comme une vraie application qui marche **hors ligne**.

## Les combattants

| Combattant | Style | Coup spécial |
|---|---|---|
| **Mettwurst**, le Hachoir de Hambourg | Équilibré | Zwiebel-Wurf : lancer de rondelle d'oignon |
| **Côte de Bœuf**, le Colosse Persillé | Lent et puissant | Charge à l'Os : charge qui encaisse les coups |
| **Chipolata**, la Furie Fine | Rapide et fragile | Tornade Chipo : toupie qui frappe plusieurs fois |
| **Brochette**, le Pique-Assiette | Longue portée | Poivron Volant : projectile |
| **Merguez**, la Flamme du Désert | Pimentée | Souffle Harissa : jet de flammes |
| **Pilon**, le Poulet Volant | Explosif | Uppercut Plumé : uppercut anti-aérien |
| **Maître Charbon** *(secret)* | Boss | Boule de Braise |

Pour débloquer Maître Charbon, il faut finir le mode Arcade.

## Modes de jeu

- **Arcade** : affronte tous les grilladins à la suite, puis le boss dans *La Fournaise*.
- **Versus ordi** : un combat libre contre l'ordinateur, avec 4 niveaux de difficulté.
- **2 joueurs** : sur le même clavier, ou avec deux manettes.

## Commandes

| Action | Tactile | Clavier | Manette |
|---|---|---|---|
| Se déplacer / sauter / s'accroupir | Croix directionnelle | Flèches ou ZQSD | Croix / stick |
| Poing | POING | J | X / □ |
| Pied | PIED | K | A / ✕ |
| Garde | GARDE | L | Gâchettes |
| Spécial | SPÉCIAL | I | B / ○ |
| Pot de yaourt | YAOURT | O | Y / △ |
| Pause | ⏸ | Échap / P | Start |

En 2 joueurs au clavier, J1 joue avec ZQSD + F G H T Y et J2 avec les flèches + B N M , . (ou le pavé numérique 1 2 3 0 4).

**Coups :**
- ↓ + Poing : uppercut, qui fait décoller l'adversaire.
- ↓ + Pied : balayette. C'est une attaque basse : il faut se garder accroupi pour la bloquer.
- Pied en l'air : coup de pied sauté.
- Enchaînements : Poing → Poing → Pied → Spécial.
- **Pot de yaourt** : ton grilladin écrase un pot et projette du yaourt. Si l'adversaire est touché, il devient collant et ralentit pendant 5 secondes. Tu as 3 pots par round.
- **Jauge de Braise** : elle se remplit en frappant et en encaissant. Une fois pleine, la touche Spécial lance le **SUPER**.
- **Grillade finale** : quand l'annonceur crie « GRILLE-LE ! » à la fin du match, fais ↓ + Spécial.

## Installer sur Android (hors ligne)

1. Ouvre le lien du jeu dans **Chrome**.
2. Ouvre le menu ⋮ et choisis **« Ajouter à l'écran d'accueil »** (ou **« Installer l'application »**).
3. Lance le jeu une première fois avec internet pour qu'il soit mis en cache. Ensuite, il marche en mode avion.

Pour obtenir un vrai fichier **APK** ou publier sur le Play Store, donne l'URL du jeu à [PWABuilder](https://www.pwabuilder.com/). Il génère un paquet Android (TWA) à partir de la PWA.

## Technique

- HTML5 Canvas et JavaScript, sans dépendances ni étape de compilation.
- Tous les graphismes sont dessinés par le code (aucune image, sauf l'icône) et les sons sont synthétisés avec WebAudio.
- Une PWA : un `manifest.webmanifest` et un service worker (`sw.js`) pour jouer hors ligne.
- Le jeu marche aussi en double-cliquant simplement sur `index.html`.

```
index.html, style.css, manifest.webmanifest, sw.js
js/util.js      constantes, réglages sauvegardés
js/audio.js     bruitages, musique et voix de l'annonceur
js/input.js     clavier, tactile, manettes
js/roster.js    les combattants et leurs coups
js/draw.js      dessin des personnages
js/stage.js     les arènes
js/fighter.js   physique et états d'un combattant
js/ai.js        intelligence artificielle
js/fight.js     déroulement d'un match
js/ui.js        menus et manette tactile
js/main.js      écrans et boucle principale
```

Mode démo, ordi contre ordi : `index.html#demo=mett,boeuf,0`.

### Publier une mise à jour

Pour que les joueurs reçoivent une nouvelle version, il faut changer `CACHE` dans `sw.js`, puis pousser sur `main`.
