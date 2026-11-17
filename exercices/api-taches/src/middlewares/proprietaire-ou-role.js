import { forbidden, notFound } from "../erreurs.js";

// Fabrique le middleware proprietaireOuRole(...roles) à partir du dépôt des tâches.
// À placer après authenticate et la validation de :id.
export function createProprietaireOuRole(tasks) {
  return function proprietaireOuRole(...roles) {
    return async (req, res, next) => {
      const tache = await tasks.findById(req.valid.params.id);
      if (!tache) throw notFound("Tâche introuvable");

      const { id, role } = req.utilisateur;
      if (tache.proprietaireId !== id && !roles.includes(role)) {
        throw forbidden("Cette tâche appartient à un autre utilisateur");
      }
      req.tache = tache;
      next();
    };
  };
}
