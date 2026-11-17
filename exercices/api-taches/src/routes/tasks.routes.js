import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { createTaskSchema, idParamsSchema, listTasksQuerySchema, transferSchema, updateTaskSchema } from "../schemas.js";

// /api/taches : toutes les routes exigent un jeton, les routes /:id passent par proprietaireOuRole.
export function taskRoutes({ taskService, proprietaireOuRole }) {
  const router = Router();
  const withTask = (...roles) => [validate({ params: idParamsSchema }), proprietaireOuRole(...roles)];

  router.get("/", validate({ query: listTasksQuerySchema }), async (req, res) => {
    res.json(await taskService.lister(req.valid.query, req.utilisateur));
  });

  // Routes fixes déclarées avant /:id.
  router.get("/statistiques", async (req, res) => {
    res.json(await taskService.statistiques(req.utilisateur));
  });

  router.get("/export.csv", async (req, res) => {
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="taches.csv"',
    });
    // pipeline gère la contre-pression : la base n'est lue qu'au rythme du client.
    await pipeline(Readable.from(taskService.exporterCsv(req.utilisateur)), res);
  });

  router.post("/", validate({ body: createTaskSchema }), async (req, res) => {
    res.status(201).json(await taskService.creer(req.valid.body, req.utilisateur));
  });

  router.get("/:id", ...withTask("admin"), (req, res) => {
    res.json(req.tache);
  });

  router.patch("/:id", ...withTask("admin"), validate({ body: updateTaskSchema }), async (req, res) => {
    res.json(await taskService.modifier(req.tache, req.valid.body));
  });

  router.delete("/:id", ...withTask("admin"), async (req, res) => {
    await taskService.supprimer(req.tache);
    res.status(204).end();
  });

  router.post("/:id/transferer", ...withTask("admin"), validate({ body: transferSchema }), async (req, res) => {
    res.json(await taskService.transferer(req.tache.id, req.valid.body.versUtilisateurId));
  });

  return router;
}
