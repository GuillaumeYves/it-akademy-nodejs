import { isLibrarian } from "../domain/roles.ts";
import type { AuthUser } from "../domain/types.ts";
import { forbidden, notFound } from "../erreurs.ts";
import type { UserRepository } from "../repositories/user.repository.ts";

// Un bibliothécaire agit sur tout ; un membre seulement sur ce qui lui appartient.
export function assertOwnerOrLibrarian(ownerId: number, actor: AuthUser, message: string): void {
  if (!isLibrarian(actor) && ownerId !== actor.id) throw forbidden(message);
}

// Filtre de liste : un membre ne voit que ses propres lignes.
export function ownerScope(actor: AuthUser): number | undefined {
  return isLibrarian(actor) ? undefined : actor.id;
}

// Compte bénéficiaire : soi-même, ou le membre désigné par un bibliothécaire.
export async function resolveBeneficiary(
  requestedId: number | undefined,
  actor: AuthUser,
  users: UserRepository,
): Promise<number> {
  if (!isLibrarian(actor) || requestedId === undefined) return actor.id;
  if (!(await users.exists(requestedId))) throw notFound("Membre introuvable");
  return requestedId;
}
