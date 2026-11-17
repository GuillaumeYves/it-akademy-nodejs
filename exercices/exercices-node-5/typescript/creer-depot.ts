// Exercice 4 : dépôt typé en strict, sans any. Les types viennent du client Prisma généré.
import type { Prisma, PrismaClient, Tache } from "../prisma/generated/client.ts";

export function creerDepot(prisma: PrismaClient) {
  return {
    lister: (page: number, limite: number): Promise<Tache[]> =>
      prisma.tache.findMany({ skip: (page - 1) * limite, take: limite }),

    trouver: (id: number): Promise<Tache | null> => prisma.tache.findUnique({ where: { id } }),

    // Type d'entrée généré : les champs inconnus ou mal typés sont refusés à la compilation.
    creer: (donnees: Prisma.TacheCreateInput): Promise<Tache> => prisma.tache.create({ data: donnees }),
  };
}

export type Depot = ReturnType<typeof creerDepot>;
