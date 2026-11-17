import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type AccountKey, parseSse, useTestContext } from "./helpers/context.ts";
import { createTokenService } from "../src/security/tokens.ts";

// Quota minuscule : une seule réponse suffit à l'épuiser.
const ctx = useTestContext({ dailyTokenQuota: 20 });

async function ask(account: AccountKey, question: string) {
  const token = await createTokenService(ctx.config.auth).signAccessToken({ id: ctx.users[account].id, role: "membre" });
  return ctx.api("/api/assistant/flux", { method: "POST", token, body: { question } });
}

describe("Consommation et quota de l'assistant", () => {
  it("diffuse la réponse par défaut du bouchon en cinquante mots", async () => {
    const { body } = await ask("alice", "Bonjour");
    const words = parseSse(body).filter(({ event }) => event === "message");
    assert.equal(words.length, 50);
  });

  it("enregistre une ligne de consommation par réponse, jetons estimés à un pour quatre caractères", async () => {
    const rows = await ctx.prisma.consommationIa.findMany({ where: { utilisateurId: ctx.users.alice.id } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.jetonsEntree, Math.ceil("Bonjour".length / 4));
    assert.ok((rows[0]?.jetonsSortie ?? 0) > 20);
  });

  it("refuse en 429 la question suivante une fois le quota du jour atteint", async () => {
    const { status, body } = await ask("alice", "Encore une question");
    assert.equal(status, 429);
    assert.match(body.erreur, /Quota quotidien/);
  });

  it("ne pénalise pas les autres comptes", async () => {
    const { status } = await ask("bob", "Bonjour");
    assert.equal(status, 200);
  });
});
