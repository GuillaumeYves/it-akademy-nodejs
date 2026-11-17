// Seeder rejouable : comptes par upsert, tâches à identifiant fixe, compteurs recalculés.
import "dotenv/config";
import bcrypt from "bcrypt";
import { createPrismaClient } from "../src/db/prisma.js";

const TASK_COUNT = 1200;
const DAY_MS = 24 * 60 * 60 * 1000;
const TITLES = [
  "Préparer la réunion d'équipe",
  "Relire le rapport mensuel",
  "Mettre à jour la documentation",
  "Corriger le bug de connexion",
  "Planifier le sprint",
  "Répondre aux courriels",
];

// Mots de passe factices, documentés dans le README.
const USERS = [
  { email: "admin@example.net", motDePasse: "Demo-Admin-2026!", role: "admin" },
  { email: "alice@example.net", motDePasse: "Demo-Alice-2026!", role: "membre" },
  { email: "bob@example.net", motDePasse: "Demo-Bob-2026!", role: "membre" },
];

const prisma = createPrismaClient(process.env.DATABASE_URL);

async function seed() {
  const ids = [];
  for (const { email, motDePasse, role } of USERS) {
    const motDePasseHache = await bcrypt.hash(motDePasse, 12);
    const user = await prisma.utilisateur.upsert({ where: { email }, update: {}, create: { email, motDePasseHache, role } });
    ids.push(user.id);
  }

  // Assez de tâches pour que l'export CSV parcoure plusieurs lots de 500.
  const tasks = Array.from({ length: TASK_COUNT }, (_, index) => ({
    id: index + 1,
    titre: `${TITLES[index % TITLES.length]} n° ${index + 1}`,
    // Modulo différent du propriétaire : chaque compte a des tâches faites et ouvertes.
    faite: index % 4 === 0,
    proprietaireId: ids[index % ids.length],
    creeLe: new Date(Date.now() - (TASK_COUNT - index) * DAY_MS / 10),
  }));
  await prisma.tache.createMany({ data: tasks, skipDuplicates: true });
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Tache"', 'id'), (SELECT MAX(id) FROM "Tache"))`);

  // Le compteur découle des tâches réellement ouvertes en base.
  for (const id of ids) {
    const open = await prisma.tache.count({ where: { proprietaireId: id, faite: false } });
    await prisma.utilisateur.update({ where: { id }, data: { tachesEnCours: open } });
  }
  console.log(`Seed terminé : ${USERS.length} comptes, ${TASK_COUNT} tâches.`);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
