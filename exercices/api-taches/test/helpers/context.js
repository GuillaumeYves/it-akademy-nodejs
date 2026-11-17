import { after, before } from "node:test";
import bcrypt from "bcrypt";
import { createApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";
import { createPrismaClient } from "../../src/db/prisma.js";

export const PASSWORD = "Mot-de-passe-de-test-1";

export const ACCOUNTS = {
  admin: { email: "admin@example.net", role: "admin" },
  alice: { email: "alice@example.net", role: "membre" },
  bob: { email: "bob@example.net", role: "membre" },
};

// Base vide, trois comptes, application sur un port éphémère (listen(0)).
// onReady s'exécute dans le même hook, une fois le serveur prêt.
export function useTestContext(overrides = {}, { onReady } = {}) {
  const context = {};
  let server;

  before(async () => {
    const base = loadConfig();
    const config = {
      ...base,
      auth: { ...base.auth, ...overrides.auth },
      rateLimit: { ...base.rateLimit, ...overrides.rateLimit },
    };
    const prisma = createPrismaClient(config.databaseUrl);
    await prisma.$executeRawUnsafe('TRUNCATE "RefreshToken", "Tache", "Utilisateur" RESTART IDENTITY CASCADE');

    const motDePasseHache = await bcrypt.hash(PASSWORD, 12);
    const users = {};
    for (const [key, { email, role }] of Object.entries(ACCOUNTS)) {
      users[key] = await prisma.utilisateur.create({ data: { email, role, motDePasseHache } });
    }

    server = createApp({ prisma, config }).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    Object.assign(context, { prisma, config, users, baseUrl: `http://localhost:${server.address().port}` });
    await onReady?.(context);
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await context.prisma.$disconnect();
  });

  // Requête JSON avec jeton facultatif ; renvoie statut, en-têtes et corps.
  context.api = async (path, { method = "GET", body, token } = {}) => {
    const response = await fetch(context.baseUrl + path, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const isJson = response.headers.get("content-type")?.includes("application/json");
    return { status: response.status, headers: response.headers, body: isJson && text ? JSON.parse(text) : text };
  };

  context.login = async (account) =>
    (await context.api("/api/auth/connexion", { method: "POST", body: { email: ACCOUNTS[account].email, motDePasse: PASSWORD } })).body;

  return context;
}

// Connecte chaque compte une fois le serveur prêt et range ses access tokens.
export function withTokens(tokens) {
  return async (context) => {
    for (const account of Object.keys(ACCOUNTS)) {
      tokens[account] = (await context.login(account)).accessToken;
    }
  };
}
