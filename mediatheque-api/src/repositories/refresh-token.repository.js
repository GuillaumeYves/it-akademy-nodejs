// Accès aux refresh tokens, identifiés par leur empreinte SHA-256.
export function createRefreshTokenRepository(db) {
  return {
    create: ({ fingerprint, userId, expiresAt }) =>
      db.refreshToken.create({ data: { empreinte: fingerprint, utilisateurId: userId, expireLe: expiresAt } }),

    findByFingerprint: (fingerprint) =>
      db.refreshToken.findUnique({ where: { empreinte: fingerprint }, include: { utilisateur: true } }),

    // Révocation conditionnelle : false si le jeton était déjà révoqué entre-temps.
    async revokeIfActive(id) {
      const { count } = await db.refreshToken.updateMany({
        where: { id, revoqueLe: null },
        data: { revoqueLe: new Date() },
      });
      return count === 1;
    },

    revokeAllForUser: (userId) =>
      db.refreshToken.updateMany({
        where: { utilisateurId: userId, revoqueLe: null },
        data: { revoqueLe: new Date() },
      }),
  };
}
