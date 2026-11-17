import { rateLimit } from "express-rate-limit";
import { toHttpError } from "../erreurs.js";

// Une ligne par requête : méthode, chemin, statut et durée.
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("close", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)} ms`);
  });
  next();
}

// Limiteur de débit : en-têtes RateLimit-* standard et réponse JSON en 429.
export function rateLimiter({ max, windowMs }) {
  return rateLimit({
    limit: max,
    windowMs,
    standardHeaders: "draft-6",
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ erreur: "Trop de requêtes, réessayez plus tard" }),
  });
}

// Réponse 404 pour toute route non déclarée.
export function notFoundHandler(req, res) {
  res.status(404).json({ erreur: `Route inconnue : ${req.method} ${req.path}` });
}

// Gestionnaire central : réponse JSON, jamais de pile d'exécution côté client.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  const httpError = toHttpError(err);
  if (httpError) {
    res.status(httpError.status).json({ erreur: httpError.message, details: httpError.details });
    return;
  }
  console.error(err);
  res.status(500).json({ erreur: "Erreur interne du serveur" });
}
