// Point d'entrée : démarre le serveur sur le port de PORT (3000 par défaut).
import { createApp } from "./app.js";
import { config } from "./config.js";

createApp(config).listen(config.port, () => {
  console.log(`API à l'écoute sur http://localhost:${config.port}`);
});
