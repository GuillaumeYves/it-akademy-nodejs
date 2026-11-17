// Rôles de l'API, identiques à l'énumération Role du schéma Prisma.
export const ROLES = Object.freeze({
  MEMBER: "membre",
  LIBRARIAN: "bibliothecaire",
});

export const isLibrarian = (user) => user?.role === ROLES.LIBRARIAN;
