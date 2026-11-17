import { HttpError } from "../errors.js";

// Codes multer traduits en statuts HTTP.
const MULTER_STATUS = { LIMIT_FILE_SIZE: 413 };

export function notFoundHandler(req, res) {
  res.status(404).json({ erreur: "Route inconnue" });
}

// Gestionnaire central : quatre paramètres, jamais de pile dans la réponse.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ erreur: err.message, details: err.details });
    return;
  }
  if (err.name === "MulterError") {
    res.status(MULTER_STATUS[err.code] ?? 400).json({ erreur: err.message });
    return;
  }
  // Corps JSON mal formé, signalé par express.json().
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ erreur: "JSON invalide" });
    return;
  }

  console.error(err);
  res.status(500).json({ erreur: "Erreur interne" });
}
