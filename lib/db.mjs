import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { resolveProductMeta, STORE_SERVICES } from "./product-meta.mjs";

const DATA_DIR = path.resolve(import.meta.dirname, "../data");
const DB_PATH = process.env.VERCEL ? "/tmp/snapgear.db" : path.join(DATA_DIR, "snapgear.db");
const SCHEMA_PATH = path.join(DATA_DIR, "schema.sql");

let dbInstance = null;

function openDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const needsSeed = !fs.existsSync(DB_PATH) || fs.statSync(DB_PATH).size === 0;
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  if (needsSeed) {
    const seedSql = fs.readFileSync(SCHEMA_PATH, "utf8");
    db.exec(seedSql);
  }
  return db;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = openDb();
  }
  return dbInstance;
}

export function getDbInfo() {
  return {
    dbPath: DB_PATH,
    schemaPath: SCHEMA_PATH
  };
}

function toPlainValue(v) {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Uint8Array) return Buffer.from(v).toString("hex");
  return v;
}

function normalizeRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = toPlainValue(v);
  }
  return out;
}

function nextId(db, table, idCol) {
  const row = db.prepare(`SELECT COALESCE(MAX(${idCol}), 0) + 1 AS next_id FROM ${table}`).get();
  return Number(row.next_id);
}

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getStorefrontData() {
  const db = getDb();

  const rawProducts = db
    .prepare(
      `SELECT
        p.product_id,
        p.name,
        p.price,
        p.supplier_id,
        s.name AS supplier_name,
        COALESCE((SELECT SUM(sc.quantity_change) FROM stock_changes sc WHERE sc.product_id = p.product_id), 0) AS stock,
        COALESCE((
          SELECT SUM(oi.quantity)
          FROM order_items oi
          JOIN orders o ON o.order_id = oi.order_id
          WHERE oi.product_id = p.product_id AND o.order_type = 'S'
        ), 0) AS units_sold
      FROM products p
      LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
      ORDER BY p.product_id ASC`
    )
    .all()
    .map(normalizeRow);

  const products = rawProducts.map((p) => {
    const meta = resolveProductMeta(p);
    return {
      ...p,
      price: Number(p.price),
      stock: Number(p.stock),
      units_sold: Number(p.units_sold),
      meta
    };
  });

  const customers = db
    .prepare(
      `SELECT
        c.customer_id,
        c.name,
        COUNT(DISTINCT CASE WHEN o.order_type = 'S' THEN o.order_id END) AS sale_count,
        COUNT(DISTINCT CASE WHEN o.order_type = 'F' THEN o.order_id END) AS refund_count,
        COALESCE(SUM(CASE WHEN o.order_type = 'S' THEN oi.quantity * oi.unit_price ELSE 0 END), 0) AS gross_spent
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.order_id
      GROUP BY c.customer_id, c.name
      ORDER BY c.customer_id ASC`
    )
    .all()
    .map(normalizeRow);

  const suppliers = db
    .prepare(
      `SELECT
        s.supplier_id,
        s.name,
        COUNT(p.product_id) AS product_count
      FROM suppliers s
      LEFT JOIN products p ON p.supplier_id = s.supplier_id
      GROUP BY s.supplier_id, s.name
      ORDER BY s.supplier_id ASC`
    )
    .all()
    .map(normalizeRow);

  const orders = db
    .prepare(
      `SELECT
        o.order_id,
        o.order_type,
        o.order_date,
        o.customer_id,
        c.name AS customer_name,
        o.supplier_id,
        s.name AS supplier_name,
        o.related_order_id,
        COALESCE((SELECT SUM(oi.quantity * oi.unit_price) FROM order_items oi WHERE oi.order_id = o.order_id), 0) AS total_amount
      FROM orders o
      LEFT JOIN customers c ON c.customer_id = o.customer_id
      LEFT JOIN suppliers s ON s.supplier_id = o.supplier_id
      ORDER BY o.order_id DESC`
    )
    .all()
    .map(normalizeRow);

  const itemsByOrder = new Map();
  const allItems = db
    .prepare(
      `SELECT
        oi.item_id,
        oi.order_id,
        oi.product_id,
        p.name AS product_name,
        oi.quantity,
        oi.unit_price
      FROM order_items oi
      LEFT JOIN products p ON p.product_id = oi.product_id
      ORDER BY oi.item_id ASC`
    )
    .all()
    .map(normalizeRow);

  for (const item of allItems) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id).push(item);
  }

  const enrichedOrders = orders.map((o) => ({
    ...o,
    total_amount: Number(o.total_amount),
    items: itemsByOrder.get(o.order_id) || []
  }));

  const stockLedger = db
    .prepare(
      `SELECT
        sc.change_id,
        sc.order_id,
        o.order_type,
        o.order_date,
        sc.product_id,
        p.name AS product_name,
        sc.quantity_change
      FROM stock_changes sc
      LEFT JOIN products p ON p.product_id = sc.product_id
      LEFT JOIN orders o ON o.order_id = sc.order_id
      ORDER BY sc.change_id DESC`
    )
    .all()
    .map(normalizeRow);

  const totalInventoryUnits = products.reduce((acc, p) => acc + Math.max(0, p.stock), 0);
  const netSalesRevenue = enrichedOrders.reduce((acc, o) => {
    if (o.order_type === "S") return acc + o.total_amount;
    if (o.order_type === "F") return acc - o.total_amount;
    return acc;
  }, 0);

  return {
    business: {
      name: "SnapGear Camera Store",
      currency: "NTD",
      currencySymbol: "NT$",
      tagline: "Direct-to-Consumer Camera Accessories & Photography Gear",
      sources: ["Sony Taiwan Store", "CameraKing", "CameraPro", "IPIX Camera"]
    },
    stats: {
      productCount: products.length,
      totalInventoryUnits,
      customerCount: customers.length,
      supplierCount: suppliers.length,
      orderCount: enrichedOrders.length,
      netSalesRevenue
    },
    products,
    customers,
    suppliers,
    orders: enrichedOrders,
    stockLedger,
    services: STORE_SERVICES
  };
}

