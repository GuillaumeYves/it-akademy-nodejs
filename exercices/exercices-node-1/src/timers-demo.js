// Exercice 4 : minuteur promis.
import { attendre, avecDelai } from "./lib/timers.js";

async function tryWithTimeout(ms) {
  try {
    await avecDelai(attendre(500), ms);
    console.log(`Délai de ${ms} ms : tenu`);
  } catch (error) {
    console.log(`Délai de ${ms} ms : ${error.message}`);
  }
}

await tryWithTimeout(200);
await tryWithTimeout(1000);
