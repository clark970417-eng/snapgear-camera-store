# SnapGear Camera Store — D2C E-Commerce & SQLite Database Project

**Live Demo:** https://snapgear-store.vercel.app

SnapGear Camera Store is a Direct-to-Consumer (D2C) camera accessories web application built for a Business Development & SQL Database project. It pairs an interactive pixel-art town and four walkable interiors with a live **SQLite** database (`node:sqlite`) and an in-app **SQL Admin Panel**.

---

## Features

- **Interactive Pixel-Art Town & 4 Walkable Interiors**
  - **MY HOME:** Walkable photographer home displaying purchased gear inside the cabinet, a workstation PC (online catalog), and a bed to preview Day / Dusk / Night lighting.
  - **SONY PRO Store:** Walkable showroom displaying live **Sony Distributor** products from SQLite. Walk up to any pedestal to add items to your cart, then pay at the **CHECKOUT** counter.
  - **PHOTO GEAR Store:** Walkable workshop displaying live **Photo Gear Distributor** products from SQLite with proximity auto-interaction and checkout.
  - **SQL ADMIN LAB:** Walkable server room housing the password-protected, in-app **SQL Admin Panel** (Visual Table Editor, Raw SQL Console, Business Transactions, Schema Inspector, `.sql` Export, and Seed Reset).
- **Direct-to-Consumer (D2C) Storefront & Checkout**
  - Complete product catalog with studio photos, technical specifications, supplier badges, live stock calculated from `stock_changes`, shopping cart, and atomic SQLite checkout receipts showing the exact SQL `INSERT` statements executed.
- **100% Live Database Consistency**
  - Every product name, retail price (NTD), supplier, customer, order, and inventory count displayed on the storefront is queried directly from SQLite. Editing rows or running SQL in the Admin Panel updates the storefront and walkable store pedestals immediately.

---

## SQLite Database Schema

The database uses 6 normalized tables with foreign keys enabled (`PRAGMA foreign_keys = ON`) defined in [`data/schema.sql`](data/schema.sql):

| Table | Purpose | Primary Key |
| :--- | :--- | :--- |
| `customers` | Customer directory | `customer_id` |
| `suppliers` | Authorized camera gear distributors | `supplier_id` |
| `products` | Product catalog, retail prices (NTD), and supplier links | `product_id` |
| `orders` | Business transactions (`S` Sale, `P` Purchase, `R` Restock, `F` Refund) | `order_id` |
| `order_items` | Line items linking orders and products with quantity & unit price | `item_id` |
| `stock_changes` | Inventory audit ledger computing real-time stock per product | `change_id` |

### Initial Product Catalog (NTD)

| ID | Product | Retail Price (NTD) | Supplier | Initial Net Stock |
| :---: | :--- | :---: | :--- | :---: |
| 1 | Sony NP-FZ100 Battery | NT$1,980 | Sony Distributor | 13 |
| 2 | Sony BC-QZ1 Charger | NT$2,480 | Sony Distributor | 8 |
| 3 | SanDisk 128GB SD Card | NT$1,550 | Photo Gear Distributor | 13 |
| 4 | Manfrotto PIXI Tripod | NT$990 | Photo Gear Distributor | 5 |
| 5 | Sony GP-VPT2BT Grip | NT$3,980 | Sony Distributor | 4 |

### Supported SQL Transactions

| Type | Transaction | Tables Updated |
| :---: | :--- | :--- |
| `S` | Customer Sale | `orders`, `order_items`, `stock_changes` (`-qty`) |
| `P` | Supplier Purchase Order | `orders`, `order_items` |
| `R` | Supplier Restock Delivery | `orders` (`related_order_id`), `order_items`, `stock_changes` (`+qty`) |
| `F` | Customer Refund | `orders` (`related_order_id`), `order_items`, `stock_changes` (`+qty`) |

---

## Run Locally

Requires Node.js 22.5+ (or Node.js 24+ with built-in `node:sqlite`, zero npm dependencies required):

```bash
npm start
# Open http://127.0.0.1:3838/
```

To reset the local SQLite database back to the original seed data:

```bash
npm run reset-db
```
