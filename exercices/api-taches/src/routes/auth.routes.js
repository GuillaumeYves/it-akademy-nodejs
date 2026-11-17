import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { credentialsSchema, loginSchema, refreshSchema } from "../schemas.js";

// /api/auth : inscription, connexion et rafraîchissement des jetons.
export function authRoutes({ authService }) {
  const router = Router();

  router.post("/inscription", validate({ body: credentialsSchema }), async (req, res) => {
    res.status(201).json(await authService.register(req.valid.body));
  });

  router.post("/connexion", validate({ body: loginSchema }), async (req, res) => {
    res.json(await authService.login(req.valid.body));
  });

  router.post("/rafraichir", validate({ body: refreshSchema }), async (req, res) => {
    res.json(await authService.refresh(req.valid.body));
  });

  return router;
}
