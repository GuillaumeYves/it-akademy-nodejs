import { z } from "zod";
import { idSchema, isoDateSchema, paginationSchema, queryBooleanSchema } from "./common.schema.js";

// emprunteurId n'est pris en compte que pour un bibliothécaire ; un membre emprunte pour lui-même.
export const createLoanSchema = z
  .object({
    ouvrageId: idSchema,
    emprunteurId: idSchema.optional(),
    empruntLe: isoDateSchema.optional(),
    retourPrevuLe: isoDateSchema,
  })
  .refine((loan) => loan.retourPrevuLe > (loan.empruntLe ?? new Date()), {
    message: "La date de retour prévue doit suivre la date d'emprunt",
    path: ["retourPrevuLe"],
  });

// Seule la date de retour prévue se modifie : ni l'ouvrage, ni le propriétaire, ni l'état rendu.
export const updateLoanSchema = z.object({
  retourPrevuLe: isoDateSchema,
});

export const listLoansQuerySchema = paginationSchema.extend({
  rendu: queryBooleanSchema.optional(),
  ouvrageId: idSchema.optional(),
});
