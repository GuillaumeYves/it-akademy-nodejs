# Exercices 3 : persistance avec Mongoose et Prisma

Réponses écrites des exercices 1 et 2. Les exercices 3 à 5 sont implémentés et testés
dans l'[API de tâches](../api-taches) (PostgreSQL et Prisma).

## Exercice 1 : choisir la base

| Application | Choix | Raison |
| ----------- | ----- | ------ |
| Journal d'événements applicatifs | MongoDB | structure variable selon la source et volume en écriture continue : des documents sans schéma rigide, indexés sur la date, conviennent mieux que des colonnes fixes. |
| Billetterie de concerts | PostgreSQL | la survente est interdite : il faut des transactions ACID et des contraintes d'unicité sur les places, au cœur du modèle relationnel. |
| Catalogue aux attributs variables | MongoDB | chaque famille a ses propres attributs : un document par produit les porte naturellement, sans table d'attributs générique ni colonnes vides. |
| Comptabilité d'une association | PostgreSQL | écritures équilibrées, comptes et bilans demandent intégrité référentielle, transactions et agrégations SQL fiables. |

Nuance : PostgreSQL et sa colonne `jsonb` couvrent aussi très bien le catalogue. Le choix de MongoDB s'y défend
surtout si l'équipe le connaît déjà et qu'aucune transaction entre produits n'est nécessaire.

## Exercice 2 : modéliser en relationnel

Le schéma complet est dans [`ecole.prisma`](ecole.prisma) ; `prisma validate` l'accepte.

- **Plusieurs-à-plusieurs explicite** : l'inscription porte ses propres données (date, note), elle devient
  donc un modèle `Inscription` et non une relation implicite.
- **Clé primaire composite** `(apprenantId, coursId)` : un apprenant ne s'inscrit qu'une fois à un cours.
  Elle sert aussi d'index pour « les cours d'un apprenant ».
- **Index sur `coursId`** : « les apprenants d'un cours » ne peut pas utiliser la clé composite, qui commence par `apprenantId`.
- **Règles de suppression** :
  - supprimer un apprenant supprime ses inscriptions (`Cascade`) : ses données personnelles disparaissent avec lui ;
  - supprimer un cours qui a des inscriptions est refusé (`Restrict`) : on ne perd pas un historique de notes par erreur.
    Un cours terminé s'archive plutôt qu'il ne se supprime.
- **Note** en `Decimal(4, 2)` et facultative : pas d'erreur d'arrondi des flottants, et une inscription existe avant d'être notée.

## Exercices 3 à 5

| Exercice | Implémentation |
| -------- | -------------- |
| 3, pagination et total | `lister()` dans `api-taches/src/services/task.service.js` ; `findMany` et `count` lancés avec `Promise.all` ; recherche `contains` avec `mode: "insensitive"` |
| 4, statistiques | `GET /api/taches/statistiques` : `groupBy({ by: ["faite"], _count })` et `findFirst` trié par date, en parallèle |
| 5, transfert | `POST /api/taches/:id/transferer` : `prisma.$transaction` avec la mise à jour de la tâche et les deux `increment` ; la cible est vérifiée avant toute écriture, une erreur annule l'ensemble |

## Pour aller plus loin : seeder idempotent

Le seeder de l'API de tâches utilise `upsert` pour les comptes et des identifiants fixes avec
`createMany({ skipDuplicates: true })` pour les tâches, puis recale la séquence et recalcule les compteurs.
Deux `npm run seed` de suite laissent exactement 3 comptes et 1 200 tâches.
