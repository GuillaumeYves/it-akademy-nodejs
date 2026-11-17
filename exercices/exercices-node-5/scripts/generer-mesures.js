// Génère un fichier de mesures numéro;capteur;état pour essayer filtrer.js en local.
// Usage : node scripts/generer-mesures.js [fichier] [lignes]
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const [target = "mesures.csv", rawCount = "200000"] = process.argv.slice(2);
const count = Number(rawCount);

// Une ligne sur treize en erreur : 15 385 lignes pour 200 000, comme le fichier du lab.
const STATES = ["erreur", "ok", "ok", "ok", "alerte", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok"];
let errors = 0;

function* lines() {
  for (let index = 0; index < count; index += 1) {
    const state = STATES[index % STATES.length];
    if (state === "erreur") errors += 1;
    yield `${index + 1};capteur-${(index % 40) + 1};${state}\n`;
  }
}

await pipeline(Readable.from(lines()), createWriteStream(target));
console.log(`${count} lignes écrites dans ${target}, dont ${errors} en erreur`);
