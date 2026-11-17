import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SignJWT } from "jose";
import { useTestContext } from "./helpers/context.js";

// Coût 14 : un hachage dure environ une seconde, de quoi observer le worker.
const ctx = useTestContext({ auth: { bcryptCost: 14 }, rateLimit: { authMax: 10 } });

describe("Authentification (exercices 4)", () => {
  it("connecte un compte et renvoie deux jetons", async () => {
    const body = await ctx.login("alice");
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
    assert.equal(body.tokenType, "Bearer");
  });

  it("refuse /api/taches sans jeton en 401", async () => {
    const { status } = await ctx.api("/api/taches");
    assert.equal(status, 401);
  });

  it("refuse un jeton signé par un autre secret en 401", async () => {
    const forged = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(ctx.users.alice.id))
      .setIssuer("api-taches")
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode("un-autre-secret-de-plus-de-trente-deux-caracteres"));
    const { status } = await ctx.api("/api/taches", { token: forged });
    assert.equal(status, 401);
  });

  it("répond à /sante pendant une inscription hachée dans un worker", async () => {
    const started = performance.now();
    const registration = ctx
      .api("/api/auth/inscription", { method: "POST", body: { email: "nouveau@example.net", motDePasse: "Mot-de-passe-solide-1" } })
      .then((response) => ({ ...response, at: performance.now() - started }));
    // Laisse partir la requête d'inscription avant la sonde.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const health = await ctx.api("/sante");
    const healthAt = performance.now() - started;

    const { status, at } = await registration;
    assert.equal(health.status, 200);
    assert.equal(status, 201);
    assert.ok(healthAt < at, `la sonde (${healthAt.toFixed(0)} ms) répond avant la fin du hachage (${at.toFixed(0)} ms)`);
  });

  // Placé en dernier : il épuise le quota de /api/auth de cette application.
  it("bloque la onzième tentative de connexion en 429", async () => {
    const remaining = 10 - 2; // deux requêtes /api/auth faites plus haut
    const attempt = () =>
      ctx.api("/api/auth/connexion", { method: "POST", body: { email: "alice@example.net", motDePasse: "mauvais" } });
    for (let count = 1; count <= remaining; count += 1) {
      assert.equal((await attempt()).status, 401, `tentative ${count}`);
    }
    const blocked = await attempt();
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("ratelimit-remaining"), "0");
  });
});
