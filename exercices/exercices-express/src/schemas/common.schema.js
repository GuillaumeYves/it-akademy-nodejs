import { z } from "zod";

// Messages de validation en français pour tous les schémas.
z.config(z.locales.fr());

export const MAX_PAGE_SIZE = 50;

// Identifiant numérique strictement positif dans l'URL.
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Pagination commune à toutes les listes.
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
});
