// Erreur métier porteuse d'un code HTTP, traduite par le gestionnaire central.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export const notFound = (message = "Ressource introuvable") => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);
