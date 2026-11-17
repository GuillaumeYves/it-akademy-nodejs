import { Router } from "express";
import { requireRole } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { ROLES } from "../domain/roles.js";
import { createBookSchema, listBooksQuerySchema, updateBookSchema } from "../schemas/book.schema.js";
import { idParamsSchema } from "../schemas/common.schema.js";

const byId = validate({ params: idParamsSchema });
const librarianOnly = requireRole(ROLES.LIBRARIAN);

// Routeur /api/ouvrages : lecture pour tout compte, écriture pour les bibliothécaires.
export function createBooksRouter({ bookService }) {
  const router = Router();

  router.get("/", validate({ query: listBooksQuerySchema }), async (req, res) => {
    res.json(await bookService.list(req.valid.query));
  });

  router.get("/:id", byId, async (req, res) => {
    res.json(await bookService.getById(req.valid.params.id, req.utilisateur));
  });

  router.post("/", librarianOnly, validate({ body: createBookSchema }), async (req, res) => {
    res.status(201).json(await bookService.create(req.valid.body));
  });

  router.patch(
    "/:id",
    librarianOnly,
    validate({ params: idParamsSchema, body: updateBookSchema }),
    async (req, res) => {
      res.json(await bookService.update(req.valid.params.id, req.valid.body));
    },
  );

  router.delete("/:id", librarianOnly, byId, async (req, res) => {
    await bookService.remove(req.valid.params.id);
    res.status(204).end();
  });

  return router;
}
