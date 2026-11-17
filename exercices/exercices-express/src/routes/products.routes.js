import { Router } from "express";
import { cleApi } from "../middlewares/api-key.js";
import { validate } from "../middlewares/validate.js";
import { HttpError } from "../errors.js";
import { idParamSchema, paginationSchema } from "../schemas/common.schema.js";
import {
  createProductSchema,
  createReviewSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from "../schemas/product.schema.js";

const invalidId = () =>
  new HttpError(400, "Identifiant invalide", [{ champ: "params.id", message: "Entier positif attendu" }]);

export function createProductsRouter({ productService, apiKey, upload }) {
  const router = Router();

  // Les écritures exigent la clé d'API, les lectures restent publiques.
  router.use(cleApi(apiKey));

  // Valide et charge le produit une seule fois pour toutes les routes qui portent :id.
  router.param("id", (req, res, next, rawId) => {
    const parsed = idParamSchema.safeParse({ id: rawId });
    if (!parsed.success) throw invalidId();
    req.product = productService.getOrFail(parsed.data.id);
    next();
  });

  router.get("/", validate({ query: listProductsQuerySchema }), (req, res) => {
    res.json(productService.list(req.valid.query));
  });

  router.post("/", validate({ body: createProductSchema }), (req, res) => {
    res.status(201).json(productService.create(req.valid.body));
  });

  router.get("/:id", (req, res) => {
    res.json(req.product);
  });

  router.patch("/:id", validate({ body: updateProductSchema }), (req, res) => {
    res.json(productService.update(req.product.id, req.valid.body));
  });

  router.delete("/:id", (req, res) => {
    productService.remove(req.product.id);
    res.status(204).end();
  });

  router.get("/:id/avis", validate({ query: paginationSchema }), (req, res) => {
    res.json(productService.listReviews(req.product.id, req.valid.query));
  });

  router.post("/:id/avis", validate({ body: createReviewSchema }), (req, res) => {
    res.status(201).json(productService.addReview(req.product.id, req.valid.body));
  });

  router.post("/:id/image", upload.middleware, (req, res) => {
    if (!req.file) throw new HttpError(400, "Fichier image manquant (champ image)");
    const url = `${req.protocol}://${req.get("host")}${upload.publicPath}/${req.file.filename}`;
    res.status(201).json(productService.attachImage(req.product.id, url));
  });

  return router;
}
