// Champs exposables d'un compte : jamais l'empreinte du mot de passe.
export const PUBLIC_USER = { id: true, email: true, role: true, creeLe: true };

// Accès aux comptes.
export function createUserRepository(db) {
  return {
    create: (data) => db.utilisateur.create({ data, select: PUBLIC_USER }),
    findById: (id) => db.utilisateur.findUnique({ where: { id }, select: PUBLIC_USER }),
    exists: async (id) => (await db.utilisateur.count({ where: { id } })) > 0,

    // Seul accès à l'empreinte, réservé à la vérification du mot de passe.
    findCredentialsByEmail: (email) => db.utilisateur.findUnique({ where: { email } }),
  };
}
