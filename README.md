# Node.js

Travaux du module Node.js de la formation IT-Akademy : fondamentaux de la plateforme,
Express et API REST, persistance, authentification et sécurité, Node.js avancé et TypeScript,
intégration d'un modèle de langage.

## Contenu

| Dossier | Sujet |
| ------- | ----- |
| [`exercices/exercices-node-1/`](exercices/exercices-node-1) | boucle d'événements, modules natifs, asynchrone |
| [`exercices/exercices-express/`](exercices/exercices-express) | API REST Express 5 en mémoire, Zod, multer |
| [`exercices/api-taches/`](exercices/api-taches) | API de tâches PostgreSQL et Prisma, support des exercices 3 à 5 |
| [`exercices/exercices-node-3/`](exercices/exercices-node-3) | modélisation relationnelle, schéma Prisma, MongoDB ou PostgreSQL |
| [`exercices/exercices-node-4/`](exercices/exercices-node-4) | revue de sécurité, middleware de propriété, plan de tests |
| [`exercices/exercices-node-5/`](exercices/exercices-node-5) | streams sous mémoire bornée, worker, TypeScript strict |
| [`exercices/exercices-node-6/`](exercices/exercices-node-6) | revue de code IA, quota de jetons, SSE, injection de prompt |

## API de la médiathèque (TP 1, TP 2 et projet final)

L'API a son propre dépôt : [GuillaumeYves/mediatheque-api](https://github.com/GuillaumeYves/mediatheque-api).

Les états rendus depuis ce dépôt restent consultables par leurs tags, dans le dossier `mediatheque-api/` :

| Tag | État |
| --- | ---- |
| [`tp1`](https://github.com/GuillaumeYves/it-akademy-nodejs/tree/tp1/mediatheque-api) | TP 1 |
| [`tp2`](https://github.com/GuillaumeYves/it-akademy-nodejs/tree/tp2/mediatheque-api) | TP 2, après fusion de la pull request #1 |
| [`projet`](https://github.com/GuillaumeYves/it-akademy-nodejs/tree/projet/mediatheque-api) | projet final avec les corrections de la revue |

Chaque dossier est autonome et possède son propre README avec les instructions de lancement.

## Prérequis communs

- Node.js 24 ou plus récent.
- Docker, pour les bases de données des projets qui en utilisent une.
