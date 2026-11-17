// Exercice 5 : version corrigée, acceptée par tsc en mode strict.
import type { Request, Response } from "express";

interface Tache {
  id: number;
  titre: string;
  echeance?: Date;
}

const DAY_MS = 86_400_000;
const taches: Tache[] = [];

export function trouver(req: Request<{ id: string }>, res: Response) {
  // 1. Les paramètres d'URL sont des chaînes : conversion avant de comparer à un nombre.
  const id = Number(req.params.id);
  const tache = taches.find((t) => t.id === id);

  // 2. find peut renvoyer undefined : réponse 404 avant tout accès.
  if (!tache) {
    res.status(404).json({ erreur: "Tâche introuvable" });
    return;
  }

  // 3. On ne soustrait pas des Date : on soustrait des millisecondes, et l'échéance est facultative.
  const joursRestants = tache.echeance ? (tache.echeance.getTime() - Date.now()) / DAY_MS : null;
  res.json({ ...tache, joursRestants });
}
