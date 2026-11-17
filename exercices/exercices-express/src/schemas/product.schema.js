import { z } from "zod";
import { paginationSchema } from "./common.schema.js";

export const CATEGORIES = ["livre", "jeu", "musique"];

// Deux décimales au plus, avec une tolérance pour les flottants.
const hasAtMostTwoDecimals = (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;

export const createProductSchema = z.object({
  nom: z.string().trim().min(2).max(60),
  prix: z.number().positive().refine(hasAtMostTwoDecimals, "Deux décimales au plus"),
  stock: z.number().int().min(0).default(0),
  categorie: z.enum(CATEGORIES),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = paginationSchema.extend({
  categorie: z.enum(CATEGORIES).optional(),
});

export const createReviewSchema = z.object({
  note: z.number().int().min(1).max(5),
  commentaire: z.string().trim().max(500).optional(),
});
