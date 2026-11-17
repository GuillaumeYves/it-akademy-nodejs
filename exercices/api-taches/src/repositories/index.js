// Accès aux données. db est le client Prisma ou un client de transaction.

const PUBLIC_USER = { id: true, email: true, role: true, tachesEnCours: true, creeLe: true };

function createUserRepository(db) {
  return {
    findById: (id) => db.utilisateur.findUnique({ where: { id }, select: PUBLIC_USER }),
    findCredentialsByEmail: (email) =>
      db.utilisateur.findUnique({ where: { email }, select: { id: true, role: true, motDePasseHache: true } }),
    create: (data) => db.utilisateur.create({ data, select: PUBLIC_USER }),
    // Incrément atomique côté base : pas de lecture puis écriture.
    adjustOpenTasks: (id, delta) =>
      db.utilisateur.update({ where: { id }, data: { tachesEnCours: { increment: delta } }, select: PUBLIC_USER }),
  };
}

function createRefreshTokenRepository(db) {
  return {
    create: ({ fingerprint, userId, expiresAt }) =>
      db.refreshToken.create({ data: { empreinte: fingerprint, utilisateurId: userId, expireLe: expiresAt } }),
    findActive: (fingerprint) =>
      db.refreshToken.findFirst({
        where: { empreinte: fingerprint, revoqueLe: null, expireLe: { gt: new Date() } },
        include: { utilisateur: { select: { id: true, role: true } } },
      }),
    // Révocation conditionnelle : deux rafraîchissements simultanés, un seul gagne.
    async revokeIfActive(id) {
      const { count } = await db.refreshToken.updateMany({ where: { id, revoqueLe: null }, data: { revoqueLe: new Date() } });
      return count === 1;
    },
  };
}

function createTaskRepository(db) {
  return {
    // Données et total en parallèle.
    async findPage({ where, skip, take }) {
      const [items, total] = await Promise.all([
        db.tache.findMany({ where, skip, take, orderBy: { id: "asc" } }),
        db.tache.count({ where }),
      ]);
      return { items, total };
    },

    findById: (id) => db.tache.findUnique({ where: { id } }),
    create: (data) => db.tache.create({ data }),
    update: (id, data) => db.tache.update({ where: { id }, data }),
    delete: (id) => db.tache.delete({ where: { id } }),

    async reassign(id, fromId, toId) {
      const { count } = await db.tache.updateMany({ where: { id, proprietaireId: fromId }, data: { proprietaireId: toId } });
      return count === 1;
    },

    countByStatus: (where) => db.tache.groupBy({ by: ["faite"], where, _count: { _all: true } }),

    findOldestOpen: (where) => db.tache.findFirst({ where: { ...where, faite: false }, orderBy: [{ creeLe: "asc" }, { id: "asc" }] }),

    // Lot suivant après le curseur, par identifiant croissant.
    findBatch: ({ where, afterId, take }) =>
      db.tache.findMany({
        where: afterId === undefined ? where : { ...where, id: { gt: afterId } },
        orderBy: { id: "asc" },
        take,
      }),
  };
}

function createRepositories(db) {
  return {
    users: createUserRepository(db),
    refreshTokens: createRefreshTokenRepository(db),
    tasks: createTaskRepository(db),
  };
}

// Point d'accès unique : dépôts du client courant et exécution transactionnelle.
export function createDataAccess(prisma) {
  return {
    repositories: createRepositories(prisma),
    transaction: (work) => prisma.$transaction((tx) => work(createRepositories(tx))),
  };
}
