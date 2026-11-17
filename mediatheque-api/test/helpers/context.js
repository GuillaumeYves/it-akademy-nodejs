import { after, before } from "node:test";
import { createApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";
import { createPrismaClient } from "../../src/db/prisma.js";
import { createPasswordHasher } from "../../src/security/password.js";

const TABLES = ['"RefreshToken"', '"Emprunt"', '"Ouvrage"', '"Utilisateur"'];

export const PASSWORD = "Mot-de-passe-de-test-1";

// Comptes créés pour chaque suite.
export const ACCOUNTS = {
  librarian: { email: "biblio@example.net", role: "bibliothecaire" },
  alice: { email: "alice@example.net", role: "membre" },
  bob: { email: "bob@example.net", role: "membre" },
};

// Prépare une base vide, des comptes et une application à l'écoute sur un port éphémère.
// onReady s'exécute une fois le serveur prêt, dans le même hook, pour garantir l'ordre.
export function useTestContext(configOverrides = {}, { onReady } = {}) {
  const context = {};

  before(async () => {
    const baseConfig = loadConfig();
    const config = { ...baseConfig, ...configOverrides, rateLimit: { ...baseConfig.rateLimit, ...configOverrides.rateLimit } };
    const prisma = createPrismaClient(config.databaseUrl);
    await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);

    const hasher = createPasswordHasher({ cost: config.auth.bcryptCost });
    const motDePasseHache = await hasher.hash(PASSWORD);
    context.users = {};
    for (const [key, { email, role }] of Object.entries(ACCOUNTS)) {
      context.users[key] = await prisma.utilisateur.create({ data: { email, role, motDePasseHache } });
    }

    const server = createApp({ prisma, config }).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    Object.assign(context, { prisma, server, config, baseUrl: `http://localhost:${server.address().port}` });
    await onReady?.(context);
  });

  after(async () => {
    await new Promise((resolve) => context.server.close(resolve));
    await context.prisma.$disconnect();
  });

  // Requête JSON, avec jeton Bearer facultatif ; renvoie statut, en-têtes et corps.
  context.api = async (path, { method = "GET", body, token, headers = {} } = {}) => {
    const response = await fetch(context.baseUrl + path, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
  };

  context.login = async (accountKey) => {
    const { body } = await context.api("/api/auth/connexion", {
      method: "POST",
      body: { email: ACCOUNTS[accountKey].email, motDePasse: PASSWORD },
    });
    return body;
  };

  context.createBook = (data = {}) =>
    context.prisma.ouvrage.create({ data: { titre: "Ouvrage de test", auteur: "Auteur Fictif", annee: 2000, ...data } });

  return context;
}
