import http from "node:http";
import { getDb, getDbInfo } from "./lib/db.mjs";
import { handleRequest } from "./lib/handler.mjs";

const PORT = Number(process.env.PORT || 3838);
const HOST = process.env.HOST || "127.0.0.1";

getDb();

const server = http.createServer((req, res) => {
  handleRequest(req, res, { serveStatic: true });
});

server.listen(PORT, HOST, () => {
  const { dbPath } = getDbInfo();
  console.log(`SnapGear Camera Store running at http://${HOST}:${PORT}`);
  console.log(`  Storefront + Pixel Town : http://${HOST}:${PORT}/`);
  console.log(`  SQL Admin Panel         : http://${HOST}:${PORT}/admin (Password protected)`);
  console.log(`  SQLite Database         : ${dbPath}`);
});
