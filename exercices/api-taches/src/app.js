import express from "express";
import helmet from "helmet";
import { authenticate } from "./middlewares/authenticate.js";
import { errorHandler, notFoundHandler, rateLimiter, requestLogger } from "./middlewares/http.js";
import { createProprietaireOuRole } from "./middlewares/proprietaire-ou-role.js";
import { createDataAccess } from "./repositories/index.js";
import { authRoutes } from "./routes/auth.routes.js";
import { taskRoutes } from "./routes/tasks.routes.js";
import { createPasswordHasher } from "./security/password.js";
import { createTokenService } from "./security/tokens.js";
import { createAuthService } from "./services/auth.service.js";
import { createTaskService } from "./services/task.service.js";

// Assemble l'application sans démarrer de serveur : les tests créent la leur.
export function createApp({ prisma, config }) {
  const dataAccess = createDataAccess(prisma);
  const tokenService = createTokenService(config.auth);
  const authService = createAuthService({
    dataAccess,
    passwordHasher: createPasswordHasher({ cost: config.auth.bcryptCost }),
    tokenService,
  });
  const taskService = createTaskService(dataAccess);
  const proprietaireOuRole = createProprietaireOuRole(dataAccess.repositories.tasks);

  const app = express();
  app.use(helmet());
  app.use(requestLogger);
  app.use(express.json({ limit: config.bodyLimit }));

  app.get("/sante", (req, res) => {
    res.json({ statut: "ok" });
  });
  app.use("/api/auth", rateLimiter({ max: config.rateLimit.authMax, windowMs: config.rateLimit.authWindowMs }), authRoutes({ authService }));
  app.use("/api/taches", authenticate(tokenService), taskRoutes({ taskService, proprietaireOuRole }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
