import { parentPort, workerData } from "node:worker_threads";
import bcrypt from "bcrypt";

// Version synchrone volontaire : le blocage reste confiné à ce thread.
parentPort.postMessage(bcrypt.hashSync(workerData.motDePasse, workerData.cost));
