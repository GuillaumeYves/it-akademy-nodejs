import { Worker } from "node:worker_threads";
import bcrypt from "bcrypt";

const HASH_WORKER = new URL("./hash-worker.js", import.meta.url);

// Hache un mot de passe dans un worker thread : la boucle d'événements reste libre.
export function hacherDansWorker(motDePasse, cost) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(HASH_WORKER, { workerData: { motDePasse, cost } });
    worker.once("message", resolve);
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker de hachage arrêté avec le code ${code}`));
    });
  });
}

export function createPasswordHasher({ cost }) {
  // Empreinte factice : un compte inconnu coûte le même temps qu'un mauvais mot de passe.
  const dummyHash = bcrypt.hashSync("compte-inexistant", cost);

  return {
    hash: (password) => hacherDansWorker(password, cost),

    // bcrypt.compare passe déjà par le pool de threads de libuv.
    verify: (password, hash) => bcrypt.compare(password, hash ?? dummyHash),
  };
}
