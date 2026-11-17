import "dotenv/config";

const MIN_SECRET_LENGTH = 32;
const MIN_BCRYPT_COST = 12;

// Lit une variable obligatoire, échoue tôt si elle manque.
function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

function integer(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`${name} doit être un entier`);
  return value;
}

function secret(name) {
  const value = required(name);
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} doit contenir au moins ${MIN_SECRET_LENGTH} caractères`);
  }
  return value;
}

// Configuration complète, construite une fois au démarrage.
export function loadConfig() {
  return {
    port: integer("PORT", 3000),
    databaseUrl: required("DATABASE_URL"),
    bodyLimit: "100kb",
    auth: {
      accessSecret: secret("JWT_ACCESS_SECRET"),
      accessTtlSeconds: 900,
      refreshTtlDays: 7,
      bcryptCost: Math.max(integer("BCRYPT_COST", MIN_BCRYPT_COST), MIN_BCRYPT_COST),
    },
    rateLimit: {
      authMax: integer("AUTH_RATE_LIMIT_MAX", 10),
      authWindowMs: 15 * 60 * 1000,
    },
  };
}
