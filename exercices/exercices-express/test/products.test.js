import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.js";

const API_KEY = "test-key";
let server;
let baseUrl;
let uploadDir;

before(async () => {
  uploadDir = await mkdtemp(join(tmpdir(), "uploads-"));
  const app = createApp({ apiKey: API_KEY, uploadDir, uploadMaxBytes: 500 * 1024 });
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await rm(uploadDir, { recursive: true, force: true });
});

// Requête JSON avec la clé d'API par défaut.
function request(path, { method = "GET", body, key = API_KEY } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (key) headers["X-Api-Key"] = key;
  return fetch(baseUrl + path, { method, headers, body: body && JSON.stringify(body) });
}

const book = { nom: "Dune", prix: 12.5, categorie: "livre" };

describe("API produits", () => {
  it("liste les produits en 200 avec la pagination", async () => {
    const res = await request("/api/produits");
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(await res.json()), ["donnees", "page", "limite", "total", "pages"]);
  });

  it("refuse un corps invalide en 400 et nomme les champs", async () => {
    const res = await request("/api/produits", { method: "POST", body: { nom: "x" } });
    assert.equal(res.status, 400);
    const fields = (await res.json()).details.map((detail) => detail.champ);
    assert.ok(fields.includes("body.nom") && fields.includes("body.prix"));
  });

  it("refuse un prix à trois décimales", async () => {
    const res = await request("/api/produits", { method: "POST", body: { ...book, prix: 1.234 } });
    assert.equal(res.status, 400);
  });

  it("crée un produit en 201 avec un stock à 0 par défaut", async () => {
    const res = await request("/api/produits", { method: "POST", body: book });
    assert.equal(res.status, 201);
    assert.equal((await res.json()).stock, 0);
  });

  it("exige la clé d'API sur les écritures seulement", async () => {
    assert.equal((await request("/api/produits", { method: "POST", body: book, key: null })).status, 401);
    assert.equal((await request("/api/produits", { key: null })).status, 200);
  });

  it("renvoie 409 à la suppression d'un produit en stock", async () => {
    const created = await (await request("/api/produits", { method: "POST", body: { ...book, stock: 3 } })).json();
    assert.equal((await request(`/api/produits/${created.id}`, { method: "DELETE" })).status, 409);
  });

  it("gère les avis en sous-ressource", async () => {
    const created = await (await request("/api/produits", { method: "POST", body: book })).json();
    const res = await request(`/api/produits/${created.id}/avis`, { method: "POST", body: { note: 5 } });
    assert.equal(res.status, 201);
    assert.equal((await request("/api/produits/999/avis", { method: "POST", body: { note: 5 } })).status, 404);
  });

  it("filtre par catégorie", async () => {
    const res = await request("/api/produits?categorie=jeu");
    assert.equal((await res.json()).total, 0);
  });

  it("répond 400 sur un identifiant mal formé et 404 sur une route inconnue", async () => {
    assert.equal((await request("/api/produits/abc")).status, 400);
    assert.equal((await request("/api/inconnu")).status, 404);
  });

  it("refuse une image trop lourde en 413", async () => {
    const created = await (await request("/api/produits", { method: "POST", body: book })).json();
    const form = new FormData();
    form.append("image", new Blob([new Uint8Array(600 * 1024)], { type: "image/png" }), "big.png");
    const res = await fetch(`${baseUrl}/api/produits/${created.id}/image`, {
      method: "POST",
      headers: { "X-Api-Key": API_KEY },
      body: form,
    });
    assert.equal(res.status, 413);
  });

  it("téléverse une image PNG et renvoie son URL publique", async () => {
    const created = await (await request("/api/produits", { method: "POST", body: book })).json();
    const form = new FormData();
    form.append("image", new Blob([new Uint8Array(1024)], { type: "image/png" }), "small.png");
    const res = await fetch(`${baseUrl}/api/produits/${created.id}/image`, {
      method: "POST",
      headers: { "X-Api-Key": API_KEY },
      body: form,
    });
    assert.equal(res.status, 201);
    const { image } = await res.json();
    assert.equal((await fetch(image)).status, 200);
  });
});
