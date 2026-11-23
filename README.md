# SnapGear Camera Store

Direct-to-Consumer (D2C) camera accessories storefront styled as an interactive GBA pixel-art town and walkable camera mart, backed live by SQLite (`node:sqlite`) with a password-protected English SQL Admin Panel.

## Features
- **Interactive Pixel-Art Town & Walkable SnapGear Mart**: Walk with WASD / Arrow keys / Click, inspect buildings and glowing product pedestals, and purchase directly from inside the store.
- **D2C Storefront Catalog & Checkout**: Studio product photos, detailed specs, live NTD pricing & inventory synced directly with SQLite, shopping cart, and atomic Sale (`S`) checkout with SQL receipt.
- **Password-Protected SQL Admin Panel (`/admin`)**: Visual Table Editor (CRUD), multi-statement Raw SQL Console, Business Transactions (`S` / `P` / `R` / `F`), Schema & `.sql` Export, and Reset to Seed SQL.

## Run Locally
```bash
npm start
# Open http://127.0.0.1:3838/
# Admin Panel: http://127.0.0.1:3838/admin
```
