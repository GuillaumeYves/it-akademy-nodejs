# Exercices 4 : authentification et sécurité

Réponses écrites des revues de code (exercices 1 et 2). Les exercices 3 et 4 sont implémentés et testés
dans l'[API de tâches](../api-taches).

## Exercice 1 : revue de la route de connexion

1. **Mots de passe en clair** : la comparaison `!==` suppose un mot de passe stocké en clair.
   Il faut une empreinte bcrypt (coût 12 au moins) et `bcrypt.compare`.
2. **Énumération de comptes** : 404 « Compte inconnu » puis 401 « Mot de passe incorrect » révèlent quelles adresses existent.
   Il faut une seule réponse 401 « Identifiants invalides », avec la même durée (comparer contre une empreinte factice si le compte n'existe pas).
3. **Données sensibles dans le jeton** : le JWT n'est que signé, pas chiffré ; tout le monde peut lire l'e-mail et le mot de passe qu'il contient.
   Il ne doit porter que `sub` (identifiant) et le rôle.
4. **Secret faible et versionné** : `"secret"` en dur se devine et finit dans Git. Le secret vient de l'environnement,
   aléatoire et long (32 octets au moins), contrôlé au démarrage.
5. **Jeton sans expiration** : aucun `setExpirationTime`, ni émetteur, ni date d'émission. Un jeton volé reste valable pour toujours.
   Il faut un access token court (15 minutes) et un refresh token révocable.
6. **Mot de passe journalisé** : `console.log` écrit le mot de passe dans les journaux, lus par bien plus de monde que la base.
7. **Exposition excessive** : `res.json({ jeton, utilisateur })` renvoie tout le document, mot de passe compris. Il faut une sélection explicite des champs.
8. **Pas de validation ni de limitation** : `req.body.email` peut être un objet (`{"$ne": null}` en MongoDB : injection), et rien
   n'empêche la force brute. Il faut un schéma Zod et un limiteur de débit (10 tentatives par quart d'heure).

## Exercice 2 : revue de la route de modification

```js
router.patch("/:id", authentifier, async (req, res) => {
  const emprunt = await prisma.emprunt.update({ where: { id: Number(req.params.id) }, data: req.body });
  res.json(emprunt);
});
```

1. **Autorisation au niveau de l'objet absente** : tout membre connecté modifie l'emprunt de n'importe qui. Il faut charger
   l'emprunt et vérifier `emprunteurId === req.utilisateur.id` (ou un rôle bibliothécaire), sinon 403.
2. **Affectation en masse** : `data: req.body` laisse changer `emprunteurId`, `ouvrageId` ou `rendu`. Un schéma Zod
   ne doit accepter que les champs prévus, ici la date de retour prévue.
3. **Identifiant non validé** : `Number("abc")` donne `NaN`, d'où une erreur Prisma et un 500. Il faut valider `:id` en entier positif (400).
4. **Identifiant inconnu** : `update` lève `P2025`, à traduire en 404 par le gestionnaire d'erreurs plutôt qu'en 500.
5. **Règles métier contournées** : passer `rendu` à `true` par cette route ne rend pas l'ouvrage disponible. Le retour a sa propre route transactionnelle.

## Exercice 3 : middleware de propriété

`api-taches/src/middlewares/proprietaire-ou-role.js` :

```js
export function createProprietaireOuRole(tasks) {
  return function proprietaireOuRole(...roles) {
    return async (req, res, next) => {
      const tache = await tasks.findById(req.valid.params.id);
      if (!tache) throw notFound("Tâche introuvable");
      const { id, role } = req.utilisateur;
      if (tache.proprietaireId !== id && !roles.includes(role)) throw forbidden("Cette tâche appartient à un autre utilisateur");
      req.tache = tache;
      next();
    };
  };
}
```

Le dépôt est injecté une fois dans `app.js`, puis les routes utilisent `proprietaireOuRole("admin")` sur `/api/taches/:id`.
Express 5 transmet les promesses rejetées au gestionnaire d'erreurs, d'où les `throw`.

## Exercice 4 : tests d'accès

`api-taches/test/auth.test.js` et `api-taches/test/tasks.test.js`, avec `node:test` et `fetch`
contre l'application démarrée par `listen(0)` :

| Test | Attendu |
| ---- | ------- |
| connexion réussie | 200, `accessToken` et `refreshToken` |
| `/api/taches` sans jeton | 401 |
| jeton signé par un autre secret | 401 |
| suppression par un membre de la tâche d'un autre | 403 |
| bonus : onzième requête sur `/api/auth` dans le quart d'heure | 429 et `RateLimit-Remaining: 0` |
