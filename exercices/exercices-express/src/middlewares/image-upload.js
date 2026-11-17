import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import multer from "multer";
import { HttpError } from "../errors.js";

const EXTENSIONS = { "image/png": ".png", "image/jpeg": ".jpg" };

// Téléversement d'une image PNG ou JPEG, nom de fichier généré.
export function imageUpload({ directory, maxBytes }) {
  mkdirSync(directory, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: directory,
      filename: (req, file, callback) => callback(null, randomUUID() + EXTENSIONS[file.mimetype]),
    }),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (req, file, callback) => {
      if (EXTENSIONS[file.mimetype]) callback(null, true);
      else callback(new HttpError(400, "Seuls les formats PNG et JPEG sont acceptés"));
    },
  }).single("image");
}
