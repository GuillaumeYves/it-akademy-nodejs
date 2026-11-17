import { EventEmitter } from "node:events";
import { attendre } from "./timers.js";

const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 500;

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Simule des téléchargements et publie leur progression par événements.
export class Telechargeur extends EventEmitter {
  async lancer(urls) {
    await Promise.all(urls.map((url) => this.#download(url)));
    this.emit("termine", { total: urls.length });
  }

  async #download(url) {
    this.emit("debut", url);
    await attendre(randomBetween(MIN_DELAY_MS, MAX_DELAY_MS));

    if (url.includes("erreur")) {
      this.emit("error", new Error(`Échec du téléchargement : ${url}`));
      return;
    }
    this.emit("fin", url, randomBetween(1_000, 1_000_000));
  }
}
