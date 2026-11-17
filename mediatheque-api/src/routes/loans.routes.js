import { Router } from "express";
import { requireRole } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { ROLES } from "../domain/roles.js";
import { idParamsSchema } from "../schemas/common.schema.js";
import { createLoanSchema, listLoansQuerySchema, updateLoanSchema } from "../schemas/loan.schema.js";

const byId = validate({ params: idParamsSchema });

// Routeur /api/emprunts : le contrôle de propriété est fait par le service.
export function createLoansRouter({ loanService }) {
  const router = Router();

  router.get("/", validate({ query: listLoansQuerySchema }), async (req, res) => {
    res.json(await loanService.list(req.valid.query, req.utilisateur));
  });

  router.get("/:id", byId, async (req, res) => {
    res.json(await loanService.getById(req.valid.params.id, req.utilisateur));
  });

  router.post("/", validate({ body: createLoanSchema }), async (req, res) => {
    res.status(201).json(await loanService.create(req.valid.body, req.utilisateur));
  });

  router.patch("/:id", validate({ params: idParamsSchema, body: updateLoanSchema }), async (req, res) => {
    res.json(await loanService.update(req.valid.params.id, req.valid.body, req.utilisateur));
  });

  router.delete("/:id", requireRole(ROLES.LIBRARIAN), byId, async (req, res) => {
    await loanService.remove(req.valid.params.id);
    res.status(204).end();
  });

  router.post("/:id/retour", byId, async (req, res) => {
    res.json(await loanService.returnLoan(req.valid.params.id, req.utilisateur));
  });

  return router;
}
