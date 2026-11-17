# Exercices 5 : streams, workers, cluster et TypeScript

| Exercice | Emplacement |
| -------- | ----------- |
| 1, filtrer un CSV en stream (mission du lab) | `src/filtrer.js`, `src/lib/line-filter.js` |
| 2, export CSV en streaming | [API de tâches](../api-taches) : `GET /api/taches/export.csv` |
| 3, hachage dans un worker | [API de tâches](../api-taches) : `src/security/password.js` |
| 4, typer un dépôt | `typescript/creer-depot.ts` |
| 5, erreurs de `tsc` | `typescript/trouver.ts` |

```bash
npm install                                   # génère aussi le client Prisma utilisé pour les types
npm run generer -- mesures.csv 200000         # 200 000 lignes, dont 15 385 en erreur
node --max-old-space-size=64 src/filtrer.js mesures.csv erreurs.csv
npm test                                      # filtre ligne à ligne et script complet sous 64 Mo
npm run check                                 # tsc --noEmit sur typescript/
```

## Exercice 1 : filtrer un CSV en stream

`src/filtrer.js` enchaîne avec `pipeline` un flux de lecture, un `Transform` qui découpe en lignes
et un flux d'écriture. Seule la ligne incomplète en fin de morceau reste en mémoire : la consommation
ne dépend pas de la taille du fichier, d'où le succès avec `--max-old-space-size=64`.

- Une ligne coupée entre deux morceaux de 64 Ko est reconstituée avec le morceau suivant.
- `pipeline` respecte la contre-pression : si l'écriture est lente, la lecture se met en pause.
- Une source absente donne un message d'erreur et le code de sortie 1, jamais une pile non gérée.
- Le script affiche le nombre de lignes écrites : `15385 lignes écrites dans erreurs.csv`.

Pour la mission vérifiée, copier ce dossier dans le conteneur du lab sous `~/exercices-node-5`
(`package.json` compris, pour `"type": "module"`), puis cliquer sur « Vérifier la mission ».

## Exercice 2 : export CSV en streaming

`GET /api/taches/export.csv` lit la base par lots de 500 avec un curseur sur `id`
(`where: { id: { gt: dernierId } }`, plus stable que `skip` quand des lignes sont ajoutées pendant l'export).
Un générateur asynchrone produit les lignes, `Readable.from` en fait un flux, et `pipeline` l'envoie
dans la réponse avec `Content-Disposition: attachment`. Le serveur ne garde jamais plus d'un lot en mémoire,
et la base n'est lue qu'au rythme où le client consomme.

## Exercice 3 : hachage dans un worker

`hacherDansWorker(motDePasse, cout)` lance un `Worker` qui exécute `bcrypt.hashSync` et renvoie
une `Promise` résolue au message du worker, rejetée sur erreur ou sortie anormale.
Un test de l'API de tâches lance une inscription au coût 14 (environ une seconde) et vérifie que `GET /sante`
répond avant la fin du hachage.

**Pourquoi bcrypt n'en a pas besoin en pratique** : les fonctions asynchrones du paquet `bcrypt`
(`hash`, `compare`) sont écrites en C++ et s'exécutent déjà hors de la boucle d'événements, dans le
pool de threads de libuv (4 threads par défaut, réglable par `UV_THREADPOOL_SIZE`). Seules les variantes
`hashSync` et `compareSync` bloquent. Le worker n'apporte donc rien avec `bcrypt.hash`, et il coûte la création
d'un thread par appel. Il devient utile pour un calcul en JavaScript pur, comme `bcryptjs` ou un traitement d'image.

## Exercice 4 : typer un dépôt

```ts
import type { Prisma, PrismaClient, Tache } from "../prisma/generated/client.ts";

export function creerDepot(prisma: PrismaClient) {
  return {
    lister: (page: number, limite: number): Promise<Tache[]> =>
      prisma.tache.findMany({ skip: (page - 1) * limite, take: limite }),
    trouver: (id: number): Promise<Tache | null> => prisma.tache.findUnique({ where: { id } }),
    creer: (donnees: Prisma.TacheCreateInput): Promise<Tache> => prisma.tache.create({ data: donnees }),
  };
}
```

Les types viennent du client généré : un champ ajouté au schéma est connu partout sans retouche,
et `Prisma.TacheCreateInput` refuse un champ inconnu ou mal typé à la compilation.
`trouver` renvoie `Tache | null` : l'appelant est obligé de traiter l'absence.

## Exercice 5 : lire les erreurs de `tsc`

Sur le fichier d'origine, `tsc --strict` signale :

| Ligne | Erreur | Cause | Correction |
| ----- | ------ | ----- | ---------- |
| `t.id === req.params.id` | TS2367, comparaison sans recouvrement entre `number` et `string \| string[]` | les paramètres d'URL sont toujours des chaînes | `Number(req.params.id)` et `Request<{ id: string }>` |
| `tache.echeance` | TS18048, `tache` peut valoir `undefined` | `find` renvoie `undefined` si rien ne correspond | répondre 404 avant d'y accéder |
| `tache.echeance - new Date()` | TS2362 et TS2363, opérandes non numériques ; TS18048 sur `echeance` | une `Date` ne se soustrait pas en TypeScript, et l'échéance est facultative | `tache.echeance.getTime() - Date.now()`, `null` sans échéance |

La version corrigée est `typescript/trouver.ts`, acceptée par `npm run check` sans désactiver d'option.
