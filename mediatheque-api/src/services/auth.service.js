import { conflict, notFound, unauthorized } from "../erreurs.js";
import { ROLES } from "../domain/roles.js";
import { fingerprint } from "../security/tokens.js";

// Même message que le compte existe ou non.
const invalidCredentials = () => unauthorized("Identifiants invalides");
const invalidRefreshToken = () => unauthorized("Refresh token invalide ou expiré");

// Inscription, connexion, rotation des refresh tokens et déconnexion.
export function createAuthService({ dataAccess, passwordHasher, tokenService }) {
  const { repositories, transaction } = dataAccess;

  // Émet une paire de jetons et enregistre l'empreinte du refresh token.
  async function issueTokens(user, refreshTokens = repositories.refreshTokens) {
    const refresh = tokenService.createRefreshToken();
    await refreshTokens.create({ fingerprint: refresh.fingerprint, userId: user.id, expiresAt: refresh.expiresAt });
    return {
      accessToken: await tokenService.signAccessToken(user),
      refreshToken: refresh.token,
      tokenType: "Bearer",
      expiresIn: tokenService.accessTtlSeconds,
    };
  }

  return {
    // Toute inscription publique crée un membre : le rôle n'est pas choisi par le client.
    async register({ email, motDePasse }) {
      const motDePasseHache = await passwordHasher.hash(motDePasse);
      try {
        return await repositories.users.create({ email, motDePasseHache, role: ROLES.MEMBER });
      } catch (error) {
        if (error?.code === "P2002") throw conflict("Un compte existe déjà avec cet e-mail");
        throw error;
      }
    },

    async login({ email, motDePasse }) {
      const account = await repositories.users.findCredentialsByEmail(email);
      const valid = await passwordHasher.verify(motDePasse, account?.motDePasseHache);
      if (!account || !valid) throw invalidCredentials();

      const user = { id: account.id, email: account.email, role: account.role };
      return { ...(await issueTokens(user)), utilisateur: user };
    },

    // Rotation : l'ancien refresh token est révoqué, un nouveau est émis.
    // Un jeton déjà révoqué qui revient signale un vol : toute la session est coupée.
    async refresh({ refreshToken }) {
      const stored = await repositories.refreshTokens.findByFingerprint(fingerprint(refreshToken));
      if (!stored) throw invalidRefreshToken();

      // Hors transaction : la révocation générale doit survivre à l'erreur levée ensuite.
      if (stored.revoqueLe) {
        await repositories.refreshTokens.revokeAllForUser(stored.utilisateurId);
        throw invalidRefreshToken();
      }
      if (stored.expireLe <= new Date()) throw invalidRefreshToken();

      return transaction(async ({ refreshTokens }) => {
        // Deux rafraîchissements simultanés : un seul obtient la révocation.
        if (!(await refreshTokens.revokeIfActive(stored.id))) throw invalidRefreshToken();
        const { id, role } = stored.utilisateur;
        return issueTokens({ id, role }, refreshTokens);
      });
    },

    logout: (userId) => repositories.refreshTokens.revokeAllForUser(userId),

    async me(userId) {
      const user = await repositories.users.findById(userId);
      if (!user) throw notFound("Compte introuvable");
      return user;
    },
  };
}
