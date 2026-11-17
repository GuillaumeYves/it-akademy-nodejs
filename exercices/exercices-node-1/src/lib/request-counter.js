// Gestionnaire HTTP qui compte les requêtes reçues depuis le démarrage.
export function createRequestCounterHandler() {
  let count = 0;

  return (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");

    if (pathname === "/reset") {
      count = 0;
      res.writeHead(204).end();
      return;
    }

    count += 1;
    const body = JSON.stringify({
      requests: count,
      uptimeSeconds: Math.round(process.uptime()),
    });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }).end(body);
  };
}
