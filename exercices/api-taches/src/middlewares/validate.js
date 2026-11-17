import { badRequest } from "../erreurs.js";

const SOURCES = ["params", "query", "body"];

// Valide params, query et body avec des schémas Zod ; les valeurs nettoyées vont dans req.valid.
export function validate(schemas) {
  return (req, res, next) => {
    req.valid ??= {};
    const errors = [];

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;
      const result = schema.safeParse(req[source] ?? {});
      if (result.success) req.valid[source] = result.data;
      else {
        errors.push(...result.error.issues.map((issue) => ({ champ: [source, ...issue.path].join("."), message: issue.message })));
      }
    }

    next(errors.length > 0 ? badRequest("Données invalides", errors) : undefined);
  };
}
