import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  getDb,
  getDbInfo,
  getStorefrontData,
  createSaleTransaction,
  createSupplierPurchase,
  createRestockFromPurchase,
  createRefundFromSale,
  getAdminSchema,
  getAdminTableRows,
  insertAdminRow,
  updateAdminRow,
  deleteAdminRow,
  executeRawSql,
  exportSqlDump,
  exportUpdatesOnlySql,
  resetDatabase
} from "./db.mjs";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "../public");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "0417";
const SESSION_SECRET = process.env.SESSION_SECRET || `snapgear-hmac-${ADMIN_PASSWORD}-v1`;
const SESSION_COOKIE = "snapgear_admin_session";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".sql": "text/plain; charset=utf-8"
};

function makeSignedToken() {
  const payload = `admin:${Date.now()}`;
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verifySignedToken(token) {
  if (typeof token !== "string") return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function parseCookies(req) {
  const header = req.headers?.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

function isAdminAuthenticated(req) {
  const cookies = parseCookies(req);
  if (verifySignedToken(cookies[SESSION_COOKIE])) return true;
  const headerPw = req.headers?.["x-admin-password"];
  if (typeof headerPw === "string" && headerPw === ADMIN_PASSWORD) return true;
  return false;
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(body);
}

function sendError(res, statusCode, message, details = null) {
  sendJson(res, statusCode, { ok: false, error: message, details });
}

function requireAdmin(req, res) {
  if (!isAdminAuthenticated(req)) {
    sendError(res, 401, "Administrator authentication required.");
    return false;
  }
  return true;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  let total = 0;
  const maxBytes = 1024 * 1024;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Request body exceeds 1 MiB limit.");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON request body.");
  }
}

function serveStaticFile(res, relPath) {
  const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.join(PUBLIC_DIR, safePath);
  if (!fullPath.startsWith(PUBLIC_DIR) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }
  const ext = path.extname(fullPath).toLowerCase();
  const mime = MIME_TYPES[ext] || "application/octet-stream";
  const cacheControl = ext === ".jpg" || ext === ".png" || ext === ".svg" ? "public, max-age=3600" : "no-cache";
  res.writeHead(200, { "Content-Type": mime, "Cache-Control": cacheControl });
  fs.createReadStream(fullPath).pipe(res);
}

export async function handleRequest(req, res, { serveStatic = true } = {}) {
  try {
    getDb();
    const url = new URL(req.url || "/", `http://${req.headers?.host || "127.0.0.1"}`);
    const pathname = url.pathname;
    const method = req.method || "GET";
    const secureFlag = process.env.VERCEL ? "; Secure" : "";

    // ---- Public Storefront & D2C Checkout API ----
    if (pathname === "/api/storefront" && method === "GET") {
      return sendJson(res, 200, { ok: true, data: getStorefrontData() });
    }

    if (pathname === "/api/export-sql" && method === "GET") {
      const dump = exportUpdatesOnlySql();
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="snapgear-updates.sql"',
        "Cache-Control": "no-store"
      });
      res.end(dump);
      return;
    }

    if (pathname === "/api/export-db" && method === "GET") {
      const { dbPath } = getDbInfo();
      const bytes = fs.readFileSync(dbPath);
      res.writeHead(200, {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": 'attachment; filename="snapgear.db"',
        "Content-Length": String(bytes.length),
        "Cache-Control": "no-store"
      });
      res.end(bytes);
      return;
    }

    if (pathname === "/api/orders/sale" && method === "POST") {
      const body = await readJsonBody(req);
      const receipt = createSaleTransaction({
        customerId: body.customer_id,
        newCustomerName: body.new_customer_name,
        items: body.items,
        orderDate: body.order_date
      });
      return sendJson(res, 201, { ok: true, receipt, storefront: getStorefrontData() });
    }

    // ---- Admin Authentication API ----
    if (pathname === "/api/admin/auth" && method === "GET") {
      return sendJson(res, 200, { ok: true, authenticated: isAdminAuthenticated(req) });
    }

    if (pathname === "/api/admin/auth" && method === "POST") {
      const body = await readJsonBody(req);
      if (String(body.password ?? "") !== ADMIN_PASSWORD) {
        return sendError(res, 401, "Incorrect administrator password. Please try again.");
      }
      const token = makeSignedToken();
      return sendJson(
        res,
        200,
        { ok: true, authenticated: true },
        { "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/${secureFlag}` }
      );
    }

    if (pathname === "/api/admin/logout" && method === "POST") {
      return sendJson(
        res,
        200,
        { ok: true, authenticated: false },
        { "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}` }
      );
    }

    // ---- Protected Back-Office Order Mutations ----
    if (pathname === "/api/orders/purchase" && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const body = await readJsonBody(req);
      const result = createSupplierPurchase({
        supplierId: body.supplier_id,
        items: body.items,
        orderDate: body.order_date
      });
      return sendJson(res, 201, { ok: true, result, storefront: getStorefrontData() });
    }

    if (pathname === "/api/orders/restock" && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const body = await readJsonBody(req);
      const result = createRestockFromPurchase({
        relatedOrderId: body.related_order_id,
        orderDate: body.order_date
      });
      return sendJson(res, 201, { ok: true, result, storefront: getStorefrontData() });
    }

    if (pathname === "/api/orders/refund" && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const body = await readJsonBody(req);
      const result = createRefundFromSale({
        relatedOrderId: body.related_order_id,
        orderDate: body.order_date
      });
      return sendJson(res, 201, { ok: true, result, storefront: getStorefrontData() });
    }

    // ---- Protected SQL Admin Panel API ----
    if (pathname === "/api/admin/schema" && method === "GET") {
      if (!requireAdmin(req, res)) return;
      return sendJson(res, 200, { ok: true, schema: getAdminSchema() });
    }

    const tableMatch = pathname.match(/^\/api\/admin\/tables\/([A-Za-z0-9_]+)(\/rows)?$/);
    if (tableMatch) {
      if (!requireAdmin(req, res)) return;
      const tableName = decodeURIComponent(tableMatch[1]);
      if (method === "GET") return sendJson(res, 200, { ok: true, data: getAdminTableRows(tableName) });
      if (method === "POST") {
        const body = await readJsonBody(req);
        const result = insertAdminRow(tableName, body.row || body);
        return sendJson(res, 201, { ok: true, result, table: getAdminTableRows(tableName), storefront: getStorefrontData() });
      }
      if (method === "PUT") {
        const body = await readJsonBody(req);
        const result = updateAdminRow(tableName, body.pk || {}, body.row || {});
        return sendJson(res, 200, { ok: true, result, table: getAdminTableRows(tableName), storefront: getStorefrontData() });
      }
      if (method === "DELETE") {
        const body = await readJsonBody(req);
        const result = deleteAdminRow(tableName, body.pk || {});
        return sendJson(res, 200, { ok: true, result, table: getAdminTableRows(tableName), storefront: getStorefrontData() });
      }
    }

    if (pathname === "/api/admin/sql" && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const body = await readJsonBody(req);
      const execution = executeRawSql(body.sql);
      return sendJson(res, 200, { ok: true, execution, schema: getAdminSchema(), storefront: getStorefrontData() });
    }

    if (pathname === "/api/admin/export-sql" && method === "GET") {
      if (!requireAdmin(req, res)) return;
      const dump = exportSqlDump();
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="snapgear-camera-store.sql"',
        "Cache-Control": "no-store"
      });
      res.end(dump);
      return;
    }

    if (pathname === "/api/admin/reset" && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const storefront = resetDatabase();
      return sendJson(res, 200, { ok: true, storefront, schema: getAdminSchema() });
    }

    if (!serveStatic) {
      return sendError(res, 404, `Unknown API endpoint: ${pathname}`);
    }

    if (pathname === "/" || pathname === "/town" || pathname === "/home" || pathname === "/sony" || pathname === "/gear" || pathname === "/catalog" || pathname === "/admin" || pathname === "/admin/") {
      return serveStaticFile(res, "index.html");
    }
    return serveStaticFile(res, pathname.replace(/^\//, ""));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = /not found|unknown table/i.test(msg) ? 404 : 400;
    return sendError(res, status, msg);
  }
}
