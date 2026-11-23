// SnapGear Camera Store — Main D2C Storefront & Pixel Town Controller

import { retroAudio } from "./audio.js";
import { SnapGearPixelWorld } from "./pixel-world.js";
import { SnapGearAdminPanel } from "./admin-ui.js";

function esc(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtNtd(amount) {
  return `NT$${Number(amount || 0).toLocaleString("en-US")}`;
}

const state = {
  storefront: null,
  cart: [], // [{ product_id, quantity }]
  myPurchases: [], // Session purchases [{ order_id, order_date, customer_name, product_id, name, quantity, unit_price }]
  catalogFilterSupplier: "all",
  catalogSearch: "",
  catalogSort: "id",
  activeModalId: null,
  lastReceipt: null,
  dialogue: {
    open: false,
    pages: [],
    pageIndex: 0,
    charIndex: 0,
    actions: [],
    timer: null
  }
};

let world = null;
let adminPanel = null;
let toastTimer = null;

function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("on");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("on"), 2800);
}

// =========================================================================
// GBA TYPEWRITER DIALOGUE BOX (#dlg)
// =========================================================================

function showDialogue(pages, actions = []) {
  const dlg = document.getElementById("dlg");
  const dlgText = document.getElementById("dlgText");
  const dlgActions = document.getElementById("dlgActions");
  if (!dlg || !dlgText) return;

  if (state.dialogue.timer) clearInterval(state.dialogue.timer);
  state.dialogue = {
    open: true,
    pages: Array.isArray(pages) ? pages : [String(pages)],
    pageIndex: 0,
    charIndex: 0,
    actions,
    timer: null
  };

  document.body.classList.add("dlg-open");
  dlg.classList.add("on");
  dlg.classList.remove("wait");
  dlgActions.innerHTML = "";
  typeCurrentPage();
}

function typeCurrentPage() {
  const dlg = document.getElementById("dlg");
  const dlgText = document.getElementById("dlgText");
  const dlgActions = document.getElementById("dlgActions");
  const full = state.dialogue.pages[state.dialogue.pageIndex] || "";
  state.dialogue.charIndex = 0;
  dlgText.textContent = "";
  dlg.classList.remove("wait");
  dlgActions.innerHTML = "";

  if (state.dialogue.timer) clearInterval(state.dialogue.timer);
  state.dialogue.timer = setInterval(() => {
    state.dialogue.charIndex += 2;
    dlgText.textContent = full.slice(0, state.dialogue.charIndex);
    if (state.dialogue.charIndex >= full.length) {
      finishCurrentPage();
    }
  }, 18);
}

function finishCurrentPage() {
  const dlg = document.getElementById("dlg");
  const dlgText = document.getElementById("dlgText");
  const dlgActions = document.getElementById("dlgActions");
  if (state.dialogue.timer) {
    clearInterval(state.dialogue.timer);
    state.dialogue.timer = null;
  }
  const full = state.dialogue.pages[state.dialogue.pageIndex] || "";
  dlgText.textContent = full;
  state.dialogue.charIndex = full.length;
  dlg.classList.add("wait");

  const isLast = state.dialogue.pageIndex === state.dialogue.pages.length - 1;
  if (isLast && state.dialogue.actions.length > 0) {
    dlgActions.innerHTML = "";
    state.dialogue.actions.forEach((act) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-gba sm primary";
      btn.textContent = act.label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDialogue();
        act.onClick();
      });
      dlgActions.appendChild(btn);
    });
  }
}

function advanceDialogue() {
  if (!state.dialogue.open) return;
  const full = state.dialogue.pages[state.dialogue.pageIndex] || "";
  if (state.dialogue.charIndex < full.length) {
    finishCurrentPage();
    return;
  }
  retroAudio.blip();
  if (state.dialogue.pageIndex + 1 < state.dialogue.pages.length) {
    state.dialogue.pageIndex++;
    typeCurrentPage();
  } else {
    closeDialogue();
  }
}

function closeDialogue() {
  if (state.dialogue.timer) clearInterval(state.dialogue.timer);
  state.dialogue.open = false;
  document.body.classList.remove("dlg-open");
  const dlg = document.getElementById("dlg");
  if (dlg) dlg.classList.remove("on", "wait");
}

// =========================================================================
// DATA LOADING & LIVE SYNC
// =========================================================================

