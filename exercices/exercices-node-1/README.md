# Exercices 1 : fondamentaux de Node.js

Boucle d'événements, modules natifs (`fs`, `http`, `events`) et programmation asynchrone.

## Prérequis

- Node.js 24 ou plus récent.
- Aucune dépendance externe.

## Structure

```
src/
  lib/                        logique réutilisable, sans effet de bord
    request-counter.js        gestionnaire HTTP du compteur
    word-count.js             comptage de mots, lecture parallèle ou séquentielle
    timers.js                 attendre(ms) et avecDelai(promesse, ms)
    telechargeur.js           classe Telechargeur (EventEmitter)
  event-loop-order.js         exercice 1
  request-counter-server.js   exercice 2
  compter.js                  exercice 3 (mission vérifiée)
  timers-demo.js              exercice 4
  download-demo.js            exercice 5
  benchmark.js                pour aller plus loin
```

Les points d'entrée ne font que brancher la logique de `src/lib/` sur la console ou le réseau.

## Exercices

| # | Sujet | Commande |
| - | ----- | -------- |
| 1 | Ordre d'exécution de la boucle d'événements | `npm run order` |
| 2 | Serveur `node:http` qui compte les requêtes, `/reset` répond 204 | `npm run server` |
| 3 | Comptage des mots des fichiers `notes/*.md` en parallèle | `npm run count` |
| 4 | `attendre(ms)` et `avecDelai(promesse, ms)` | `npm run timers` |
| 5 | Émetteur `Telechargeur` : `debut`, `fin`, `error`, `termine` | `npm run download` |
| + | `Promise.all` contre boucle séquentielle sur 100 fichiers | `npm run benchmark` |

### Exercice 1 : ordre d'exécution

En module ES, la sortie est `A F H C G D B E`. Le détail est commenté dans `src/event-loop-order.js` :
l'évaluation d'un module ES se fait déjà dans une microtâche, donc les Promises passent avant `process.nextTick`.
L'ordre entre `B` (setTimeout 0) et `E` (setImmediate) varie d'une exécution à l'autre depuis le module principal.

### Exercice 3 : mission vérifiée

```bash
mkdir -p notes && echo "un deux trois" > notes/test.md
node src/compter.js
# test.md : 3 mots
```

Le script termine avec le code 1 et un message lisible si `notes/` n'existe pas.
Un dossier différent peut être passé en argument : `node src/compter.js chemin/vers/notes`.

### Pour aller plus loin

`Promise.all` lance toutes les lectures en même temps, la boucle les enchaîne : sur 100 fichiers,
la version parallèle est environ 1,5 fois plus rapide sur un disque local. L'écart grandit avec la latence (disque réseau).