export function createSaleTransaction({ customerId, newCustomerName, items, orderDate }) {
  const db = getDb();
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order must contain at least one product.");
  }

  const cleanDate = orderDate && /^\d{4}-\d{2}-\d{2}$/.test(orderDate) ? orderDate : todayIsoDate();
  const executedSql = [];

  db.exec("BEGIN IMMEDIATE;");
  try {
    let resolvedCustomerId = customerId != null && customerId !== "" ? Number(customerId) : null;
    let customerName = "";

    if (newCustomerName && String(newCustomerName).trim()) {
      const trimmed = String(newCustomerName).trim().slice(0, 50);
      resolvedCustomerId = nextId(db, "customers", "customer_id");
      db.prepare("INSERT INTO customers (customer_id, name) VALUES (?, ?)").run(resolvedCustomerId, trimmed);
      customerName = trimmed;
      executedSql.push(`INSERT INTO customers VALUES (${resolvedCustomerId}, '${trimmed.replace(/'/g, "''")}');`);
    } else {
      if (!Number.isFinite(resolvedCustomerId)) {
        throw new Error("Please select an existing customer or enter a new customer name.");
      }
      const cust = db.prepare("SELECT customer_id, name FROM customers WHERE customer_id = ?").get(resolvedCustomerId);
      if (!cust) {
        throw new Error(`Customer #${resolvedCustomerId} does not exist in database.`);
      }
      customerName = cust.name;
    }

    // Aggregate quantities per product_id so duplicate lines don't bypass stock checks
    const qtyByProduct = new Map();
    for (const rawItem of items) {
      const pid = Number(rawItem.product_id);
      const qty = Math.floor(Number(rawItem.quantity));
      if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) {
        throw new Error("Invalid product ID or quantity.");
      }
      qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + qty);
    }

    const verifiedItems = [];
    for (const [pid, qty] of qtyByProduct.entries()) {
      const prod = db
        .prepare(
          `SELECT p.product_id, p.name, p.price,
                  COALESCE((SELECT SUM(quantity_change) FROM stock_changes WHERE product_id = p.product_id), 0) AS stock
           FROM products p WHERE p.product_id = ?`
        )
        .get(pid);
      if (!prod) {
        throw new Error(`Product #${pid} was not found in SQLite products table.`);
      }
      const currentStock = Number(prod.stock);
      if (qty > currentStock) {
        throw new Error(`Insufficient stock for ${prod.name}: requested ${qty}, available ${currentStock}.`);
      }
      verifiedItems.push({
        product_id: Number(prod.product_id),
        name: prod.name,
        quantity: qty,
        unit_price: Number(prod.price),
        remaining_stock: currentStock - qty
      });
    }

    const orderId = nextId(db, "orders", "order_id");
    db.prepare(
      "INSERT INTO orders (order_id, order_type, order_date, customer_id, supplier_id, related_order_id) VALUES (?, 'S', ?, ?, NULL, NULL)"
    ).run(orderId, cleanDate, resolvedCustomerId);
    executedSql.push(`INSERT INTO orders VALUES (${orderId}, 'S', '${cleanDate}', ${resolvedCustomerId}, NULL, NULL);`);

    let nextItemId = nextId(db, "order_items", "item_id");
    let nextChangeId = nextId(db, "stock_changes", "change_id");

    const insertItemStmt = db.prepare(
      "INSERT INTO order_items (item_id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)"
    );
    const insertStockStmt = db.prepare(
      "INSERT INTO stock_changes (change_id, order_id, product_id, quantity_change) VALUES (?, ?, ?, ?)"
    );

    let totalAmount = 0;
    for (const item of verifiedItems) {
      insertItemStmt.run(nextItemId, orderId, item.product_id, item.quantity, item.unit_price);
      executedSql.push(
        `INSERT INTO order_items VALUES (${nextItemId}, ${orderId}, ${item.product_id}, ${item.quantity}, ${item.unit_price});`
      );
      insertStockStmt.run(nextChangeId, orderId, item.product_id, -item.quantity);
      executedSql.push(
        `INSERT INTO stock_changes VALUES (${nextChangeId}, ${orderId}, ${item.product_id}, ${-item.quantity});`
      );
      totalAmount += item.quantity * item.unit_price;
      nextItemId++;
      nextChangeId++;
    }

    db.exec("COMMIT;");
    return {
      order_id: orderId,
      order_type: "S",
      order_date: cleanDate,
      customer_id: resolvedCustomerId,
      customer_name: customerName,
      items: verifiedItems,
      total_amount: totalAmount,
      executed_sql: executedSql
    };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

