import { badRequest, conflict, forbidden, notFound } from "../erreurs.js";
import { isLibrarian } from "../domain/roles.js";
import { toPage, toSkipTake } from "./pagination.js";

const loanNotFound = () => notFound("Emprunt introuvable");

// Un bibliothécaire agit sur tous les emprunts, un membre sur les siens uniquement.
function assertCanAccess(loan, actor) {
  if (!isLibrarian(actor) && loan.emprunteurId !== actor.id) {
    throw forbidden("Cet emprunt appartient à un autre membre");
  }
}

// Règles métier des emprunts : droits par propriétaire et changements d'état atomiques.
export function createLoanService({ repositories, transaction }) {
  const { loans, users } = repositories;

  async function getById(id, actor) {
    const loan = await loans.findById(id);
    if (!loan) throw loanNotFound();
    assertCanAccess(loan, actor);
    return loan;
  }

  // Un membre emprunte pour lui-même ; un bibliothécaire peut désigner un membre.
  async function resolveBorrower(requestedId, actor) {
    if (!isLibrarian(actor) || requestedId === undefined) return actor.id;
    if (!(await users.exists(requestedId))) throw notFound("Emprunteur introuvable");
    return requestedId;
  }

  return {
    getById,

    // La liste d'un membre est toujours filtrée sur son propre compte.
    async list({ page, limite, rendu, ouvrageId }, actor) {
      const where = {};
      if (rendu !== undefined) where.rendu = rendu;
      if (ouvrageId !== undefined) where.ouvrageId = ouvrageId;
      if (!isLibrarian(actor)) where.emprunteurId = actor.id;
      const result = await loans.findPage({ where, ...toSkipTake({ page, limite }) });
      return toPage(result, { page, limite });
    },

    // L'ouvrage devient indisponible dans la même transaction que la création de l'emprunt.
    async create({ emprunteurId, ...data }, actor) {
      const borrowerId = await resolveBorrower(emprunteurId, actor);
      return transaction(async ({ books, loans: txLoans }) => {
        if (!(await books.reserveIfAvailable(data.ouvrageId))) {
          if (!(await books.exists(data.ouvrageId))) throw notFound("Ouvrage introuvable");
          throw conflict("Ouvrage déjà emprunté");
        }
        return txLoans.create({ ...data, emprunteurId: borrowerId });
      });
    },

    async update(id, changes, actor) {
      const current = await getById(id, actor);
      if (changes.retourPrevuLe && changes.retourPrevuLe <= current.empruntLe) {
        throw badRequest("Données invalides", [
          { champ: "body.retourPrevuLe", message: "La date de retour prévue doit suivre la date d'emprunt" },
        ]);
      }
      return loans.update(id, changes);
    },

    // Clôture l'emprunt et libère l'ouvrage ensemble.
    returnLoan: (id, actor) =>
      transaction(async ({ books, loans: txLoans }) => {
        const loan = await txLoans.findById(id);
        if (!loan) throw loanNotFound();
        assertCanAccess(loan, actor);
        if (!(await txLoans.closeIfActive(id, new Date()))) throw conflict("Emprunt déjà rendu");
        await books.markAvailable(loan.ouvrageId);
        return txLoans.findById(id);
      }),

    // Supprimer un emprunt en cours libère aussi l'ouvrage.
    remove: (id) =>
      transaction(async ({ books, loans: txLoans }) => {
        const loan = await txLoans.findById(id);
        if (!loan) throw loanNotFound();
        await txLoans.delete(id);
        if (!loan.rendu) await books.markAvailable(loan.ouvrageId);
      }),
  };
}
