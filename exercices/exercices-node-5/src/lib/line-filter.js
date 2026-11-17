import { Transform } from "node:stream";

// Flux de transformation ligne à ligne : ne garde que les lignes acceptées par keep.
// Seule la ligne incomplète en fin de morceau reste en mémoire.
export function createLineFilter(keep) {
  let remainder = "";
  let kept = 0;

  const filter = new Transform({
    decodeStrings: false,
    transform(chunk, encoding, callback) {
      const lines = (remainder + chunk).split("\n");
      remainder = lines.pop();
      const output = lines.filter((line) => keep(line.replace(/\r$/, "")));
      kept += output.length;
      callback(null, output.length > 0 ? `${output.join("\n")}\n` : undefined);
    },
    flush(callback) {
      const last = remainder.replace(/\r$/, "");
      if (last !== "" && keep(last)) {
        kept += 1;
        callback(null, `${last}\n`);
      } else callback();
    },
  });

  return { filter, count: () => kept };
}

// Critère de l'exercice : troisième colonne, séparateur ;, égale à « erreur ».
export const isErrorLine = (line) => line.split(";")[2]?.trim() === "erreur";
