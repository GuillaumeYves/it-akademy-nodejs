# API de tâches

API REST de gestion de tâches, support des exercices pratiques des séries 3, 4 et 5 :
pagination et statistiques, transaction, droits par propriétaire, tests d'accès, export CSV en streaming
et hachage dans un worker thread.

- **Stack** : Node.js 24, Express 5, Zod 4, Prisma 7, PostgreSQL 17, jose, bcrypt.
- **Architecture** : routes, services, dépôts et middlewares séparés, gestionnaire d'erreurs central.

## Installation

```bash
cp .env.example .env          # puis renseigner JWT_ACCESS_SECRET
npm ci                        # installe et génère le client Prisma
npm run db:up                 # PostgreSQL dans Docker (bases taches et taches_test)
npm run db:deploy             # applique la migration
npm run seed                  # 3 comptes, 1 200 tâches, rejouable sans doublon
npm run dev                   # API sur http://localhost:3000
```

Si le port 5432 est déjà pris, changer `DB_PORT` et le port de `DATABASE_URL` dans `.env`.

| Variable | Rôle | Défaut |
| -------- | ---- | ------ |
| `PORT` | port d'écoute | `3000` |
| `DATABASE_URL` | chaîne de connexion PostgreSQL | obligatoire |
| `DB_PORT` | port hôte publié par `docker compose` | `5432` |
| `JWT_ACCESS_SECRET` | secret des access tokens, 32 caractères au moins | obligatoire |
| `BCRYPT_COST` | coût bcrypt, 12 au minimum | `12` |
| `AUTH_RATE_LIMIT_MAX` | tentatives par quart d'heure sur `/api/auth/*` | `10` |

Comptes de démonstration, **fictifs** : `admin@example.net` / `Demo-Admin-2026!` (admin),
`alice@example.net` / `Demo-Alice-2026!` et `bob@example.net` / `Demo-Bob-2026!` (membres).

## Routes

| Méthode | Route | Accès | Succès | Erreurs |
| ------- | ----- | ----- | ------ | ------- |
| GET | `/sante` | public | 200 | |
| POST | `/api/auth/inscription` | public | 201 | 400, 409, 429 |
| POST | `/api/auth/connexion` | public | 200 (deux jetons) | 400, 401, 429 |
| POST | `/api/auth/rafraichir` | public | 200 | 400, 401, 429 |
| GET | `/api/taches?page=&limite=&faite=&q=` | connecté | 200 | 400, 401 |
| GET | `/api/taches/statistiques` | connecté | 200 | 401 |
| GET | `/api/taches/export.csv` | connecté | 200 (`text/csv`) | 401 |
| POST | `/api/taches` | connecté | 201 | 400, 401 |
| GET | `/api/taches/:id` | propriétaire ou admin | 200 | 400, 401, 403, 404 |
| PATCH | `/api/taches/:id` | propriétaire ou admin | 200 | 400, 401, 403, 404 |
| DELETE | `/api/taches/:id` | propriétaire ou admin | 204 | 400, 401, 403, 404 |
| POST | `/api/taches/:id/transferer` | propriétaire ou admin | 200 | 400, 401, 403, 404, 409 |

Un membre ne liste, ne compte et n'exporte que ses tâches ; un admin les voit toutes.
`Utilisateur.tachesEnCours` compte les tâches non terminées : création, passage à faite,
suppression et transfert le modifient dans la même transaction que la tâche.

## Correspondance avec les exercices

| Série | Exercice | Emplacement |
| ----- | -------- | ----------- |
| 3 | n° 3, `lister({ page, limite, faite, q })` | `src/services/task.service.js`, données et total en parallèle dans `src/repositories/index.js` |
| 3 | n° 4, `GET /api/taches/statistiques` | `groupBy` sur `faite` et plus ancienne tâche ouverte, en parallèle |
| 3 | n° 5, `POST /api/taches/:id/transferer` | transaction : tâche et deux compteurs ; cible inconnue, 404 avant toute écriture |
| 4 | n° 3, `proprietaireOuRole("admin")` | `src/middlewares/proprietaire-ou-role.js` : 404, 403, sinon `req.tache` |
| 4 | n° 4 et bonus | `test/auth.test.js` et `test/tasks.test.js` |
| 5 | n° 2, export CSV | `GET /api/taches/export.csv` : lots de 500 par curseur sur `id`, `pipeline` vers la réponse |
| 5 | n° 3, `hacherDansWorker` | `src/security/password.js` et `src/security/hash-worker.js`, utilisé à l'inscription |

Les réponses écrites de chaque série sont dans `../exercices-node-3`, `../exercices-node-4` et `../exercices-node-5`.

## Tests

```bash
cp .env.test.example .env.test   # adapter le port si besoin
npm test
```

Les tests démarrent l'application sur un port éphémère (`listen(0)`) contre la base `taches_test`,
vidée au début de chaque fichier. Ils couvrent la connexion (deux jetons), le 401 sans jeton ou avec
un jeton signé par un autre secret, le 403 d'un membre sur la tâche d'un autre, le 429 à la onzième
requête sur `/api/auth` avec `RateLimit-Remaining` à 0, la pagination avec recherche, les statistiques, le transfert
(compteurs mis à jour, 404 sans modification), l'export CSV sur plusieurs lots et la disponibilité
de `/sante` pendant un hachage de coût 14.

## Architecture

```
prisma/
  schema.prisma          Utilisateur, RefreshToken, Tache
  migrations/            migration initiale
  seed.js                seeder rejouable
src/
  index.js               démarrage et arrêt propre
  app.js                 assemblage : sécurité, routes, 404, erreurs
  config.js              lecture et contrôle de l'environnement
  erreurs.js             HttpError et traduction des erreurs Prisma
  schemas.js             schémas Zod
  db/prisma.js           client Prisma avec l'adaptateur pg
  security/              jetons, hachage dans un worker
  middlewares/           authentification, propriété, validation, journal, débit, erreurs
  services/              règles métier et transactions
  repositories/          requêtes Prisma
  routes/                HTTP uniquement
  utils/csv.js           échappement CSV
test/                    tests d'intégration
```
