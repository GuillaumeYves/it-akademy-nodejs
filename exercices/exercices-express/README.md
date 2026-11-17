# Exercices 2 : Express et API REST

API REST de catalogue en mémoire avec Express 5 et Zod : CRUD, pagination, validation,
sous-ressource, clé d'API sur les écritures et téléversement d'images.

## Lancement

```bash
npm install
npm run dev        # rechargement automatique
PORT=3999 npm start
npm test           # tests node:test sur un port éphémère
```

| Variable | Rôle | Défaut |
| -------- | ---- | ------ |
| `PORT` | port d'écoute | `3000` |
| `API_KEY` | clé exigée dans `X-Api-Key` sur POST, PATCH et DELETE ; protection désactivée si absente | aucune |
| `UPLOAD_DIR` | dossier des images téléversées | `uploads` |

## Architecture

```
src/
  index.js                    démarrage du serveur
  app.js                      assemblage : middlewares, routeurs, 404, erreurs
  config.js                   lecture de l'environnement
  errors.js                   HttpError et fabriques (404, 409)
  routes/products.routes.js   routes HTTP, aucune règle métier
  services/product.service.js règles métier (409 si stock non nul, pagination)
  repositories/memory-repository.js  stockage générique en mémoire (Map)
  schemas/                    schémas Zod partagés et par ressource
  middlewares/                validation, clé d'API, journal, upload, erreurs
test/products.test.js         tests d'intégration
```

Le dépôt en mémoire est générique : produits et avis utilisent la même implémentation.
Le service ne connaît pas Express, il peut être testé ou réutilisé seul.

## Routes

| Méthode | Route | Succès | Erreurs |
| ------- | ----- | ------ | ------- |
| GET | `/api/produits?page=&limite=&categorie=` | 200 | 400 |
| POST | `/api/produits` | 201 | 400, 401 |
| GET | `/api/produits/:id` | 200 | 400, 404 |
| PATCH | `/api/produits/:id` | 200 | 400, 401, 404 |
| DELETE | `/api/produits/:id` | 204 | 401, 404, 409 si stock non nul |
| GET | `/api/produits/:id/avis` | 200 | 404 |
| POST | `/api/produits/:id/avis` | 201 | 400, 401, 404 |
| POST | `/api/produits/:id/image` (multipart, champ `image`) | 201 | 400, 401, 404, 413 |

Produit : `nom` (2 à 60 caractères), `prix` (positif, deux décimales au plus),
`stock` (entier positif ou nul, 0 par défaut), `categorie` (`livre`, `jeu`, `musique`).
Avis : `note` (entier de 1 à 5), `commentaire` (500 caractères au plus, facultatif).

## Exercice 1 : les quatre bogues

1. Le middleware de journalisation n'appelle jamais `next()` : toutes les requêtes suivantes restent bloquées.
2. `POST /api/articles` répond 200 au lieu de 201 après une création.
3. Le gestionnaire d'erreurs n'a que trois paramètres : Express le prend pour un middleware ordinaire.
   Il faut la signature `(err, req, res, next)`. En plus, il renvoie `err.stack` au client.
4. Le gestionnaire 404 est déclaré après le gestionnaire d'erreurs : il doit venir juste après les routes,
   et le gestionnaire d'erreurs en tout dernier.

À noter aussi : `express.json()` est déclaré après la première route, qui ne pourrait pas lire de corps JSON.

## Pour aller plus loin : persister dans un fichier JSON

Relire puis réécrire un fichier JSON à chaque opération provoque une course entre deux écritures simultanées :
les deux requêtes lisent le même état, chacune ajoute sa ligne, et la dernière écriture efface la première.
Il faudrait un verrou ou une file d'écriture, ce qu'une base de données fournit avec ses transactions.