async function fetchStorefront() {
  const res = await fetch("/api/storefront", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load storefront.");
  state.storefront = json.data;
  syncCartWithStock();
  updateHudBadges();
  if (world) world.setStoreData(state.storefront);
  rerenderActiveModal();
  return state.storefront;
}

function syncCartWithStock() {
  if (!state.storefront) return;
  const byId = new Map(state.storefront.products.map((p) => [p.product_id, p]));
  state.cart = state.cart
    .map((ci) => {
      const prod = byId.get(ci.product_id);
      if (!prod || prod.stock <= 0) return null;
      return { product_id: ci.product_id, quantity: Math.min(ci.quantity, prod.stock) };
    })
    .filter(Boolean);
}

function cartTotalCount() {
  return state.cart.reduce((sum, i) => sum + i.quantity, 0);
}

function updateHudBadges() {
  const count = cartTotalCount();
  const cartBadge = document.getElementById("cartCountBadge");
  if (cartBadge) cartBadge.textContent = String(count);
  const catalogCartNum = document.getElementById("catalogCartNum");
  if (catalogCartNum) catalogCartNum.textContent = String(count);
  const prodCount = document.getElementById("catalogCountBadge");
  if (prodCount && state.storefront) prodCount.textContent = `(${state.storefront.products.length})`;
}

// =========================================================================
// CART OPERATIONS
// =========================================================================

function addToCart(productId, qty = 1, openCartAfter = false) {
  const prod = state.storefront?.products.find((p) => p.product_id === Number(productId));
  if (!prod) return;
  if (prod.stock <= 0) {
    showToast(`${prod.name} is currently out of stock.`);
    return;
  }
  const existing = state.cart.find((c) => c.product_id === prod.product_id);
  const curQty = existing ? existing.quantity : 0;
  const nextQty = Math.min(prod.stock, curQty + qty);
  if (existing) existing.quantity = nextQty;
  else state.cart.push({ product_id: prod.product_id, quantity: nextQty });

  retroAudio.addCart();
  updateHudBadges();
  showToast(`Added ${prod.name} to cart (${nextQty} in cart)`);
  if (openCartAfter) {
    state.lastReceipt = null;
    openModal("modalCart");
  } else {
    rerenderActiveModal();
  }
}

function setCartQuantity(productId, delta) {
  const prod = state.storefront?.products.find((p) => p.product_id === Number(productId));
  const idx = state.cart.findIndex((c) => c.product_id === Number(productId));
  if (idx < 0 || !prod) return;
  const next = state.cart[idx].quantity + delta;
  if (next <= 0) {
    state.cart.splice(idx, 1);
  } else {
    state.cart[idx].quantity = Math.min(prod.stock, next);
  }
  updateHudBadges();
  renderCartModal();
}

// =========================================================================
// MODALS ORCHESTRATION
// =========================================================================

function openModal(id, opts = {}) {
  closeDialogue();
  closeAllModals(false);
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("on");
  state.activeModalId = id;
  document.body.classList.add("modal-open");
  if (world) world.setModalOpen(true);
  retroAudio.blip();

  if (id === "modalCatalog") renderCatalogModal();
  if (id === "modalCart") renderCartModal();
  if (id === "modalOrders") renderOrdersModal();
  if (id === "modalAdmin") {
    if (!adminPanel) {
      adminPanel = new SnapGearAdminPanel(document.getElementById("adminBody"), {
        onDataChanged: () => fetchStorefront(),
        onToast: showToast,
        onWrongPassword: () => {
          closeAllModals();
          showDialogue(
            [
              "Hmm... wrong password! Wait, what was the admin password again?",
              "Oh! I remember now — the password is 0417!"
            ],
            [{ label: "🔓 Try Password Again", onClick: () => openModal("modalAdmin", opts) }]
          );
        }
      });
    }
    if (opts.tab) adminPanel.activeTab = opts.tab;
    adminPanel.mount();
  }
}

function closeAllModals(focusCanvas = true) {
  const wasLockedAdmin = state.activeModalId === "modalAdmin" && adminPanel && !adminPanel.authenticated;
  document.querySelectorAll(".gba-backdrop.on").forEach((m) => m.classList.remove("on"));
  state.activeModalId = null;
  document.body.classList.remove("modal-open");
  if (world) world.setModalOpen(false);
  if (focusCanvas) document.getElementById("worldCanvas")?.focus();
  if (wasLockedAdmin && focusCanvas) {
    showDialogue(
      [
        "Forgot the admin password? Let me think...",
        "Oh! The password is 0417!"
      ],
      [{ label: "🔓 Enter Password", onClick: () => openModal("modalAdmin") }]
    );
  }
}

function rerenderActiveModal() {
  if (state.activeModalId === "modalCatalog") renderCatalogModal();
  if (state.activeModalId === "modalCart") renderCartModal();
  if (state.activeModalId === "modalOrders") renderOrdersModal();
}

// =========================================================================
// RENDER: D2C SHOP CATALOG MODAL
// =========================================================================

function renderCatalogModal() {
  const body = document.getElementById("catalogBody");
  if (!body || !state.storefront) return;
  const { products, suppliers, services, business, stats } = state.storefront;

  let filtered = products.filter((p) => {
    if (state.catalogFilterSupplier !== "all" && String(p.supplier_id) !== String(state.catalogFilterSupplier)) {
      return false;
    }
    if (state.catalogSearch.trim()) {
      const q = state.catalogSearch.trim().toLowerCase();
      const hay = `${p.name} ${p.supplier_name || ""} ${p.meta.category} ${p.meta.shortDesc} ${p.meta.sku}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (state.catalogSort === "price_asc") filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (state.catalogSort === "price_desc") filtered = [...filtered].sort((a, b) => b.price - a.price);
  else if (state.catalogSort === "stock_desc") filtered = [...filtered].sort((a, b) => b.stock - a.stock);

  body.innerHTML = `
    <div class="store-hero-bar">
      <div class="store-hero-copy">
        <h2>${esc(business.name)} — Official D2C Store</h2>
        <p>Verified Taiwan retail camera gear (${business.sources.join(" · ")}). Every product, price, and inventory count syncs directly with SQLite.</p>
      </div>
      <div class="live-db-pill">
        <span class="live-dot"></span>
        Live SQLite Sync · ${stats.productCount} Products · ${stats.totalInventoryUnits} Units in Stock
      </div>
    </div>

    <div class="catalog-toolbar">
      <div class="filter-pills">
        <button class="filter-btn ${state.catalogFilterSupplier === "all" ? "active" : ""}" data-sup-filter="all" type="button">All Suppliers (${products.length})</button>
        ${suppliers
          .map(
            (s) =>
              `<button class="filter-btn ${String(state.catalogFilterSupplier) === String(s.supplier_id) ? "active" : ""}" data-sup-filter="${s.supplier_id}" type="button">${esc(s.name)} (${s.product_count})</button>`
          )
          .join("")}
      </div>
      <div class="search-sort-wrap">
        <input id="catalogSearchInput" class="ui-input" type="search" placeholder="Search camera gear..." value="${esc(state.catalogSearch)}">
        <select id="catalogSortSelect" class="ui-select">
          <option value="id" ${state.catalogSort === "id" ? "selected" : ""}>Sort: Product ID</option>
          <option value="price_asc" ${state.catalogSort === "price_asc" ? "selected" : ""}>Price: Low → High</option>
          <option value="price_desc" ${state.catalogSort === "price_desc" ? "selected" : ""}>Price: High → Low</option>
          <option value="stock_desc" ${state.catalogSort === "stock_desc" ? "selected" : ""}>Stock: Highest</option>
        </select>
      </div>
    </div>

    <div class="product-grid">
      ${
        filtered.length === 0
          ? `<p style="grid-column:1/-1;text-align:center;color:#666;padding:30px;">No products match your filter. Try clearing the search or adding products in the Admin Panel.</p>`
          : filtered
              .map((p) => {
                const stockClass = p.stock <= 0 ? "out" : p.stock <= 5 ? "low" : "ok";
                const stockLabel = p.stock <= 0 ? "Out of Stock" : p.stock <= 5 ? `Low Stock · ${p.stock} left` : `${p.stock} in stock`;
                return `
                  <article class="product-card">
                    <div class="product-media" data-open-detail="${p.product_id}">
                      <img src="${esc(p.meta.image)}" alt="${esc(p.name)}" loading="lazy">
                      <span class="prod-id-tag">ID #${p.product_id}</span>
                      <span class="prod-badge-tag" style="background:${esc(p.meta.accentColor)};">${esc(p.meta.badge)}</span>
                    </div>
                    <div class="product-body">
                      <div class="product-meta-row">
                        <span class="supplier-chip">${esc(p.supplier_name || `Supplier #${p.supplier_id}`)}</span>
                        <span class="stock-pill ${stockClass}">${stockLabel}</span>
                      </div>
                      <h3 class="product-name" data-open-detail="${p.product_id}">${esc(p.name)}</h3>
                      <p class="product-desc">${esc(p.meta.shortDesc)}</p>
                      <div class="product-price-row">
                        <div>
                          <span class="price-ntd">${fmtNtd(p.price)}</span>
                          <span class="price-unit">NTD</span>
                        </div>
                        <button class="btn-gba sm" data-open-detail="${p.product_id}" type="button">Specs &amp; Ledger →</button>
                      </div>
                      <div class="product-actions">
                        <button class="btn-gba primary" data-add-cart="${p.product_id}" ${p.stock <= 0 ? "disabled" : ""} type="button">+ Add to Cart</button>
                        <button class="btn-gba buy-now" data-buy-now="${p.product_id}" ${p.stock <= 0 ? "disabled" : ""} type="button">⚡ Buy Now</button>
                      </div>
                    </div>
                  </article>
                `;
              })
              .join("")
      }
    </div>

    <h3 class="px" style="margin:24px 0 10px;font-size:18px;color:#2b2b34;">SNAPGEAR D2C CUSTOMER SERVICES</h3>
    <div class="services-grid">
      ${services
        .map(
          (sv) => `
        <div class="service-card">
          <h4><span>${sv.icon}</span> ${esc(sv.title)}</h4>
          <p>${esc(sv.desc)}</p>
        </div>`
        )
        .join("")}
    </div>
  `;

  body.querySelectorAll("[data-sup-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.catalogFilterSupplier = btn.dataset.supFilter;
      renderCatalogModal();
    });
  });

  const searchInp = body.querySelector("#catalogSearchInput");
  if (searchInp) {
    searchInp.addEventListener("input", () => {
      state.catalogSearch = searchInp.value;
      renderCatalogModal();
      const again = document.getElementById("catalogSearchInput");
      if (again) {
        again.focus();
        again.setSelectionRange(again.value.length, again.value.length);
      }
    });
  }

  const sortSel = body.querySelector("#catalogSortSelect");
  if (sortSel) {
    sortSel.addEventListener("change", () => {
      state.catalogSort = sortSel.value;
      renderCatalogModal();
    });
  }

  body.querySelectorAll("[data-open-detail]").forEach((el) => {
    el.addEventListener("click", () => openProductDetail(Number(el.dataset.openDetail)));
  });

  body.querySelectorAll("[data-add-cart]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.addCart), 1, false));
  });

  body.querySelectorAll("[data-buy-now]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.buyNow), 1, true));
  });
}

// =========================================================================
// RENDER: PRODUCT DETAIL MODAL
// =========================================================================

function openProductDetail(productId) {
  const prod = state.storefront?.products.find((p) => p.product_id === Number(productId));
  if (!prod) return;

  const titleEl = document.getElementById("detailModalTitle");
  const subEl = document.getElementById("detailModalSub");
  const body = document.getElementById("detailBody");
  if (!body) return;

  titleEl.textContent = `#${prod.product_id} ${prod.name}`;
  subEl.textContent = `${prod.meta.category} · SKU ${prod.meta.sku} · Supplier: ${prod.supplier_name || "N/A"}`;

  let qty = 1;
  const ledgerRows = (state.storefront.stockLedger || []).filter((l) => l.product_id === prod.product_id);
  const stockClass = prod.stock <= 0 ? "out" : prod.stock <= 5 ? "low" : "ok";

  const draw = () => {
    body.innerHTML = `
      <div class="detail-layout">
        <div>
          <div class="detail-photo">
            <img src="${esc(prod.meta.image)}" alt="${esc(prod.name)}">
          </div>
          <div style="margin-top:10px;padding:10px 12px;background:#f7f8fc;border:1.5px solid #d4d8e6;border-radius:7px;font-size:12.5px;color:#484d5e;">
            <strong>Warranty &amp; Guarantee:</strong><br>${esc(prod.meta.warranty)}
          </div>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
            <span class="supplier-chip">${esc(prod.supplier_name || `Supplier #${prod.supplier_id}`)}</span>
            <span class="stock-pill ${stockClass}">${prod.stock <= 0 ? "Out of Stock" : `${prod.stock} units available (SQLite live)`}</span>
          </div>
          <h2 style="margin:0 0 6px;font-size:22px;color:#1d202a;">${esc(prod.name)}</h2>
          <div style="font-size:13.5px;color:#555a6a;margin-bottom:10px;">${esc(prod.meta.tagline)}</div>
          <div style="margin:10px 0 12px;">
            <span class="price-ntd" style="font-size:28px;">${fmtNtd(prod.price)}</span>
            <span class="price-unit">NTD (Matches SQLite <code>products.price = ${prod.price}</code>)</span>
          </div>
          <p style="font-size:13.5px;line-height:1.6;color:#3d4150;margin:0 0 12px;">${esc(prod.meta.fullDesc)}</p>

          <div class="spec-list">
            ${prod.meta.specs
              .map(
                (sp) => `
              <div class="spec-row">
                <div class="spec-label">${esc(sp.label)}</div>
                <div>${esc(sp.value)}</div>
              </div>`
              )
              .join("")}
          </div>

          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;">
            <div class="qty-stepper">
              <button type="button" id="detailQtyDec">−</button>
              <span id="detailQtyVal">${qty}</span>
              <button type="button" id="detailQtyInc">+</button>
            </div>
            <button class="btn-gba primary" id="detailAddBtn" ${prod.stock <= 0 ? "disabled" : ""} type="button">🛒 Add to Cart</button>
            <button class="btn-gba sm" id="detailBackCatalogBtn" type="button">← All Products</button>
          </div>
          <p style="font-size:12px;color:#5a6072;margin:8px 0 0;">Add items to your cart here, then walk to the <strong>💳 CHECKOUT</strong> counter (or open Cart) to pay.</p>
        </div>
      </div>

      <h4 class="px" style="margin:20px 0 8px;font-size:15px;">LIVE SQLITE INVENTORY LEDGER (<code>stock_changes WHERE product_id = ${prod.product_id}</code>)</h4>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>change_id</th>
              <th>order_id</th>
              <th>Type</th>
              <th>Date</th>
              <th>quantity_change</th>
            </tr>
          </thead>
          <tbody>
            ${
              ledgerRows.length === 0
                ? `<tr><td colspan="5" style="text-align:center;color:#777;">No stock entries yet.</td></tr>`
                : ledgerRows
                    .map(
                      (r) => `
                <tr>
                  <td>#${r.change_id}</td>
                  <td>${r.order_id ? `#${r.order_id}` : "<em>Opening Stock</em>"}</td>
                  <td>${r.order_type ? `<span class="type-badge type-${esc(r.order_type)}">${esc(r.order_type)}</span>` : "INIT"}</td>
                  <td>${esc(r.order_date || "Initial")}</td>
                  <td style="font-weight:700;color:${r.quantity_change >= 0 ? "#166545" : "#b8281c"};">${r.quantity_change > 0 ? `+${r.quantity_change}` : r.quantity_change}</td>
                </tr>`
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    `;

    body.querySelector("#detailQtyDec")?.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      draw();
    });
    body.querySelector("#detailQtyInc")?.addEventListener("click", () => {
      qty = Math.min(Math.max(1, prod.stock), qty + 1);
      draw();
    });
    body.querySelector("#detailAddBtn")?.addEventListener("click", () => {
      addToCart(prod.product_id, qty, false);
      showToast(`Added ${qty}× ${prod.name} to cart — go to 💳 CHECKOUT to pay!`);
    });
    body.querySelector("#detailBackCatalogBtn")?.addEventListener("click", () => openModal("modalCatalog"));
  };

  draw();
  openModal("modalDetail");
}

// =========================================================================
// RENDER: SHOPPING CART & D2C CHECKOUT MODAL
// =========================================================================

function renderCartModal() {
  const body = document.getElementById("cartBody");
  if (!body || !state.storefront) return;

  if (state.lastReceipt) {
    const r = state.lastReceipt;
    body.innerHTML = `
      <div class="alert-banner ok" style="font-size:14.5px;">
        🎉 <strong>Order Confirmed!</strong> Sale Order <strong>#${r.order_id}</strong> for <strong>${esc(r.customer_name)}</strong> has been committed to SQLite.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;" class="cart-layout">
        <div class="checkout-card">
          <h3>🧾 Official SnapGear Digital Receipt</h3>
          <div class="summary-line"><span>Order ID</span><strong>#${r.order_id} (Type 'S')</strong></div>
          <div class="summary-line"><span>Order Date</span><strong>${esc(r.order_date)}</strong></div>
          <div class="summary-line"><span>Customer</span><strong>#${r.customer_id} ${esc(r.customer_name)}</strong></div>
          <hr style="border:none;border-top:1px dashed #cbd0de;margin:10px 0;">
          ${r.items
            .map(
              (i) => `
            <div class="summary-line">
              <span>${i.quantity}x ${esc(i.name)}</span>
              <strong>${fmtNtd(i.quantity * i.unit_price)}</strong>
            </div>`
            )
            .join("")}
          <div class="summary-line total">
            <span>TOTAL PAID</span>
            <span>${fmtNtd(r.total_amount)}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
            <button class="btn-gba primary" id="receiptShopMoreBtn" type="button">📷 Continue Shopping</button>
            <button class="btn-gba" id="receiptViewOrdersBtn" type="button">🧾 View Orders Ledger</button>
            <button class="btn-gba" id="receiptOpenAdminBtn" type="button">🔒 Inspect in Admin Panel</button>
          </div>
        </div>
        <div>
          <h4 class="px" style="margin:0 0 8px;font-size:15px;">EXACT SQLITE STATEMENTS EXECUTED</h4>
          <div class="sql-preview-box">${esc(r.executed_sql.join("\n"))}</div>
          <p style="font-size:12.5px;color:#555a6a;margin-top:8px;">
            Both the D2C storefront catalog and the walkable SnapGear Mart display pedestals have updated their live inventory counts immediately.
          </p>
        </div>
      </div>
    `;
    body.querySelector("#receiptShopMoreBtn")?.addEventListener("click", () => {
      state.lastReceipt = null;
      openModal("modalCatalog");
    });
    body.querySelector("#receiptViewOrdersBtn")?.addEventListener("click", () => {
      state.lastReceipt = null;
      openModal("modalOrders");
    });
    body.querySelector("#receiptOpenAdminBtn")?.addEventListener("click", () => {
      state.lastReceipt = null;
      openModal("modalAdmin");
    });
    return;
  }

  const byId = new Map(state.storefront.products.map((p) => [p.product_id, p]));
  const detailedItems = state.cart
    .map((ci) => {
      const p = byId.get(ci.product_id);
      return p ? { ...ci, product: p, lineTotal: ci.quantity * p.price } : null;
    })
    .filter(Boolean);

  if (detailedItems.length === 0) {
    body.innerHTML = `
      <div style="text-align:center;padding:42px 20px;">
        <div style="font-size:44px;margin-bottom:8px;">🛒</div>
        <h3 class="px" style="margin:0 0 8px;font-size:20px;">YOUR SNAPGEAR CART IS EMPTY</h3>
        <p style="font-size:14px;color:#5a5f70;max-width:460px;margin:0 auto 18px;">
          Walk inside SONY PRO or PHOTO GEAR to buy camera gear off the display pedestals, or open the full D2C catalog.
        </p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="btn-gba primary" id="emptyGoCatalogBtn" type="button">📋 Browse All Products</button>
          <button class="btn-gba" id="emptyGoSonyBtn" type="button">📷 Enter Sony Pro</button>
          <button class="btn-gba" id="emptyGoGearBtn" type="button">🎒 Enter Photo Gear</button>
        </div>
      </div>
    `;
    body.querySelector("#emptyGoCatalogBtn")?.addEventListener("click", () => openModal("modalCatalog"));
    body.querySelector("#emptyGoSonyBtn")?.addEventListener("click", () => {
      closeAllModals();
      world?.switchMap("sony", 9, 10, "up");
    });
    body.querySelector("#emptyGoGearBtn")?.addEventListener("click", () => {
      closeAllModals();
      world?.switchMap("gear", 9, 10, "up");
    });
    return;
  }

  const subtotal = detailedItems.reduce((acc, i) => acc + i.lineTotal, 0);
  const freeShip = subtotal >= 3000;
  const customers = state.storefront.customers;

  body.innerHTML = `
    <div class="cart-layout">
      <div>
        <h3 class="px" style="margin:0 0 10px;font-size:17px;">ITEMS IN CART (${cartTotalCount()})</h3>
        ${detailedItems
          .map(
            (item) => `
          <div class="cart-item">
            <img src="${esc(item.product.meta.image)}" alt="${esc(item.product.name)}">
            <div class="cart-item-info">
              <h4>#${item.product.product_id} ${esc(item.product.name)}</h4>
              <div class="sub">${fmtNtd(item.product.price)} each · Available stock: ${item.product.stock}</div>
            </div>
            <div class="qty-stepper">
              <button type="button" data-cart-dec="${item.product_id}">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-inc="${item.product_id}">+</button>
            </div>
            <div style="min-width:90px;text-align:right;font-family:var(--font-px);font-size:16px;">${fmtNtd(item.lineTotal)}</div>
          </div>`
          )
          .join("")}
        <button class="btn-gba sm" id="cartContinueBtn" type="button">← Add More Products</button>
      </div>

      <form id="checkoutForm" class="checkout-card">
        <h3>💳 Direct-to-Consumer Order Form</h3>
        <div class="field-group" style="margin-bottom:10px;">
          <label>Customer Account (SQLite <code>customers</code>)</label>
          <select id="checkoutCustMode" class="ui-select">
            ${customers.map((c) => `<option value="${c.customer_id}">#${c.customer_id} ${esc(c.name)}</option>`).join("")}
            <option value="__new__">+ Register New Customer...</option>
          </select>
        </div>
        <div class="field-group" id="newCustWrap" style="display:none;margin-bottom:10px;">
          <label>New Customer Full Name (max 50 chars)</label>
          <input id="newCustName" class="ui-input" maxlength="50" placeholder="e.g., Emily Wu">
        </div>
        <div class="field-group" style="margin-bottom:12px;">
          <label>Delivery &amp; Payment Method</label>
          <select class="ui-select">
            <option>Taipei Same-Day Courier · Credit Card / Line Pay</option>
            <option>7-ELEVEN Store Pickup · Cash on Delivery</option>
            <option>SnapGear Flagship Mart In-Store Pickup</option>
          </select>
        </div>

        <div class="summary-line"><span>Subtotal</span><span>${fmtNtd(subtotal)}</span></div>
        <div class="summary-line"><span>D2C Express Shipping</span><span style="color:#166545;">${freeShip ? "FREE (Order ≥ NT$3,000)" : "Included (D2C Promo)"}</span></div>
        <div class="summary-line total"><span>ORDER TOTAL</span><span>${fmtNtd(subtotal)}</span></div>

        <div id="checkoutErr"></div>

        <button class="btn-gba buy-now" id="submitOrderBtn" type="submit" style="width:100%;margin-top:10px;padding:11px;font-size:16px;">
          ✓ Place Order &amp; Record Sale in SQLite
        </button>
        <p style="font-size:11.5px;color:#5c6172;margin:9px 0 0;line-height:1.45;">
          Executes an atomic SQLite transaction inserting into <code>orders</code> (<code>order_type='S'</code>), <code>order_items</code>, and <code>stock_changes</code>.
        </p>
      </form>
    </div>
  `;

  body.querySelectorAll("[data-cart-dec]").forEach((b) => {
    b.addEventListener("click", () => setCartQuantity(Number(b.dataset.cartDec), -1));
  });
  body.querySelectorAll("[data-cart-inc]").forEach((b) => {
    b.addEventListener("click", () => setCartQuantity(Number(b.dataset.cartInc), 1));
  });
  body.querySelector("#cartContinueBtn")?.addEventListener("click", () => openModal("modalCatalog"));

  const custSel = body.querySelector("#checkoutCustMode");
  const newWrap = body.querySelector("#newCustWrap");
  custSel?.addEventListener("change", () => {
    if (newWrap) newWrap.style.display = custSel.value === "__new__" ? "flex" : "none";
  });

  body.querySelector("#checkoutForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = body.querySelector("#checkoutErr");
    const btn = body.querySelector("#submitOrderBtn");
    errEl.innerHTML = "";

    const isNew = custSel.value === "__new__";
    const newName = body.querySelector("#newCustName")?.value?.trim() || "";
    if (isNew && !newName) {
      errEl.innerHTML = `<div class="alert-banner err">Please enter the new customer's name.</div>`;
      return;
    }

    btn.disabled = true;
    btn.textContent = "Recording Sale in SQLite...";
    try {
      const res = await fetch("/api/orders/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: isNew ? null : Number(custSel.value),
          new_customer_name: isNew ? newName : null,
          items: state.cart
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Checkout failed.");

      state.cart = [];
      state.lastReceipt = json.receipt;
      state.storefront = json.storefront;
      for (const item of json.receipt.items || []) {
        state.myPurchases.unshift({
          order_id: json.receipt.order_id,
          order_date: json.receipt.order_date,
          customer_name: json.receipt.customer_name,
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price
        });
      }
      updateHudBadges();
      if (world) world.setStoreData(state.storefront);
      retroAudio.purchaseFanfare();
      showToast(`Sale Order #${json.receipt.order_id} committed to SQLite!`);
      renderCartModal();
    } catch (err) {
      errEl.innerHTML = `<div class="alert-banner err">${esc(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = "✓ Place Order & Record Sale in SQLite";
    }
  });
}

// =========================================================================
// RENDER: ORDERS, STOCK LEDGER & SERVICES MODAL
// =========================================================================

function renderOrdersModal() {
  const body = document.getElementById("ordersBody");
  if (!body || !state.storefront) return;
  const { orders, products, stockLedger, services, stats } = state.storefront;
  const refundedSaleIds = new Set(orders.filter((o) => o.order_type === "F").map((o) => o.related_order_id));
  const prodById = new Map(products.map((p) => [p.product_id, p]));

  // Aggregate items bought by the player (this session first, plus non-refunded SQLite sales)
  const ownedItems = state.myPurchases.length > 0
    ? state.myPurchases
    : orders
        .filter((o) => o.order_type === "S" && !refundedSaleIds.has(o.order_id))
        .flatMap((o) =>
          o.items.map((i) => ({
            order_id: o.order_id,
            order_date: o.order_date,
            customer_name: o.customer_name,
            product_id: i.product_id,
            name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price
          }))
        );

  const typeLabel = { S: "S · Sale", P: "P · Purchase", R: "R · Restock", F: "F · Refund" };

  body.innerHTML = `
    <h3 class="px" style="margin:0 0 10px;font-size:18px;">📷 MY PURCHASED GEAR (${state.myPurchases.length > 0 ? "BOUGHT THIS SESSION" : "ACTIVE STORE ORDERS"})</h3>
    ${
      ownedItems.length === 0
        ? `<div class="alert-banner ok" style="margin-bottom:16px;">You haven't bought any gear yet! Visit <strong>SONY PRO</strong> or <strong>PHOTO GEAR</strong>, add items to your cart, and pay at the <strong>💳 CHECKOUT</strong> counter.</div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-bottom:18px;">
            ${ownedItems
              .map((it) => {
                const p = prodById.get(Number(it.product_id));
                const img = p?.meta?.image || "/images/product-generic.svg";
                return `
                  <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8faff;border:2px solid #9ab4e8;border-radius:8px;">
                    <img src="${esc(img)}" alt="${esc(it.name)}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1.5px solid #cbd4e6;background:#f2efe4;">
                    <div style="min-width:0;font-size:12.5px;">
                      <strong style="display:block;color:#1d2433;">${it.quantity}× ${esc(it.name)}</strong>
                      <span style="color:#1f48a0;font-weight:700;">${fmtNtd(it.quantity * it.unit_price)}</span>
                      <span style="display:block;color:#62687a;font-size:11px;">Order #${it.order_id} · ${esc(it.customer_name || "")} · ${esc(it.order_date)}</span>
                    </div>
                  </div>`;
              })
              .join("")}
          </div>`
    }

    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Total Orders</div><div class="kpi-val">${stats.orderCount}</div></div>
      <div class="kpi-card"><div class="kpi-label">Net D2C Revenue</div><div class="kpi-val">${fmtNtd(stats.netSalesRevenue)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Active SKUs</div><div class="kpi-val">${stats.productCount}</div></div>
      <div class="kpi-card"><div class="kpi-label">Inventory Units</div><div class="kpi-val">${stats.totalInventoryUnits}</div></div>
    </div>

    <h3 class="px" style="margin:6px 0 8px;font-size:17px;">LIVE BUSINESS TRANSACTIONS (<code>orders</code> + <code>order_items</code>)</h3>
    <div class="data-table-wrap" style="margin-bottom:20px;">
      <table class="data-table">
        <thead>
          <tr>
            <th>order_id</th>
            <th>Type</th>
            <th>Date</th>
            <th>Customer / Supplier</th>
            <th>Items</th>
            <th>Total</th>
            <th>Related</th>
            <th>Quick Action</th>
          </tr>
        </thead>
        <tbody>
          ${orders
            .map((o) => {
              const who = o.customer_name ? `👤 ${o.customer_name}` : o.supplier_name ? `🏭 ${o.supplier_name}` : "—";
              const itemDesc = o.items.map((i) => `${i.quantity}× ${i.product_name} (${fmtNtd(i.unit_price)})`).join("<br>");
              let actionHtml = `<span style="color:#8a90a2;font-size:12px;">Recorded</span>`;
              if (o.order_type === "S" && !refundedSaleIds.has(o.order_id)) {
                actionHtml = `<button class="btn-gba sm" data-open-admin-tx type="button">🔒 Refund in Admin</button>`;
              } else if (o.order_type === "S") {
                actionHtml = `<span class="type-badge type-F">Refunded</span>`;
              } else if (o.order_type === "P") {
                actionHtml = `<button class="btn-gba sm" data-open-admin-tx type="button">🔒 Restock in Admin</button>`;
              }
              return `
                <tr>
                  <td><strong>#${o.order_id}</strong></td>
                  <td><span class="type-badge type-${esc(o.order_type)}">${esc(typeLabel[o.order_type] || o.order_type)}</span></td>
                  <td>${esc(o.order_date)}</td>
                  <td>${esc(who)}</td>
                  <td>${itemDesc || "—"}</td>
                  <td><strong>${fmtNtd(o.total_amount)}</strong></td>
                  <td>${o.related_order_id ? `→ #${o.related_order_id}` : "—"}</td>
                  <td>${actionHtml}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>

    <h3 class="px" style="margin:6px 0 8px;font-size:17px;">STOCK CHANGES AUDIT LEDGER (<code>stock_changes</code>)</h3>
    <div class="data-table-wrap" style="margin-bottom:20px;">
      <table class="data-table">
        <thead>
          <tr><th>change_id</th><th>order_id</th><th>Type</th><th>Product</th><th>quantity_change</th></tr>
        </thead>
        <tbody>
          ${stockLedger
            .map(
              (sc) => `
            <tr>
              <td>#${sc.change_id}</td>
              <td>${sc.order_id ? `#${sc.order_id}` : "<em>Opening Stock</em>"}</td>
              <td>${sc.order_type ? `<span class="type-badge type-${esc(sc.order_type)}">${esc(sc.order_type)}</span>` : "INIT"}</td>
              <td>#${sc.product_id} ${esc(sc.product_name || "")}</td>
              <td style="font-weight:700;color:${sc.quantity_change >= 0 ? "#166545" : "#b8281c"};">${sc.quantity_change > 0 ? `+${sc.quantity_change}` : sc.quantity_change}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <h3 class="px" style="margin:6px 0 8px;font-size:17px;">SNAPGEAR SERVICES &amp; NORMALIZED DATABASE GUARANTEE</h3>
    <div class="services-grid">
      ${services
        .map(
          (sv) => `
        <div class="service-card">
          <h4><span>${sv.icon}</span> ${esc(sv.title)}</h4>
          <p>${esc(sv.desc)}</p>
        </div>`
        )
        .join("")}
    </div>
  `;

  body.querySelectorAll("[data-open-admin-tx]").forEach((btn) => {
    btn.addEventListener("click", () => openModal("modalAdmin", { tab: "tx" }));
  });
}

// =========================================================================
// CLOCK & LOCATION BANNER HELPERS
// =========================================================================

function updateClockPill() {
  const btn = document.getElementById("clockBtn");
  if (!btn || !world) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const phase = world.getTimePhase();
  const icon = phase === "night" ? "🌙" : phase === "dusk" ? "🌆" : phase === "dawn" ? "🌅" : "☀";
  const modeTag = world.timeMode === "auto" ? "" : ` · ${world.timeMode.toUpperCase()}`;
  btn.textContent = `${icon} ${timeStr}${modeTag}`;
}

function showLocationBanner(title) {
  const el = document.getElementById("titleBanner");
  if (!el) return;
  el.textContent = title;
  el.classList.remove("hide");
}

// =========================================================================
// BOOTSTRAP
// =========================================================================

async function init() {
  const canvas = document.getElementById("worldCanvas");
  world = new SnapGearPixelWorld(canvas, {
    openCatalog: (opts = {}) => {
      if (opts.supplierId !== undefined) state.catalogFilterSupplier = String(opts.supplierId);
      else state.catalogFilterSupplier = "all";
      openModal("modalCatalog");
    },
    openProductDetail,
    openCart: () => {
      state.lastReceipt = null;
      openModal("modalCart");
    },
    openOrders: () => openModal("modalOrders"),
    openAdmin: (tab) => openModal("modalAdmin", { tab }),
    getPurchasedProducts: () => {
      const products = state.storefront?.products || [];
      const prodById = new Map(products.map((p) => [p.product_id, p]));
      const list = state.myPurchases.length > 0
        ? state.myPurchases
        : (state.storefront?.orders || [])
            .filter((o) => o.order_type === "S")
            .flatMap((o) => o.items);
      return list.map((it) => {
        const p = prodById.get(Number(it.product_id));
        return { product_id: it.product_id, spriteKind: p?.meta?.spriteKind || "handle" };
      });
    },
    showDialogue,
    advanceDialogue,
    closeDialogue,
    isDialogueOpen: () => state.dialogue.open,
    onTimeModeChange: () => updateClockPill(),
    onMapChange: (mapId, title) => {
      document.getElementById("navTown")?.classList.toggle("active", mapId === "town");
      document.getElementById("navHome")?.classList.toggle("active", mapId === "home");
      document.getElementById("navSony")?.classList.toggle("active", mapId === "sony");
      document.getElementById("navGear")?.classList.toggle("active", mapId === "gear");
      document.getElementById("navSqlLab")?.classList.toggle("active", mapId === "sqllab");
      showLocationBanner(title);
    }
  });

  // Top HUD navigation
  document.getElementById("musBtn")?.addEventListener("click", () => {
    const muted = retroAudio.toggleMute();
    document.getElementById("musBtn").classList.toggle("off", muted);
  });

  document.getElementById("navTown")?.addEventListener("click", () => {
    closeDialogue();
    closeAllModals();
    if (world.mapId !== "town") world.switchMap("town", 11, 8, "down");
  });

  document.getElementById("navHome")?.addEventListener("click", () => {
    closeDialogue();
    closeAllModals();
    if (world.mapId !== "home") world.switchMap("home", 9, 10, "up");
  });

  document.getElementById("navSony")?.addEventListener("click", () => {
    closeDialogue();
    closeAllModals();
    if (world.mapId !== "sony") world.switchMap("sony", 9, 10, "up");
  });

  document.getElementById("navGear")?.addEventListener("click", () => {
    closeDialogue();
    closeAllModals();
    if (world.mapId !== "gear") world.switchMap("gear", 9, 10, "up");
  });

  document.getElementById("navCatalog")?.addEventListener("click", () => {
    state.catalogFilterSupplier = "all";
    openModal("modalCatalog");
  });

  document.getElementById("navOrders")?.addEventListener("click", () => openModal("modalOrders"));
  document.getElementById("navCart")?.addEventListener("click", () => {
    state.lastReceipt = null;
    openModal("modalCart");
  });
  document.getElementById("catalogOpenCartBtn")?.addEventListener("click", () => {
    state.lastReceipt = null;
    openModal("modalCart");
  });
  document.getElementById("navSqlLab")?.addEventListener("click", () => {
    closeDialogue();
    if (world.mapId === "sqllab") {
      openModal("modalAdmin");
    } else {
      closeAllModals();
      world.switchMap("sqllab", 9, 10, "up");
    }
  });

  document.getElementById("clockBtn")?.addEventListener("click", () => {
    const mode = world.cycleTimeMode();
    updateClockPill();
    showToast(`Lighting mode: ${mode.toUpperCase()}`);
  });

  document.getElementById("dlg")?.addEventListener("click", (e) => {
    e.stopPropagation();
    advanceDialogue();
  });

  // Clicking/tapping anywhere on the screen advances an open dialogue box
  window.addEventListener("pointerdown", (e) => {
    if (!state.dialogue.open || state.activeModalId) return;
    if (e.target.closest("#dlgActions button") || e.target.closest("#hud-top")) return;
    e.preventDefault();
    e.stopPropagation();
    advanceDialogue();
  }, { capture: true });

  // Close modal buttons & backdrop click & ESC key
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeAllModals());
  });
  document.querySelectorAll(".gba-backdrop").forEach((bd) => {
    bd.addEventListener("click", (e) => {
      if (e.target === bd) closeAllModals();
    });
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.activeModalId) {
      closeAllModals();
    }
  });

  updateClockPill();
  setInterval(updateClockPill, 15000);

  // Load live SQLite data
  await fetchStorefront();

  // Support direct /admin URL inside the exact same single website (no separate admin site)
  if (window.location.pathname.replace(/\/+$/, "") === "/admin") {
    world.switchMap("sqllab", 9, 10, "up");
    setTimeout(() => openModal("modalAdmin"), 320);
  } else {
    // Welcome GBA dialogue
    setTimeout(() => {
      if (!state.activeModalId && state.storefront) {
        showDialogue(
          [
            `${world.getGreeting()}\nWelcome to SNAPGEAR CAMERA TOWN!`,
            `Walk into MY HOME, shop inside SONY PRO & PHOTO GEAR, or step inside SQL ADMIN LAB to manage the live SQLite database.`
          ],
          [
            { label: "🏠 Go to My Home", onClick: () => world.switchMap("home", 9, 10, "up") },
            { label: "📷 Shop Sony Pro", onClick: () => world.switchMap("sony", 9, 10, "up") },
            { label: "🎒 Shop Photo Gear", onClick: () => world.switchMap("gear", 9, 10, "up") },
            { label: "📋 All Catalog", onClick: () => openModal("modalCatalog") }
          ]
        );
      }
    }, 450);
  }

  canvas.focus();
}

init().catch((err) => {
  console.error(err);
  showToast(`Error loading store: ${err.message}`);
});
