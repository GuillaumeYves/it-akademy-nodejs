// Exercice 1 : prédire l'ordre d'exécution.
//
// Ordre observé en module ES : A F H C G D B E.
// 1. Code synchrone : A, F (le corps async s'exécute jusqu'au premier await), H.
// 2. Microtâches de Promise : C puis G (la suite après await null).
// 3. File process.nextTick : D. En CommonJS, D passerait avant C, car le module
//    y est évalué hors d'une microtâche. En ESM, l'évaluation du module est déjà
//    une microtâche, donc la file des Promises est vidée avant celle de nextTick.
// 4. Phase timers : B, puis phase check : E. Depuis le module principal, l'ordre
//    entre setTimeout(0) et setImmediate n'est pas garanti, il dépend du temps
//    écoulé avant l'entrée dans la boucle.

console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
process.nextTick(() => console.log("D"));
setImmediate(() => console.log("E"));
(async () => {
  console.log("F");
  await null;
  console.log("G");
})();
console.log("H");
