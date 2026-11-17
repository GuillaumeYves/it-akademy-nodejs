import { resolve } from "node:path";

// Configuration lue une seule fois depuis l'environnement.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  apiKey: process.env.API_KEY,
  uploadDir: resolve(process.env.UPLOAD_DIR ?? "uploads"),
  uploadMaxBytes: 500 * 1024,
};
