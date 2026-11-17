import { createBookRepository } from "./book.repository.js";
import { createLoanRepository } from "./loan.repository.js";
import { createRefreshTokenRepository } from "./refresh-token.repository.js";
import { createUserRepository } from "./user.repository.js";

// Regroupe les dépôts autour d'un même client (Prisma ou transaction).
export function createRepositories(db) {
  return {
    books: createBookRepository(db),
    loans: createLoanRepository(db),
    users: createUserRepository(db),
    refreshTokens: createRefreshTokenRepository(db),
  };
}

// Point d'accès unique aux dépôts, avec exécution transactionnelle.
export function createDataAccess(prisma) {
  return {
    repositories: createRepositories(prisma),
    // Tout ce que fait fn est validé ensemble ou annulé ensemble.
    transaction: (fn) => prisma.$transaction((tx) => fn(createRepositories(tx))),
  };
}
