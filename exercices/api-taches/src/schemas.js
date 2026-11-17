import { z } from "zod";

// Messages de validation en français.
z.config(z.locales.fr());

const MAX_INT = 2_147_483_647;
const id = z.coerce.number().int().positive().max(MAX_INT);
const queryBoolean = z.stringbool({ truthy: ["true", "1"], falsy: ["false", "0"] });

export const idParamsSchema = z.object({ id });

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  motDePasse: z.string().min(12).max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  motDePasse: z.string().min(1).max(200),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(1).max(200) });

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(10),
  faite: queryBoolean.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export const createTaskSchema = z.object({
  titre: z.string().trim().min(1).max(200),
  faite: z.boolean().default(false),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Au moins un champ à modifier");

export const transferSchema = z.object({ versUtilisateurId: id });
