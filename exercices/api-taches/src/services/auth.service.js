import { conflict, unauthorized } from "../erreurs.js";
import { fingerprint } from "../security/tokens.js";

// Inscription, connexion et rotation des refresh tokens.
export function createAuthService({ dataAccess, passwordHasher, tokenService }) {
  const { repositories, transaction } = dataAccess;

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
    // Le rôle n'est jamais choisi par le client.
    async register({ email, motDePasse }) {
      const motDePasseHache = await passwordHasher.hash(motDePasse);
      try {
        return await repositories.users.create({ email, motDePasseHache, role: "membre" });
      } catch (error) {
        if (error?.code === "P2002") throw conflict("Un compte existe déjà avec cet e-mail");
        throw error;
      }
    },

    // Même 401 que le compte existe ou non.
    async login({ email, motDePasse }) {
      const account = await repositories.users.findCredentialsByEmail(email);
      const valid = await passwordHasher.verify(motDePasse, account?.motDePasseHache);
      if (!account || !valid) throw unauthorized("Identifiants invalides");
      return issueTokens(account);
    },

    refresh: ({ refreshToken }) =>
      transaction(async ({ refreshTokens }) => {
        const stored = await refreshTokens.findActive(fingerprint(refreshToken));
        if (!stored || !(await refreshTokens.revokeIfActive(stored.id))) {
          throw unauthorized("Refresh token invalide ou expiré");
        }
        return issueTokens(stored.utilisateur, refreshTokens);
      }),
  };
}
