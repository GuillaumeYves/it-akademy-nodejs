import { conflict, notFound } from "../erreurs.js";
import { toCsvLine } from "../utils/csv.js";

const EXPORT_BATCH_SIZE = 500;
const CSV_COLUMNS = ["id", "titre", "faite", "proprietaireId", "creeLe"];

// Un admin voit toutes les tâches, un membre seulement les siennes.
const ownerScope = (actor) => (actor.role === "admin" ? {} : { proprietaireId: actor.id });

// Variation du compteur tachesEnCours quand une tâche passe de faite à non faite, ou l'inverse.
const openDelta = (wasDone, isDone) => (wasDone === isDone ? 0 : isDone ? -1 : 1);

// Règles métier des tâches. Le compteur tachesEnCours change toujours dans la même transaction.
export function createTaskService({ repositories, transaction }) {
  const { tasks } = repositories;

  return {
    // Exercices 3, n° 3 : pagination, filtres et total.
    async lister({ page, limite, faite, q }, actor) {
      const where = {
        ...ownerScope(actor),
        ...(faite !== undefined && { faite }),
        ...(q && { titre: { contains: q, mode: "insensitive" } }),
      };
      const { items, total } = await tasks.findPage({ where, skip: (page - 1) * limite, take: limite });
      return { donnees: items, page, limite, total, pages: Math.ceil(total / limite) };
    },

    // Exercices 3, n° 4 : comptage par statut et plus ancienne tâche ouverte, en parallèle.
    async statistiques(actor) {
      const where = ownerScope(actor);
      const [groups, plusAncienne] = await Promise.all([tasks.countByStatus(where), tasks.findOldestOpen(where)]);
      const count = (done) => groups.find((group) => group.faite === done)?._count._all ?? 0;
      return { faites: count(true), aFaire: count(false), plusAncienneNonTerminee: plusAncienne };
    },

    creer: ({ titre, faite }, actor) =>
      transaction(async ({ tasks: txTasks, users }) => {
        const tache = await txTasks.create({ titre, faite, proprietaireId: actor.id });
        if (!faite) await users.adjustOpenTasks(actor.id, 1);
        return tache;
      }),

    modifier: (tache, changes) =>
      transaction(async ({ tasks: txTasks, users }) => {
        const updated = await txTasks.update(tache.id, changes);
        const delta = openDelta(tache.faite, updated.faite);
        if (delta !== 0) await users.adjustOpenTasks(tache.proprietaireId, delta);
        return updated;
      }),

    supprimer: (tache) =>
      transaction(async ({ tasks: txTasks, users }) => {
        await txTasks.delete(tache.id);
        if (!tache.faite) await users.adjustOpenTasks(tache.proprietaireId, -1);
      }),

    // Exercices 3, n° 5 : trois écritures atomiques. Cible inconnue : 404 avant toute écriture.
    transferer: (tacheId, versUtilisateurId) =>
      transaction(async ({ tasks: txTasks, users }) => {
        if (!(await users.findById(versUtilisateurId))) throw notFound("Utilisateur cible introuvable");
        const tache = await txTasks.findById(tacheId);
        if (!tache) throw notFound("Tâche introuvable");
        if (tache.proprietaireId === versUtilisateurId) throw conflict("Cet utilisateur possède déjà la tâche");

        // Condition sur l'ancien propriétaire : un transfert concurrent ne compte pas deux fois.
        if (!(await txTasks.reassign(tache.id, tache.proprietaireId, versUtilisateurId))) {
          throw conflict("La tâche a été modifiée entre-temps");
        }
        if (!tache.faite) {
          await users.adjustOpenTasks(tache.proprietaireId, -1);
          await users.adjustOpenTasks(versUtilisateurId, 1);
        }
        return txTasks.findById(tache.id);
      }),

    // Exercices 5, n° 2 : lignes CSV produites lot par lot, jamais toutes en mémoire.
    async *exporterCsv(actor) {
      const where = ownerScope(actor);
      yield toCsvLine(CSV_COLUMNS);
      let afterId;
      while (true) {
        const batch = await tasks.findBatch({ where, afterId, take: EXPORT_BATCH_SIZE });
        for (const tache of batch) {
          yield toCsvLine([tache.id, tache.titre, tache.faite, tache.proprietaireId, tache.creeLe.toISOString()]);
        }
        if (batch.length < EXPORT_BATCH_SIZE) return;
        afterId = batch.at(-1).id;
      }
    },
  };
}
