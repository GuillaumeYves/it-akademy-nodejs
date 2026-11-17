import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { after, before, describe, it } from "node:test";
import { promisify } from "node:util";
import { createLineFilter, isErrorLine } from "../src/lib/line-filter.js";

const run = promisify(execFile);
const SCRIPT = new URL("../src/filtrer.js", import.meta.url).pathname;
const GENERATOR = new URL("../scripts/generer-mesures.js", import.meta.url).pathname;

// Collecte la sortie d'un filtre alimenté par des morceaux arbitraires.
async function filterChunks(chunks) {
  const { filter, count } = createLineFilter(isErrorLine);
  let output = "";
  for await (const piece of Readable.from(chunks).pipe(filter)) output += piece;
  return { output, count: count() };
}

describe("Filtre de lignes", () => {
  it("reconstitue les lignes coupées entre deux morceaux", async () => {
    const { output, count } = await filterChunks(["1;a;ok\n2;b;err", "eur\n3;c;erreur"]);
    assert.equal(output, "2;b;erreur\n3;c;erreur\n");
    assert.equal(count, 2);
  });

  it("tolère les fins de ligne Windows et ne regarde que la troisième colonne", async () => {
    const { output } = await filterChunks(["1;erreur;ok\r\n2;b;erreur\r\n"]);
    // La ligne est copiée telle quelle, fin de ligne d'origine comprise.
    assert.equal(output, "2;b;erreur\r\n");
  });
});

describe("filtrer.js avec 64 Mo de mémoire", () => {
  let dir;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "filtrer-"));
  });
  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("filtre 200 000 lignes sans charger le fichier", async () => {
    const source = join(dir, "mesures.csv");
    const target = join(dir, "erreurs.csv");
    await run(process.execPath, [GENERATOR, source, "200000"]);

    const { stdout } = await run(process.execPath, ["--max-old-space-size=64", SCRIPT, source, target]);
    const lines = (await readFile(target, "utf8")).trimEnd().split("\n");
    assert.equal(lines.length, 15385);
    assert.ok(lines.every(isErrorLine));
    assert.match(stdout, /^15385 lignes écrites/);
  });

  it("échoue proprement si la source est absente", async () => {
    await assert.rejects(run(process.execPath, [SCRIPT, join(dir, "absent.csv"), join(dir, "sortie.csv")]), { code: 1 });
  });
});
