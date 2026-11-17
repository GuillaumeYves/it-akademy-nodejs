// Exercice 2 : serveur qui compte les requêtes, avec node:http uniquement.
import { createServer } from "node:http";
import { createRequestCounterHandler } from "./lib/request-counter.js";

const port = Number(process.env.PORT ?? 3000);

createServer(createRequestCounterHandler()).listen(port, () => {
  console.log(`Serveur à l'écoute sur http://localhost:${port}`);
});
