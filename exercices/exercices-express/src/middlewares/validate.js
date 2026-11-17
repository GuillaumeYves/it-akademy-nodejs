import { HttpError } from "../errors.js";

// Transforme les problèmes Zod en liste lisible de champs fautifs.
function toFieldErrors(issues, source) {
  return issues.map((issue) => ({
    champ: [source, ...issue.path].join("."),
    message: issue.message,
  }));
}

// Valide body, params et query, puis expose les valeurs nettoyées dans req.valid.
export function validate(schemas) {
  return (req, res, next) => {
    req.valid ??= {};
    const errors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[source] ?? {});
      if (result.success) req.valid[source] = result.data;
      else errors.push(...toFieldErrors(result.error.issues, source));
    }

    if (errors.length > 0) {
      next(new HttpError(400, "Données invalides", errors));
      return;
    }
    next();
  };
}
