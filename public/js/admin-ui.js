// SnapGear SQL Admin Panel — 100% English, Password-Protected Shared UI Module

function esc(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SQL_PRESETS = [
  {
    title: "Live Inventory Stock (JOIN)",
    desc: "Products + supplier + SUM(stock_changes)",
    sql: `SELECT
  p.product_id,
  p.name,
  p.price AS price_ntd,
  s.name AS supplier,
  COALESCE(SUM(sc.quantity_change), 0) AS current_stock
FROM products p
LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
LEFT JOIN stock_changes sc ON sc.product_id = p.product_id
GROUP BY p.product_id, p.name, p.price, s.name
ORDER BY p.product_id;`
  },
  {
    title: "Insert SmallRig 4841 Side Handle",
    desc: "Adds product #6 ($1,970) + initial stock 6",
    sql: `INSERT INTO products VALUES (6, 'SmallRig 4841 Side Handle', 1970, 2);
INSERT INTO stock_changes VALUES (
  (SELECT COALESCE(MAX(change_id), 0) + 1 FROM stock_changes),
  NULL,
  6,
  6
);
SELECT * FROM products ORDER BY product_id;`
  },
  {
    title: "Sales Revenue by Product",
    desc: "Gross sales vs refunds per camera accessory",
    sql: `SELECT
  p.product_id,
  p.name,
  COALESCE(SUM(CASE WHEN o.order_type = 'S' THEN oi.quantity ELSE 0 END), 0) AS units_sold,
  COALESCE(SUM(CASE WHEN o.order_type = 'F' THEN oi.quantity ELSE 0 END), 0) AS units_refunded,
  COALESCE(SUM(CASE WHEN o.order_type = 'S' THEN oi.quantity * oi.unit_price
                    WHEN o.order_type = 'F' THEN -oi.quantity * oi.unit_price
                    ELSE 0 END), 0) AS net_revenue_ntd
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.product_id
LEFT JOIN orders o ON o.order_id = oi.order_id
GROUP BY p.product_id, p.name
ORDER BY net_revenue_ntd DESC;`
  },
  {
    title: "Full Order Ledger (S/P/R/F)",
    desc: "Orders joined with customers, suppliers & items",
    sql: `SELECT
  o.order_id,
  o.order_type,
  o.order_date,
  COALESCE(c.name, s.name) AS counterparty,
  p.name AS product,
  oi.quantity,
  oi.unit_price,
  oi.quantity * oi.unit_price AS line_total,
  o.related_order_id
FROM orders o
LEFT JOIN customers c ON c.customer_id = o.customer_id
LEFT JOIN suppliers s ON s.supplier_id = o.supplier_id
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON p.product_id = oi.product_id
ORDER BY o.order_id DESC;`
  },
  {
    title: "Update Product Price Example",
    desc: "Demo editing a price & verifying storefront sync",
    sql: `UPDATE products
SET price = 950
WHERE product_id = 4;
SELECT product_id, name, price FROM products WHERE product_id = 4;`
  },
  {
    title: "Low Stock Alert (Stock <= 5)",
    desc: "Find products that need supplier purchase orders",
    sql: `SELECT
  p.product_id,
  p.name,
  s.name AS supplier,
  COALESCE(SUM(sc.quantity_change), 0) AS stock
FROM products p
LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
LEFT JOIN stock_changes sc ON sc.product_id = p.product_id
GROUP BY p.product_id, p.name, s.name
HAVING stock <= 5
ORDER BY stock ASC;`
  }
];

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export class SnapGearAdminPanel {
  constructor(container, { onDataChanged, onToast }) {
    this.container = container;
    this.onDataChanged = onDataChanged || (() => {});
    this.onToast = onToast || (() => {});

    this.authenticated = false;
    this.loginError = null;
    this.activeTab = "tables";
    this.schema = null;
    this.storefront = null;
    this.selectedTable = "products";
    this.tableData = null;
    this.editingRowPk = null;
    this.addingRow = false;
    this.sqlText = SQL_PRESETS[0].sql;
    this.sqlOutput = null;
    this.sqlError = null;
    this.banner = null;
  }

  async mount() {
    this.container.innerHTML = `<p style="padding:18px;color:#555;">Checking administrator session...</p>`;
    try {
      const auth = await apiJson("/api/admin/auth");
      this.authenticated = Boolean(auth.authenticated);
      if (this.authenticated) {
        await this.refreshAll();
      } else {
        this.renderLoginGate();
      }
    } catch {
      this.authenticated = false;
      this.renderLoginGate();
    }
  }

  renderLoginGate() {
    this.container.innerHTML = `
      <div class="admin-lock-box">
        <div class="admin-lock-icon">🔒</div>
        <h2>ADMINISTRATOR LOGIN</h2>
        <p>This SQLite Admin Panel is password-protected. Enter the administrator passcode to inspect tables, edit records, or execute SQL queries.</p>
        <form id="adminLoginForm" style="display:flex;flex-direction:column;gap:10px;">
          <input id="adminPasswordInput" class="ui-input" type="password" autocomplete="current-password"
            placeholder="Enter administrator password" style="text-align:center;font-size:16px;padding:10px 12px;" required>
          ${this.loginError ? `<div class="alert-banner err" style="margin:0;">${esc(this.loginError)}</div>` : ""}
          <button class="btn-gba primary" type="submit" style="width:100%;padding:10px;font-size:15px;">🔓 Unlock Admin Panel</button>
        </form>
      </div>
    `;

    const inp = this.container.querySelector("#adminPasswordInput");
    if (inp) setTimeout(() => inp.focus(), 40);

    const form = this.container.querySelector("#adminLoginForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        this.loginError = null;
        const password = inp?.value ?? "";
        try {
          await apiJson("/api/admin/auth", {
            method: "POST",
            body: JSON.stringify({ password })
          });
          this.authenticated = true;
          this.onToast("Admin Panel unlocked.");
          await this.refreshAll();
        } catch (err) {
          this.loginError = err.message || "Incorrect administrator password.";
          this.renderLoginGate();
        }
      });
    }
  }

  handleAuthError(err) {
    if (err && err.status === 401) {
      this.authenticated = false;
      this.loginError = "Session locked. Please enter the administrator password.";
      this.renderLoginGate();
      return true;
    }
    return false;
  }

  async refreshAll() {
    try {
      const [schemaRes, storeRes] = await Promise.all([
        apiJson("/api/admin/schema"),
        apiJson("/api/storefront")
      ]);
      this.schema = schemaRes.schema;
      this.storefront = storeRes.data;
      if (!this.schema.tables.some((t) => t.name === this.selectedTable) && this.schema.tables.length > 0) {
        this.selectedTable = this.schema.tables[0].name;
      }
      if (this.selectedTable) {
        const tblRes = await apiJson(`/api/admin/tables/${encodeURIComponent(this.selectedTable)}`);
        this.tableData = tblRes.data;
      }
      this.render();
    } catch (err) {
      if (!this.handleAuthError(err)) {
        this.setBanner("err", err.message);
      }
    }
  }

  async selectTable(name) {
    this.selectedTable = name;
    this.editingRowPk = null;
    this.addingRow = false;
    try {
      const tblRes = await apiJson(`/api/admin/tables/${encodeURIComponent(name)}`);
      this.tableData = tblRes.data;
      this.render();
    } catch (err) {
      if (!this.handleAuthError(err)) this.setBanner("err", err.message);
    }
  }

  setBanner(type, text) {
    this.banner = { type, text };
    this.render();
  }

  render() {
    if (!this.authenticated) {
      this.renderLoginGate();
      return;
    }
    if (!this.schema || !this.storefront) return;
    const stats = this.storefront.stats;

    this.container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Products</div>
          <div class="kpi-val">${stats.productCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Stock Units</div>
          <div class="kpi-val">${stats.totalInventoryUnits}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Customers / Suppliers</div>
          <div class="kpi-val">${stats.customerCount} / ${stats.supplierCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Orders (S/P/R/F)</div>
          <div class="kpi-val">${stats.orderCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net D2C Revenue</div>
          <div class="kpi-val">NT$${Number(stats.netSalesRevenue).toLocaleString()}</div>
        </div>
      </div>

      <div class="tabs-bar" style="justify-content:space-between;align-items:center;">
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <button class="tab-btn ${this.activeTab === "tables" ? "active" : ""}" data-admin-tab="tables" type="button">📊 Table Editor</button>
          <button class="tab-btn ${this.activeTab === "sql" ? "active" : ""}" data-admin-tab="sql" type="button">💻 SQL Console</button>
          <button class="tab-btn ${this.activeTab === "tx" ? "active" : ""}" data-admin-tab="tx" type="button">🔁 Transactions (S / P / R / F)</button>
          <button class="tab-btn ${this.activeTab === "schema" ? "active" : ""}" data-admin-tab="schema" type="button">🗄 Schema &amp; Backup</button>
        </div>
        <button class="btn-gba sm" id="adminLogoutBtn" type="button">🔒 Lock Admin</button>
      </div>

      ${this.banner ? `<div class="alert-banner ${this.banner.type}">${esc(this.banner.text)}</div>` : ""}

      <div id="adminTabContent">
        ${this.activeTab === "tables" ? this.renderTablesTab() : ""}
        ${this.activeTab === "sql" ? this.renderSqlTab() : ""}
        ${this.activeTab === "tx" ? this.renderTxTab() : ""}
        ${this.activeTab === "schema" ? this.renderSchemaTab() : ""}
      </div>
    `;

    this.bindEvents();
  }

  renderTablesTab() {
    const tables = this.schema.tables;
    const td = this.tableData;
    const hasPk = td && td.primaryKeys.length > 0;

    return `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
        <div class="filter-pills">
          ${tables
            .map(
              (t) => `<button class="filter-btn ${t.name === this.selectedTable ? "active" : ""}" data-pick-table="${esc(t.name)}" type="button">${esc(t.name)} (${t.rowCount})</button>`
            )
            .join("")}
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-gba sm primary" id="adminToggleAddBtn" type="button">${this.addingRow ? "✕ Cancel Add" : "+ Add Row"}</button>
          <button class="btn-gba sm" id="adminRefreshBtn" type="button">↻ Refresh</button>
        </div>
      </div>

      ${this.addingRow && td ? this.renderAddRowForm(td) : ""}

      ${
        td
          ? `
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                ${td.columns
                  .map(
                    (c) =>
                      `<th>${esc(c.name)} <span style="font-weight:400;color:#72778a;font-size:11px;">${c.pk ? "🔑PK " : ""}${esc(c.type)}</span></th>`
                  )
                  .join("")}
                ${hasPk ? `<th style="width:155px;">Actions</th>` : ""}
              </tr>
            </thead>
            <tbody>
              ${
                td.rows.length === 0
                  ? `<tr><td colspan="${td.columns.length + (hasPk ? 1 : 0)}" style="text-align:center;color:#777;padding:20px;">Table is empty.</td></tr>`
                  : td.rows
                      .map((row) => {
                        const pkObj = {};
                        td.primaryKeys.forEach((pk) => {
                          pkObj[pk] = row[pk];
                        });
                        const pkKey = JSON.stringify(pkObj);
                        const isEditing = this.editingRowPk === pkKey;

                        if (isEditing) {
                          return `
                            <tr style="background:#fffdf0;">
                              ${td.columns
                                .map(
                                  (c) => `
                                <td>
                                  <input class="ui-input" style="width:100%;min-width:80px;padding:4px 7px;"
                                    data-edit-col="${esc(c.name)}"
                                    value="${row[c.name] === null || row[c.name] === undefined ? "" : esc(row[c.name])}"
                                    placeholder="${c.notnull ? "Required" : "NULL"}">
                                </td>`
                                )
                                .join("")}
                              <td>
                                <div style="display:flex;gap:5px;">
                                  <button class="btn-gba sm success" data-save-row='${esc(pkKey)}' type="button">Save</button>
                                  <button class="btn-gba sm" data-cancel-edit type="button">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          `;
                        }

                        return `
                          <tr>
                            ${td.columns
                              .map((c) => {
                                const v = row[c.name];
                                if (v === null || v === undefined) {
                                  return `<td><span style="color:#9ba0b2;font-style:italic;">NULL</span></td>`;
                                }
                                if (td.table === "orders" && c.name === "order_type") {
                                  return `<td><span class="type-badge type-${esc(v)}">${esc(v)}</span></td>`;
                                }
                                return `<td>${esc(v)}</td>`;
                              })
                              .join("")}
                            ${
                              hasPk
                                ? `
                              <td>
                                <div style="display:flex;gap:5px;">
                                  <button class="btn-gba sm" data-edit-row='${esc(pkKey)}' type="button">✏ Edit</button>
                                  <button class="btn-gba sm" style="color:#b8281c;" data-del-row='${esc(pkKey)}' type="button">🗑</button>
                                </div>
                              </td>`
                                : ""
                            }
                          </tr>
                        `;
                      })
                      .join("")
              }
            </tbody>
          </table>
        </div>
        ${
          td.foreignKeys.length > 0
            ? `<p style="font-size:12px;color:#5a6072;margin-top:8px;">Foreign Keys: ${td.foreignKeys
                .map((fk) => `<code>${esc(fk.from)} → ${esc(fk.table)}.${esc(fk.to)}</code>`)
                .join(" · ")}</p>`
            : ""
        }
      `
          : ""
      }
    `;
  }

  renderAddRowForm(td) {
    return `
      <form id="adminAddRowForm" style="background:#f5f8ff;border:2px solid #9ab4e8;border-radius:8px;padding:13px 14px;margin-bottom:14px;">
        <div style="font-family:var(--font-px);font-size:15px;margin-bottom:10px;color:#223868;">+ Insert New Row into <code>${esc(td.table)}</code></div>
        <div class="form-grid">
          ${td.columns
            .map(
              (c) => `
            <div class="field-group">
              <label>${esc(c.name)} <span style="color:#72788a;font-weight:400;">(${esc(c.type)}${c.pk ? ", leave blank for auto ID" : ""})</span></label>
              <input class="ui-input" name="${esc(c.name)}" placeholder="${c.pk ? "Auto next ID" : c.notnull ? "Required" : "NULL"}">
            </div>`
            )
            .join("")}
        </div>
        <button class="btn-gba sm primary" type="submit">✓ Insert Row into SQLite</button>
      </form>
    `;
  }

  renderSqlTab() {
    return `
      <div class="sql-console-grid">
        <div>
          <div style="font-family:var(--font-px);font-size:14px;margin-bottom:8px;color:#2b3040;">⚡ Quick SQL Presets</div>
          <div class="preset-list">
            ${SQL_PRESETS.map(
              (p, idx) => `
              <button class="preset-btn" data-sql-preset="${idx}" type="button">
                <strong>${esc(p.title)}</strong>
                <small>${esc(p.desc)}</small>
              </button>`
            ).join("")}
          </div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-family:var(--font-px);font-size:14px;color:#2b3040;">SQLite Query &amp; Script Editor (<code>snapgear.db</code>)</span>
            <span style="font-size:12px;color:#686d80;">Tip: Press <strong>Cmd/Ctrl + Enter</strong> to run</span>
          </div>
          <textarea id="rawSqlInput" class="sql-editor-area" spellcheck="false">${esc(this.sqlText)}</textarea>
          <div style="display:flex;gap:8px;margin-top:9px;flex-wrap:wrap;align-items:center;">
            <button class="btn-gba primary" id="runSqlBtn" type="button">▶ Run SQL</button>
            <button class="btn-gba" id="clearSqlBtn" type="button">Clear</button>
            <span style="font-size:12px;color:#5e6474;">Supports multi-statement SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER with foreign keys enabled.</span>
          </div>

          ${this.sqlError ? `<div class="alert-banner err"><strong>SQLite Error:</strong> ${esc(this.sqlError)}</div>` : ""}
          ${this.sqlOutput ? this.renderSqlResults(this.sqlOutput) : ""}
        </div>
      </div>
    `;
  }

  renderSqlResults(out) {
    return `
      <div style="margin-top:14px;">
        <div class="alert-banner ok">
          Executed <strong>${out.statementCount}</strong> statement(s) in <strong>${out.totalElapsedMs} ms</strong>. Storefront &amp; pixel mart updated live.
        </div>
        ${out.results
          .map((res, idx) => {
            if (res.kind === "mutation") {
              return `
                <div style="background:#f8f9fc;border:1.5px solid #cfd4e2;border-radius:7px;padding:10px 12px;margin-bottom:10px;font-size:13px;">
                  <div><strong>Statement #${idx + 1} (Mutation)</strong> — <code>${res.changes}</code> row(s) changed (${res.elapsedMs} ms)</div>
                  <div style="font-family:var(--font-mono);font-size:11.5px;color:#52586a;margin-top:4px;">${esc(res.sql)}</div>
                </div>
              `;
            }
            return `
              <div style="margin-bottom:12px;">
                <div style="font-size:12.5px;color:#464c5e;margin-bottom:5px;">
                  <strong>Statement #${idx + 1}</strong> — ${res.rowCount} row(s) returned (${res.elapsedMs} ms)
                </div>
                <div class="data-table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>${res.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>
                    </thead>
                    <tbody>
                      ${
                        res.rows.length === 0
                          ? `<tr><td colspan="${Math.max(1, res.columns.length)}" style="text-align:center;color:#777;">0 rows</td></tr>`
                          : res.rows
                              .map(
                                (r) =>
                                  `<tr>${res.columns
                                    .map((c) => {
                                      const v = r[c];
                                      return `<td>${v === null || v === undefined ? `<span style="color:#9ba0b2;font-style:italic;">NULL</span>` : esc(v)}</td>`;
                                    })
                                    .join("")}</tr>`
                              )
                              .join("")
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  renderTxTab() {
    const { products, suppliers, orders } = this.storefront;
    const purchaseOrders = orders.filter((o) => o.order_type === "P");
    const saleOrders = orders.filter((o) => o.order_type === "S");
    const refundedSaleIds = new Set(orders.filter((o) => o.order_type === "F").map((o) => o.related_order_id));

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px;">
        <form id="txPurchaseForm" class="checkout-card">
          <h3>📦 Supplier Purchase Order (Type 'P')</h3>
          <p style="font-size:12.5px;color:#55596a;margin:0 0 10px;">Creates a <code>P</code> order in <code>orders</code> + <code>order_items</code>. Stock increases when received via Restock (<code>R</code>).</p>
          <div class="field-group" style="margin-bottom:8px;">
            <label>Supplier</label>
            <select class="ui-select" name="supplier_id">
              ${suppliers.map((s) => `<option value="${s.supplier_id}">#${s.supplier_id} ${esc(s.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field-group" style="margin-bottom:8px;">
            <label>Product</label>
            <select class="ui-select" name="product_id">
              ${products.map((p) => `<option value="${p.product_id}">#${p.product_id} ${esc(p.name)} (Retail NT$${p.price})</option>`).join("")}
            </select>
          </div>
          <div class="form-grid">
            <div class="field-group">
              <label>Quantity</label>
              <input class="ui-input" type="number" name="quantity" value="5" min="1" required>
            </div>
            <div class="field-group">
              <label>Unit Cost (NTD)</label>
              <input class="ui-input" type="number" name="unit_price" value="1500" min="0" required>
            </div>
          </div>
          <button class="btn-gba primary" type="submit" style="width:100%;">Create Purchase Order ('P')</button>
        </form>

        <div class="checkout-card">
          <h3>🚚 Receive Supplier Restock (Type 'R')</h3>
          <p style="font-size:12.5px;color:#55596a;margin:0 0 10px;">Links <code>related_order_id</code> to a Purchase Order (<code>P</code>), inserts an <code>R</code> order and positive <code>stock_changes</code>.</p>
          ${
            purchaseOrders.length === 0
              ? `<p style="font-size:13px;color:#777;">No Purchase Orders ('P') available.</p>`
              : purchaseOrders
                  .map(
                    (po) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;background:#fff;border:1.5px solid #d4d9e6;border-radius:6px;margin-bottom:8px;">
                    <div style="font-size:12.5px;">
                      <strong>PO #${po.order_id}</strong> (${esc(po.order_date)})<br>
                      <span style="color:#555;">${esc(po.supplier_name || "")} · ${po.items.map((i) => `${i.quantity}x ${i.product_name}`).join(", ")}</span>
                    </div>
                    <button class="btn-gba sm success" data-do-restock="${po.order_id}" type="button">Receive (+Stock)</button>
                  </div>`
                  )
                  .join("")
          }
        </div>

        <div class="checkout-card">
          <h3>↩ Process Customer Refund (Type 'F')</h3>
          <p style="font-size:12.5px;color:#55596a;margin:0 0 10px;">Links <code>related_order_id</code> to a Sale (<code>S</code>), inserts an <code>F</code> order and restores items to <code>stock_changes</code>.</p>
          ${
            saleOrders.length === 0
              ? `<p style="font-size:13px;color:#777;">No Sale Orders ('S') recorded yet.</p>`
              : saleOrders
                  .map((so) => {
                    const already = refundedSaleIds.has(so.order_id);
                    return `
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;background:#fff;border:1.5px solid #d4d9e6;border-radius:6px;margin-bottom:8px;">
                        <div style="font-size:12.5px;">
                          <strong>Sale #${so.order_id}</strong> · ${esc(so.customer_name || "")}<br>
                          <span style="color:#555;">${so.items.map((i) => `${i.quantity}x ${i.product_name}`).join(", ")} (NT$${Number(so.total_amount).toLocaleString()})</span>
                        </div>
                        ${
                          already
                            ? `<span class="type-badge type-F">Refunded</span>`
                            : `<button class="btn-gba sm buy-now" data-do-refund="${so.order_id}" type="button">Refund ('F')</button>`
                        }
                      </div>`;
                  })
                  .join("")
          }
        </div>
      </div>
    `;
  }

  renderSchemaTab() {
    return `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="font-size:13px;color:#4a5062;">
          SQLite Database File: <code>${esc(this.schema.dbPath)}</code>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="/api/admin/export-sql" download="snapgear-camera-store.sql" class="btn-gba primary" style="text-decoration:none;">⬇ Export .sql Dump</a>
          <button class="btn-gba buy-now" id="resetDbBtn" type="button">↺ Reset to Original Seed SQL</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;">
        ${this.schema.tables
          .map(
            (t) => `
          <div style="background:#f8f9fc;border:2px solid #cfd4e2;border-radius:8px;padding:12px 14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="font-family:var(--font-px);font-size:16px;">${esc(t.name)}</strong>
              <span class="supplier-chip">${t.rowCount} rows</span>
            </div>
            <pre class="sql-preview-box" style="margin:0;font-size:11.5px;">${esc(t.sql)};</pre>
          </div>`
          )
          .join("")}
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelectorAll("[data-admin-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.dataset.adminTab;
        this.banner = null;
        this.render();
      });
    });

    const logoutBtn = this.container.querySelector("#adminLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await apiJson("/api/admin/logout", { method: "POST" }).catch(() => {});
        this.authenticated = false;
        this.loginError = null;
        this.onToast("Admin Panel locked.");
        this.renderLoginGate();
      });
    }

    this.container.querySelectorAll("[data-pick-table]").forEach((btn) => {
      btn.addEventListener("click", () => this.selectTable(btn.dataset.pickTable));
    });

    const toggleAdd = this.container.querySelector("#adminToggleAddBtn");
    if (toggleAdd) {
      toggleAdd.addEventListener("click", () => {
        this.addingRow = !this.addingRow;
        this.editingRowPk = null;
        this.render();
      });
    }

    const refreshBtn = this.container.querySelector("#adminRefreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshAll());
    }

    const addForm = this.container.querySelector("#adminAddRowForm");
    if (addForm) {
      addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(addForm);
        const row = {};
        for (const [k, v] of fd.entries()) {
          row[k] = v;
        }
        try {
          await apiJson(`/api/admin/tables/${encodeURIComponent(this.selectedTable)}/rows`, {
            method: "POST",
            body: JSON.stringify({ row })
          });
          this.addingRow = false;
          this.onToast(`Inserted row into ${this.selectedTable}`);
          await this.refreshAll();
          this.setBanner("ok", `Inserted new row into "${this.selectedTable}". Storefront synchronized.`);
          this.onDataChanged();
        } catch (err) {
          if (!this.handleAuthError(err)) this.setBanner("err", err.message);
        }
      });
    }

    this.container.querySelectorAll("[data-edit-row]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.editingRowPk = btn.dataset.editRow;
        this.addingRow = false;
        this.render();
      });
    });

    const cancelEdit = this.container.querySelector("[data-cancel-edit]");
    if (cancelEdit) {
      cancelEdit.addEventListener("click", () => {
        this.editingRowPk = null;
        this.render();
      });
    }

    this.container.querySelectorAll("[data-save-row]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pk = JSON.parse(btn.dataset.saveRow);
        const tr = btn.closest("tr");
        const row = {};
        tr.querySelectorAll("[data-edit-col]").forEach((inp) => {
          row[inp.dataset.editCol] = inp.value;
        });
        try {
          await apiJson(`/api/admin/tables/${encodeURIComponent(this.selectedTable)}/rows`, {
            method: "PUT",
            body: JSON.stringify({ pk, row })
          });
          this.editingRowPk = null;
          this.onToast(`Updated row in ${this.selectedTable}`);
          await this.refreshAll();
          this.setBanner("ok", `Updated "${this.selectedTable}" row successfully. Storefront updated.`);
          this.onDataChanged();
        } catch (err) {
          if (!this.handleAuthError(err)) this.setBanner("err", err.message);
        }
      });
    });

    this.container.querySelectorAll("[data-del-row]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pk = JSON.parse(btn.dataset.delRow);
        if (!window.confirm(`Delete row ${JSON.stringify(pk)} from ${this.selectedTable}?`)) return;
        try {
          await apiJson(`/api/admin/tables/${encodeURIComponent(this.selectedTable)}/rows`, {
            method: "DELETE",
            body: JSON.stringify({ pk })
          });
          this.onToast(`Deleted row from ${this.selectedTable}`);
          await this.refreshAll();
          this.setBanner("ok", `Deleted row from "${this.selectedTable}".`);
          this.onDataChanged();
        } catch (err) {
          if (!this.handleAuthError(err)) this.setBanner("err", err.message);
        }
      });
    });

    const sqlInput = this.container.querySelector("#rawSqlInput");
    const runSql = async () => {
      if (!sqlInput) return;
      this.sqlText = sqlInput.value;
      this.sqlError = null;
      this.sqlOutput = null;
      try {
        const res = await apiJson("/api/admin/sql", {
          method: "POST",
          body: JSON.stringify({ sql: this.sqlText })
        });
        this.sqlOutput = res.execution;
        this.schema = res.schema;
        this.storefront = res.storefront;
        if (this.schema.tables.some((t) => t.name === this.selectedTable)) {
          const tblRes = await apiJson(`/api/admin/tables/${encodeURIComponent(this.selectedTable)}`);
          this.tableData = tblRes.data;
        }
        this.onToast("SQL executed!");
        this.onDataChanged();
        this.render();
      } catch (err) {
        if (!this.handleAuthError(err)) {
          this.sqlError = err.message;
          this.render();
        }
      }
    };

    if (sqlInput) {
      sqlInput.addEventListener("input", () => {
        this.sqlText = sqlInput.value;
      });
      sqlInput.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          runSql();
        }
      });
    }

    const runSqlBtn = this.container.querySelector("#runSqlBtn");
    if (runSqlBtn) runSqlBtn.addEventListener("click", runSql);

    const clearSqlBtn = this.container.querySelector("#clearSqlBtn");
    if (clearSqlBtn) {
      clearSqlBtn.addEventListener("click", () => {
        this.sqlText = "";
        this.sqlOutput = null;
        this.sqlError = null;
        this.render();
      });
    }

    this.container.querySelectorAll("[data-sql-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = SQL_PRESETS[Number(btn.dataset.sqlPreset)];
        if (preset) {
          this.sqlText = preset.sql;
          this.sqlError = null;
          this.render();
        }
      });
    });

    const poForm = this.container.querySelector("#txPurchaseForm");
    if (poForm) {
      poForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(poForm);
        try {
          const res = await apiJson("/api/orders/purchase", {
            method: "POST",
            body: JSON.stringify({
              supplier_id: Number(fd.get("supplier_id")),
              items: [
                {
                  product_id: Number(fd.get("product_id")),
                  quantity: Number(fd.get("quantity")),
                  unit_price: Number(fd.get("unit_price"))
                }
              ]
            })
          });
          this.onToast(`Purchase Order #${res.result.order_id} created!`);
          await this.refreshAll();
          this.setBanner("ok", `Created Purchase Order #${res.result.order_id} ('P'). Click Receive (+Stock) to record Restock ('R').`);
          this.onDataChanged();
        } catch (err) {
          if (!this.handleAuthError(err)) this.setBanner("err", err.message);
        }
      });
    }

    this.container.querySelectorAll("[data-do-restock]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const relatedId = Number(btn.dataset.doRestock);
        try {
          const res = await apiJson("/api/orders/restock", {
            method: "POST",
            body: JSON.stringify({ related_order_id: relatedId })
          });
          this.onToast(`Restock #${res.result.order_id} received!`);
          await this.refreshAll();
          this.setBanner("ok", `Recorded Restock Order #${res.result.order_id} ('R') for PO #${relatedId} and increased stock_changes.`);
          this.onDataChanged();
        } catch (err) {
          if (!this.handleAuthError(err)) this.setBanner("err", err.message);
        }
      });
    });

    this.container.querySelectorAll("[data-do-refund]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const relatedId = Number(btn.dataset.doRefund);
        if (!window.confirm(`Process Refund ('F') for Sale #${relatedId} and restore stock?`)) return;
        try {
          const res = await apiJson("/api/orders/refund", {
            method: "POST",
            body: JSON.stringify({ related_order_id: relatedId })
          });
          this.onToast(`Refund #${res.result.order_id} processed!`);
          await this.refreshAll();
          this.setBanner("ok", `Recorded Refund Order #${res.result.order_id} ('F') for Sale #${relatedId} and restored inventory.`);
          this.onDataChanged();
        } catch (err) {
          if (!this.handleAuthError(err)) this.setBanner("err", err.message);
        }
      });
    });

    const resetBtn = this.container.querySelector("#resetDbBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", async () => {
        if (!window.confirm("Reset snapgear.db back to the original 5-product SQL seed script? All custom edits will be cleared.")) return;
        try {
          await apiJson("/api/admin/reset", { method: "POST" });
          this.sqlOutput = null;
          this.sqlError = null;
          this.onToast("Database reset to original SQL seed!");
          await this.refreshAll();
          this.setBanner("ok", "Database reset to original schema.sql seed data (5 products, 3 customers, 2 suppliers, 5 orders).");
          this.onDataChanged();
        } catch (err) {
          if (!this.handleAuthError(err)) this.setBanner("err", err.message);
        }
      });
    }
  }
}
