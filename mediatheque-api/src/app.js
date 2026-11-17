import express from "express";
import { authenticate } from "./middlewares/authenticate.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { requestLogger } from "./middlewares/request-logger.js";
import { corsPolicy, rateLimiter, securityHeaders } from "./middlewares/security.js";
import { createDataAccess } from "./repositories/index.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createBooksRouter } from "./routes/books.routes.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createLoansRouter } from "./routes/loans.routes.js";
import { createPasswordHasher } from "./security/password.js";
import { createTokenService } from "./security/tokens.js";
import { createAuthService } from "./services/auth.service.js";
import { createBookService } from "./services/book.service.js";
import { createLoanService } from "./services/loan.service.js";

// Assemble l'application à partir d'un client Prisma et d'une configuration, sans démarrer de serveur.
export function createApp({ prisma, config }) {
  const dataAccess = createDataAccess(prisma);
  const tokenService = createTokenService(config.auth);
  const authService = createAuthService({
    dataAccess,
    passwordHasher: createPasswordHasher({ cost: config.auth.bcryptCost }),
    tokenService,
  });
  const bookService = createBookService(dataAccess);
  const loanService = createLoanService(dataAccess);
  const requireAuth = authenticate(tokenService);

  const app = express();
  app.set("trust proxy", config.trustProxy);

  // Durcissement appliqué avant toute route.
  app.use(securityHeaders());
  app.use(corsPolicy(config.corsOrigins));
  app.use(rateLimiter({ max: config.rateLimit.globalMax, windowMs: config.rateLimit.globalWindowMs }));
  app.use(requestLogger);
  app.use(express.json({ limit: config.bodyLimit }));

  app.use("/sante", createHealthRouter({ prisma }));
  app.use(
    "/api/auth",
    rateLimiter({ max: config.rateLimit.authMax, windowMs: config.rateLimit.authWindowMs }),
    createAuthRouter({ authService, authenticate: requireAuth }),
  );
  app.use("/api/ouvrages", requireAuth, createBooksRouter({ bookService }));
  app.use("/api/emprunts", requireAuth, createLoansRouter({ loanService }));

  // 404 après toutes les routes, gestionnaire d'erreurs en dernier.
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
