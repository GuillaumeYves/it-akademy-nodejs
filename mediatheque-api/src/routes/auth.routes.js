import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { loginSchema, refreshSchema, registerSchema } from "../schemas/auth.schema.js";

// Routeur /api/auth : inscription, connexion, rafraîchissement, déconnexion.
export function createAuthRouter({ authService, authenticate }) {
  const router = Router();

  router.post("/inscription", validate({ body: registerSchema }), async (req, res) => {
    res.status(201).json(await authService.register(req.valid.body));
  });

  router.post("/connexion", validate({ body: loginSchema }), async (req, res) => {
    res.json(await authService.login(req.valid.body));
  });

  router.post("/rafraichir", validate({ body: refreshSchema }), async (req, res) => {
    res.json(await authService.refresh(req.valid.body));
  });

  router.post("/deconnexion", authenticate, async (req, res) => {
    await authService.logout(req.utilisateur.id);
    res.status(204).end();
  });

  router.get("/moi", authenticate, async (req, res) => {
    res.json(await authService.me(req.utilisateur.id));
  });

  return router;
}
