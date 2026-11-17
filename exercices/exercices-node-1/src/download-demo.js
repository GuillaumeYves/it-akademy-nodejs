// Exercice 5 : émetteur de téléchargements.
import { Telechargeur } from "./lib/telechargeur.js";

const telechargeur = new Telechargeur();

telechargeur
  .on("debut", (url) => console.log(`début  ${url}`))
  .on("fin", (url, size) => console.log(`fin    ${url} (${size} octets)`))
  // Sans écouteur "error", l'émetteur lèverait une exception.
  .on("error", (error) => console.error(`erreur ${error.message}`))
  .on("termine", ({ total }) => console.log(`terminé : ${total} URL traitées`));

await telechargeur.lancer([
  "https://example.net/a.zip",
  "https://example.net/erreur.zip",
  "https://example.net/b.zip",
]);
