import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const ALGORITHM = "HS256";
const ISSUER = "mediatheque-api";

// Empreinte stockée en base : un vol de la table ne livre aucun jeton utilisable.
export const fingerprint = (token) => createHash("sha256").update(token).digest("hex");

// Access token JWT court, refresh token opaque et aléatoire.
export function createTokenService({ accessSecret, accessTtlSeconds, refreshTtlDays }) {
  const key = new TextEncoder().encode(accessSecret);

  return {
    accessTtlSeconds,

    // Le jeton ne porte que l'identifiant et le rôle, jamais de donnée sensible.
    signAccessToken: (user) =>
      new SignJWT({ role: user.role })
        .setProtectedHeader({ alg: ALGORITHM })
        .setSubject(String(user.id))
        .setIssuer(ISSUER)
        .setIssuedAt()
        .setExpirationTime(`${accessTtlSeconds}s`)
        .sign(key),

    async verifyAccessToken(token) {
      const { payload } = await jwtVerify(token, key, { algorithms: [ALGORITHM], issuer: ISSUER });
      return { id: Number(payload.sub), role: payload.role };
    },

    createRefreshToken() {
      const token = randomBytes(48).toString("base64url");
      const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);
      return { token, fingerprint: fingerprint(token), expiresAt };
    },
  };
}
