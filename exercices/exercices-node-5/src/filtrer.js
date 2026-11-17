// Copie dans la cible les lignes en erreur de la source, en stream : mémoire constante quelle que soit la taille.
// Usage : node src/filtrer.js <source> <cible>
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createLineFilter, isErrorLine } from "./lib/line-filter.js";

const [source, target] = process.argv.slice(2);
if (!source || !target) {
  console.error("Usage : node src/filtrer.js <source> <cible>");
  process.exit(1);
}

const { filter, count } = createLineFilter(isErrorLine);
try {
  // pipeline propage les erreurs et respecte la contre-pression entre lecture et écriture.
  await pipeline(createReadStream(source, { encoding: "utf8" }), filter, createWriteStream(target));
  console.log(`${count()} lignes écrites dans ${target}`);
} catch (error) {
  console.error(`Filtrage impossible : ${error.message}`);
  process.exitCode = 1;
}
