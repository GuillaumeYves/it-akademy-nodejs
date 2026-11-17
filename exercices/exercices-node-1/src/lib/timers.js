// Promise résolue après ms millisecondes, sans node:timers/promises.
export function attendre(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

// Rejette avec "Délai dépassé" si la promesse n'est pas tenue à temps.
export function avecDelai(promesse, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Délai dépassé")), ms);
  });
  // Le minuteur est nettoyé dans tous les cas pour ne pas bloquer le processus.
  return Promise.race([promesse, timeout]).finally(() => clearTimeout(timer));
}