export function createSupplierPurchase({ supplierId, items, orderDate }) {
  const db = getDb();
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Purchase order requires at least one product.");
  }
  const cleanDate = orderDate && /^\d{4}-\d{2}-\d{2}$/.test(orderDate) ? orderDate : todayIsoDate();
  const executedSql = [];

  db.exec("BEGIN IMMEDIATE;");
  try {
    const sid = Number(supplierId);
    const sup = db.prepare("SELECT supplier_id, name FROM suppliers WHERE supplier_id = ?").get(sid);
    if (!sup) throw new Error(`Supplier #${sid} not found.`);

    const orderId = nextId(db, "orders", "order_id");
    db.prepare(
      "INSERT INTO orders (order_id, order_type, order_date, customer_id, supplier_id, related_order_id) VALUES (?, 'P', ?, NULL, ?, NULL)"
    ).run(orderId, cleanDate, sid);
    executedSql.push(`INSERT INTO orders VALUES (${orderId}, 'P', '${cleanDate}', NULL, ${sid}, NULL);`);

    let itemId = nextId(db, "order_items", "item_id");
    const stmt = db.prepare(
      "INSERT INTO order_items (item_id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)"
    );

    for (const raw of items) {
      const pid = Number(raw.product_id);
      const qty = Math.floor(Number(raw.quantity));
      const unitCost = Number(raw.unit_price);
      if (!Number.isFinite(pid) || qty <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
        throw new Error("Invalid purchase item values.");
      }
      stmt.run(itemId, orderId, pid, qty, unitCost);
      executedSql.push(`INSERT INTO order_items VALUES (${itemId}, ${orderId}, ${pid}, ${qty}, ${unitCost});`);
      itemId++;
    }

    db.exec("COMMIT;");
    return { order_id: orderId, order_type: "P", supplier_id: sid, supplier_name: sup.name, executed_sql: executedSql };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

export function createRestockFromPurchase({ relatedOrderId, orderDate }) {
  const db = getDb();
  const cleanDate = orderDate && /^\d{4}-\d{2}-\d{2}$/.test(orderDate) ? orderDate : todayIsoDate();
  const executedSql = [];

  db.exec("BEGIN IMMEDIATE;");
  try {
    const rid = Number(relatedOrderId);
    const po = db.prepare("SELECT * FROM orders WHERE order_id = ? AND order_type = 'P'").get(rid);
    if (!po) throw new Error(`Purchase order #${rid} (order_type='P') not found.`);

    const poItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(rid).map(normalizeRow);
    if (poItems.length === 0) throw new Error(`Purchase order #${rid} has no items.`);

    const orderId = nextId(db, "orders", "order_id");
    db.prepare(
      "INSERT INTO orders (order_id, order_type, order_date, customer_id, supplier_id, related_order_id) VALUES (?, 'R', ?, NULL, ?, ?)"
    ).run(orderId, cleanDate, po.supplier_id, rid);
    executedSql.push(`INSERT INTO orders VALUES (${orderId}, 'R', '${cleanDate}', NULL, ${po.supplier_id}, ${rid});`);

    let itemId = nextId(db, "order_items", "item_id");
    let changeId = nextId(db, "stock_changes", "change_id");
    const itemStmt = db.prepare(
      "INSERT INTO order_items (item_id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)"
    );
    const stockStmt = db.prepare(
      "INSERT INTO stock_changes (change_id, order_id, product_id, quantity_change) VALUES (?, ?, ?, ?)"
    );

    for (const item of poItems) {
      itemStmt.run(itemId, orderId, item.product_id, item.quantity, item.unit_price);
      executedSql.push(
        `INSERT INTO order_items VALUES (${itemId}, ${orderId}, ${item.product_id}, ${item.quantity}, ${item.unit_price});`
      );
      stockStmt.run(changeId, orderId, item.product_id, item.quantity);
      executedSql.push(`INSERT INTO stock_changes VALUES (${changeId}, ${orderId}, ${item.product_id}, ${item.quantity});`);
      itemId++;
      changeId++;
    }

    db.exec("COMMIT;");
    return { order_id: orderId, order_type: "R", related_order_id: rid, executed_sql: executedSql };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

export function createRefundFromSale({ relatedOrderId, orderDate }) {
  const db = getDb();
  const cleanDate = orderDate && /^\d{4}-\d{2}-\d{2}$/.test(orderDate) ? orderDate : todayIsoDate();
  const executedSql = [];

  db.exec("BEGIN IMMEDIATE;");
  try {
    const rid = Number(relatedOrderId);
    const sale = db.prepare("SELECT * FROM orders WHERE order_id = ? AND order_type = 'S'").get(rid);
    if (!sale) throw new Error(`Sale order #${rid} (order_type='S') not found.`);

    const existingRefund = db.prepare("SELECT order_id FROM orders WHERE related_order_id = ? AND order_type = 'F'").get(rid);
    if (existingRefund) {
      throw new Error(`Sale #${rid} has already been refunded by Refund Order #${existingRefund.order_id}.`);
    }

    const saleItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(rid).map(normalizeRow);
    if (saleItems.length === 0) throw new Error(`Sale order #${rid} has no items.`);

    const orderId = nextId(db, "orders", "order_id");
    db.prepare(
      "INSERT INTO orders (order_id, order_type, order_date, customer_id, supplier_id, related_order_id) VALUES (?, 'F', ?, ?, NULL, ?)"
    ).run(orderId, cleanDate, sale.customer_id, rid);
    executedSql.push(`INSERT INTO orders VALUES (${orderId}, 'F', '${cleanDate}', ${sale.customer_id}, NULL, ${rid});`);

    let itemId = nextId(db, "order_items", "item_id");
    let changeId = nextId(db, "stock_changes", "change_id");
    const itemStmt = db.prepare(
      "INSERT INTO order_items (item_id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)"
    );
    const stockStmt = db.prepare(
      "INSERT INTO stock_changes (change_id, order_id, product_id, quantity_change) VALUES (?, ?, ?, ?)"
    );

    for (const item of saleItems) {
      itemStmt.run(itemId, orderId, item.product_id, item.quantity, item.unit_price);
      executedSql.push(
        `INSERT INTO order_items VALUES (${itemId}, ${orderId}, ${item.product_id}, ${item.quantity}, ${item.unit_price});`
      );
      stockStmt.run(changeId, orderId, item.product_id, item.quantity);
      executedSql.push(`INSERT INTO stock_changes VALUES (${changeId}, ${orderId}, ${item.product_id}, ${item.quantity});`);
      itemId++;
      changeId++;
    }

    db.exec("COMMIT;");
    return { order_id: orderId, order_type: "F", related_order_id: rid, executed_sql: executedSql };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

// =========================================================================
// SQL ADMIN PANEL (Schema inspection, Visual CRUD, Raw SQL Console, Dump/Reset)
// =========================================================================

function quoteIdent(ident) {
  return `"${String(ident).replace(/"/g, '""')}"`;
}

function getAllowedTables(db) {
  return db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid ASC")
    .all()
    .map(normalizeRow);
}

function assertValidTable(db, tableName) {
  const tables = getAllowedTables(db);
  const found = tables.find((t) => t.name === tableName);
  if (!found) {
    throw new Error(`Unknown table: ${tableName}`);
  }
  return found;
}

export function getAdminSchema() {
  const db = getDb();
  const tables = getAllowedTables(db);
  return {
    dbPath: DB_PATH,
    tables: tables.map((t) => {
      const q = quoteIdent(t.name);
      const columns = db.prepare(`PRAGMA table_info(${q})`).all().map(normalizeRow);
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${q})`).all().map(normalizeRow);
      const countRow = db.prepare(`SELECT COUNT(*) AS count FROM ${q}`).get();
      return {
        name: t.name,
        sql: t.sql,
        rowCount: Number(countRow.count),
        columns,
        primaryKeys: columns.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name),
        foreignKeys
      };
    })
  };
}

export function getAdminTableRows(tableName) {
  const db = getDb();
  assertValidTable(db, tableName);
  const q = quoteIdent(tableName);
  const columns = db.prepare(`PRAGMA table_info(${q})`).all().map(normalizeRow);
  const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${q})`).all().map(normalizeRow);
  const pks = columns.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
  const orderClause = pks.length > 0 ? `ORDER BY ${pks.map(quoteIdent).join(", ")} ASC` : "";
  const rows = db.prepare(`SELECT * FROM ${q} ${orderClause}`).all().map(normalizeRow);
  return { table: tableName, columns, primaryKeys: pks, foreignKeys, rows };
}

function coerceColumnValue(colMeta, rawValue) {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return null;
  }
  const t = String(colMeta.type || "").toUpperCase();
  if (t.includes("NUM") || t.includes("INT") || t.includes("REAL") || t.includes("DEC") || t.includes("FLOAT")) {
    const n = Number(rawValue);
    if (Number.isFinite(n)) return n;
  }
  return String(rawValue);
}

export function insertAdminRow(tableName, data) {
  const db = getDb();
  assertValidTable(db, tableName);
  const q = quoteIdent(tableName);
  const columns = db.prepare(`PRAGMA table_info(${q})`).all().map(normalizeRow);
  const colMap = new Map(columns.map((c) => [c.name, c]));

  const cols = [];
  const vals = [];
  for (const col of columns) {
    if (Object.prototype.hasOwnProperty.call(data, col.name)) {
      const val = coerceColumnValue(col, data[col.name]);
      // Auto-assign numeric single primary key if left blank
      if (col.pk === 1 && val === null && String(col.type || "").toUpperCase().includes("NUM")) {
        cols.push(col.name);
        vals.push(nextId(db, q, quoteIdent(col.name)));
      } else {
        cols.push(col.name);
        vals.push(val);
      }
    } else if (col.pk === 1 && String(col.type || "").toUpperCase().includes("NUM")) {
      cols.push(col.name);
      vals.push(nextId(db, q, quoteIdent(col.name)));
    }
  }
  if (cols.length === 0) throw new Error("No valid columns supplied for insert.");
  const placeholders = cols.map(() => "?").join(", ");
  const sql = `INSERT INTO ${q} (${cols.map(quoteIdent).join(", ")}) VALUES (${placeholders})`;
  const res = db.prepare(sql).run(...vals);
  return { changes: Number(res.changes), lastInsertRowid: toPlainValue(res.lastInsertRowid), sql };
}

export function updateAdminRow(tableName, pkValues, data) {
  const db = getDb();
  assertValidTable(db, tableName);
  const q = quoteIdent(tableName);
  const columns = db.prepare(`PRAGMA table_info(${q})`).all().map(normalizeRow);
  const pks = columns.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
  if (pks.length === 0) throw new Error(`Table ${tableName} has no primary key; use the SQL Console to update it.`);

  const setCols = [];
  const setVals = [];
  for (const col of columns) {
    if (Object.prototype.hasOwnProperty.call(data, col.name)) {
      setCols.push(`${quoteIdent(col.name)} = ?`);
      setVals.push(coerceColumnValue(col, data[col.name]));
    }
  }
  if (setCols.length === 0) throw new Error("No fields provided to update.");

  const whereClauses = [];
  const whereVals = [];
  for (const pk of pks) {
    if (!Object.prototype.hasOwnProperty.call(pkValues, pk.name)) {
      throw new Error(`Missing primary key value for ${pk.name}.`);
    }
    whereClauses.push(`${quoteIdent(pk.name)} = ?`);
    whereVals.push(coerceColumnValue(pk, pkValues[pk.name]));
  }

  const sql = `UPDATE ${q} SET ${setCols.join(", ")} WHERE ${whereClauses.join(" AND ")}`;
  const res = db.prepare(sql).run(...setVals, ...whereVals);
  return { changes: Number(res.changes), sql };
}

export function deleteAdminRow(tableName, pkValues) {
  const db = getDb();
  assertValidTable(db, tableName);
  const q = quoteIdent(tableName);
  const columns = db.prepare(`PRAGMA table_info(${q})`).all().map(normalizeRow);
  const pks = columns.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
  if (pks.length === 0) throw new Error(`Table ${tableName} has no primary key; use the SQL Console to delete rows.`);

  const whereClauses = [];
  const whereVals = [];
  for (const pk of pks) {
    if (!Object.prototype.hasOwnProperty.call(pkValues, pk.name)) {
      throw new Error(`Missing primary key value for ${pk.name}.`);
    }
    whereClauses.push(`${quoteIdent(pk.name)} = ?`);
    whereVals.push(coerceColumnValue(pk, pkValues[pk.name]));
  }

  const sql = `DELETE FROM ${q} WHERE ${whereClauses.join(" AND ")}`;
  const res = db.prepare(sql).run(...whereVals);
  return { changes: Number(res.changes), sql };
}

function splitSqlStatements(sqlText) {
  const statements = [];
  let cur = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sqlText.length; i++) {
    const ch = sqlText[i];
    const next = sqlText[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        cur += ch;
      }
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (!inSingle && !inDouble) {
      if (ch === "-" && next === "-") {
        inLineComment = true;
        i++;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
    }

    if (ch === "'" && !inDouble) {
      cur += ch;
      if (inSingle && next === "'") {
        cur += next;
        i++;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }
    if (ch === '"' && !inSingle) {
      cur += ch;
      if (inDouble && next === '"') {
        cur += next;
        i++;
      } else {
        inDouble = !inDouble;
      }
      continue;
    }

    if (ch === ";" && !inSingle && !inDouble) {
      const trimmed = cur.trim();
      if (trimmed) statements.push(trimmed);
      cur = "";
    } else {
      cur += ch;
    }
  }
  const tail = cur.trim();
  if (tail) statements.push(tail);
  return statements;
}

export function executeRawSql(sqlText) {
  const db = getDb();
  const statements = splitSqlStatements(String(sqlText || ""));
  if (statements.length === 0) {
    throw new Error("SQL query is empty.");
  }

  const startedAt = performance.now();
  const results = [];

  for (const stmtSql of statements) {
    const t0 = performance.now();
    const stmt = db.prepare(stmtSql);
    const cols = typeof stmt.columns === "function" ? stmt.columns() : [];
    const returnsRows = cols.length > 0 || /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(stmtSql);

    if (returnsRows) {
      const rows = stmt.all().map(normalizeRow);
      const colNames = cols.length > 0 ? cols.map((c) => c.name) : rows.length > 0 ? Object.keys(rows[0]) : [];
      results.push({
        sql: stmtSql,
        kind: "query",
        columns: colNames,
        rows,
        rowCount: rows.length,
        elapsedMs: Number((performance.now() - t0).toFixed(2))
      });
    } else {
      const info = stmt.run();
      results.push({
        sql: stmtSql,
        kind: "mutation",
        changes: Number(info.changes),
        lastInsertRowid: toPlainValue(info.lastInsertRowid),
        elapsedMs: Number((performance.now() - t0).toFixed(2))
      });
    }
  }

  return {
    statementCount: statements.length,
    totalElapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    results
  };
}

function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

export function exportSqlDump() {
  const db = getDb();
  const tables = getAllowedTables(db);
  const lines = [
    "-- SnapGear Camera Store SQLite Dump",
    `-- Exported at ${new Date().toISOString()}`,
    "PRAGMA foreign_keys = OFF;",
    ""
  ];
  for (const t of tables) {
    lines.push(`${t.sql};`);
  }
  lines.push("");
  for (const t of tables) {
    const rows = db.prepare(`SELECT * FROM ${quoteIdent(t.name)}`).all().map(normalizeRow);
    if (rows.length === 0) continue;
    lines.push(`-- Data for ${t.name}`);
    for (const row of rows) {
      const vals = Object.values(row).map(sqlLiteral).join(", ");
      lines.push(`INSERT INTO ${t.name} VALUES (${vals});`);
    }
    lines.push("");
  }
  lines.push("PRAGMA foreign_keys = ON;");
  return lines.join("\n");
}

export function resetDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  dbInstance = openDb();
  return getStorefrontData();
}
