// Exercice 3 : compte les mots des fichiers .md du dossier notes/, en parallèle.
import { resolve } from "node:path";
import { countWordsInParallel, formatResult } from "./lib/word-count.js";

const directory = resolve(process.argv[2] ?? "notes");

try {
  const results = await countWordsInParallel(directory);
  for (const result of results) {
    console.log(formatResult(result));
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.error(`Dossier introuvable : ${directory}`);
  process.exitCode = 1;
}
