import cors from "cors";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { forbidden } from "../erreurs.js";

const TOO_MANY_REQUESTS = { erreur: "Trop de requêtes, réessayez plus tard" };

// En-têtes de sécurité HTTP ; l'API ne sert que du JSON.
export const securityHeaders = () => helmet();

// CORS limité aux origines déclarées. Sans en-tête Origin (mobile, curl), la requête passe.
export function corsPolicy(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return cors({
    origin: (origin, callback) => {
      if (!origin || allowed.has(origin)) callback(null, true);
      else callback(forbidden("Origine non autorisée"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });
}

// Limiteur de débit : en-têtes RateLimit-* standard et réponse JSON en 429.
export function rateLimiter({ max, windowMs }) {
  return rateLimit({
    limit: max,
    windowMs,
    standardHeaders: "draft-6",
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json(TOO_MANY_REQUESTS),
  });
}
