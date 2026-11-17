import { unauthorized } from "../erreurs.js";

const BEARER = /^Bearer\s+(\S+)$/i;

// Exige un access token Bearer valide et place { id, role } dans req.utilisateur.
// Toute erreur de vérification donne 401, jamais 500.
export function authenticate(tokenService) {
  return async (req, res, next) => {
    const token = BEARER.exec(req.get("Authorization") ?? "")?.[1];
    if (!token) {
      next(unauthorized());
      return;
    }
    try {
      req.utilisateur = await tokenService.verifyAccessToken(token);
      next();
    } catch {
      next(unauthorized("Jeton invalide ou expiré"));
    }
  };
}
