import { HttpError } from "../errors.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Exige l'en-tête X-Api-Key sur les seules méthodes d'écriture.
// Sans variable API_KEY, la protection est désactivée (développement).
export function cleApi(expectedKey) {
  return (req, res, next) => {
    if (!expectedKey || !WRITE_METHODS.has(req.method)) {
      next();
      return;
    }
    if (req.get("X-Api-Key") !== expectedKey) {
      next(new HttpError(401, "Clé d'API absente ou invalide"));
      return;
    }
    next();
  };
}
