import { z } from "zod";

// bcrypt ignore tout ce qui dépasse 72 octets : on refuse au-delà.
const MAX_PASSWORD_BYTES = 72;

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

const fitsBcrypt = (value) => Buffer.byteLength(value, "utf8") <= MAX_PASSWORD_BYTES;

export const registerSchema = z.object({
  email: emailSchema,
  motDePasse: z.string().min(12).refine(fitsBcrypt, "Mot de passe trop long (72 octets au plus)"),
});

// À la connexion, aucune règle de complexité n'est rappelée : on ne guide pas un attaquant.
export const loginSchema = z.object({
  email: emailSchema,
  motDePasse: z.string().min(1).max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).max(200),
});
