import { forbidden, unauthorized } from "../erreurs.js";

const BEARER = /^Bearer\s+(\S+)$/i;

// Exige un access token Bearer valide et place { id, role } dans req.utilisateur.
// Toute erreur de vérification donne 401, jamais 500.
export function authenticate(tokenService) {
  return async (req, res, next) => {
    const match = BEARER.exec(req.get("Authorization") ?? "");
    if (!match) {
      next(unauthorized());
      return;
    }
    try {
      req.utilisateur = await tokenService.verifyAccessToken(match[1]);
      next();
    } catch {
      next(unauthorized("Jeton invalide ou expiré"));
    }
  };
}

// Autorise seulement les rôles listés, à placer après authenticate.
export function requireRole(...roles) {
  return (req, res, next) => {
    next(roles.includes(req.utilisateur?.role) ? undefined : forbidden("Rôle insuffisant"));
  };
}
