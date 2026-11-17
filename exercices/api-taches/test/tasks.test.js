import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { useTestContext, withTokens } from "./helpers/context.js";

const tokens = {};
const ctx = useTestContext({}, { onReady: withTokens(tokens) });

const createTask = (account, body) => ctx.api("/api/taches", { method: "POST", token: tokens[account], body });
const openTasksOf = async (account) =>
  (await ctx.prisma.utilisateur.findUnique({ where: { id: ctx.users[account].id } })).tachesEnCours;

describe("Droits sur les tâches (exercices 4)", () => {
  it("refuse à un membre la suppression de la tâche d'un autre en 403", async () => {
    const { body: task } = await createTask("bob", { titre: "Tâche de Bob" });
    const { status } = await ctx.api(`/api/taches/${task.id}`, { method: "DELETE", token: tokens.alice });
    assert.equal(status, 403);
  });

  it("laisse l'admin agir sur toutes les tâches et renvoie 404 sur une tâche inconnue", async () => {
    const { body: task } = await createTask("bob", { titre: "Tâche supprimée par l'admin" });
    assert.equal((await ctx.api(`/api/taches/${task.id}`, { method: "DELETE", token: tokens.admin })).status, 204);
    assert.equal((await ctx.api("/api/taches/999999", { token: tokens.admin })).status, 404);
  });
});

describe("Persistance (exercices 3)", () => {
  it("pagine, filtre et cherche sans tenir compte de la casse", async () => {
    await createTask("alice", { titre: "Acheter du PAIN" });
    await createTask("alice", { titre: "Pain de mie", faite: true });
    await createTask("alice", { titre: "Arroser les plantes" });

    const { body } = await ctx.api("/api/taches?q=pain&limite=1", { token: tokens.alice });
    assert.equal(body.total, 2);
    assert.equal(body.pages, 2);
    assert.equal(body.donnees.length, 1);

    const done = await ctx.api("/api/taches?q=pain&faite=true", { token: tokens.alice });
    assert.deepEqual(done.body.donnees.map((task) => task.titre), ["Pain de mie"]);
  });

  it("calcule les statistiques de l'utilisateur", async () => {
    const { body } = await ctx.api("/api/taches/statistiques", { token: tokens.alice });
    assert.equal(body.faites, 1);
    assert.equal(body.aFaire, 2);
    assert.equal(body.plusAncienneNonTerminee.titre, "Acheter du PAIN");
  });

  it("transfère une tâche ouverte et met à jour les deux compteurs", async () => {
    const { body: task } = await createTask("alice", { titre: "À transférer" });
    const [aliceBefore, bobBefore] = [await openTasksOf("alice"), await openTasksOf("bob")];

    const { status, body } = await ctx.api(`/api/taches/${task.id}/transferer`, {
      method: "POST",
      token: tokens.alice,
      body: { versUtilisateurId: ctx.users.bob.id },
    });
    assert.equal(status, 200);
    assert.equal(body.proprietaireId, ctx.users.bob.id);
    assert.equal(await openTasksOf("alice"), aliceBefore - 1);
    assert.equal(await openTasksOf("bob"), bobBefore + 1);
  });

  it("refuse un transfert vers un utilisateur inconnu en 404 sans rien modifier", async () => {
    const { body: task } = await createTask("alice", { titre: "Reste chez Alice" });
    const before = await openTasksOf("alice");

    const { status } = await ctx.api(`/api/taches/${task.id}/transferer`, {
      method: "POST",
      token: tokens.alice,
      body: { versUtilisateurId: 999999 },
    });
    assert.equal(status, 404);
    const stored = await ctx.prisma.tache.findUnique({ where: { id: task.id } });
    assert.equal(stored.proprietaireId, ctx.users.alice.id);
    assert.equal(await openTasksOf("alice"), before);
  });
});

describe("Export CSV en streaming (exercices 5)", () => {
  it("exporte toutes les tâches de l'admin en plusieurs lots, en pièce jointe", async () => {
    const data = Array.from({ length: 1100 }, (_, index) => ({ titre: `Lot ; "${index}"`, proprietaireId: ctx.users.admin.id }));
    await ctx.prisma.tache.createMany({ data });
    const total = await ctx.prisma.tache.count();

    const { status, headers, body } = await ctx.api("/api/taches/export.csv", { token: tokens.admin });
    assert.equal(status, 200);
    assert.match(headers.get("content-disposition"), /^attachment/);
    const lines = body.trimEnd().split("\n");
    assert.equal(lines[0], "id;titre;faite;proprietaireId;creeLe");
    assert.equal(lines.length - 1, total);
    assert.ok(lines.some((line) => line.includes('"Lot ; ""7"""')), "valeurs échappées");
  });
});
