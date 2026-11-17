import express from "express";
import { config as defaultConfig } from "./config.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { imageUpload } from "./middlewares/image-upload.js";
import { requestLogger } from "./middlewares/request-logger.js";
import { createMemoryRepository } from "./repositories/memory-repository.js";
import { createProductsRouter } from "./routes/products.routes.js";
import { createProductService } from "./services/product.service.js";

const UPLOADS_PATH = "/uploads";

// Assemble l'application sans démarrer le serveur, pour pouvoir la tester.
export function createApp(config = defaultConfig) {
  const productService = createProductService({
    products: createMemoryRepository(),
    reviews: createMemoryRepository(),
  });
  const upload = {
    middleware: imageUpload({ directory: config.uploadDir, maxBytes: config.uploadMaxBytes }),
    publicPath: UPLOADS_PATH,
  };

  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use(UPLOADS_PATH, express.static(config.uploadDir));

  app.get("/sante", (req, res) => res.json({ statut: "ok" }));
  app.use("/api/produits", createProductsRouter({ productService, apiKey: config.apiKey, upload }));

  // L'ordre compte : 404 après les routes, gestionnaire d'erreurs en dernier.
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
