PRAGMA foreign_keys = ON;

CREATE TABLE customers (
    customer_id NUMERIC PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE suppliers (
    supplier_id NUMERIC PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE products (
    product_id NUMERIC PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price NUMERIC(8,2),
    supplier_id NUMERIC,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE orders (
    order_id NUMERIC PRIMARY KEY,
    order_type CHAR(1),
    order_date CHAR(10),
    customer_id NUMERIC,
    supplier_id NUMERIC,
    related_order_id NUMERIC,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    FOREIGN KEY (related_order_id) REFERENCES orders(order_id)
);

CREATE TABLE order_items (
    item_id NUMERIC PRIMARY KEY,
    order_id NUMERIC,
    product_id NUMERIC,
    quantity NUMERIC,
    unit_price NUMERIC(8,2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE stock_changes (
    change_id NUMERIC PRIMARY KEY,
    order_id NUMERIC,
    product_id NUMERIC,
    quantity_change NUMERIC,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Initial Customers
INSERT INTO customers VALUES
(1, 'Alex Chen'),
(2, 'Mia Wang'),
(3, 'Jason Lin');

-- Initial Suppliers
INSERT INTO suppliers VALUES
(1, 'Sony Distributor'),
(2, 'Photo Gear Distributor');

-- Initial Products (exact retail pricing in NTD)
INSERT INTO products VALUES
(1, 'Sony NP-FZ100 Battery', 1980, 1),
(2, 'Sony BC-QZ1 Charger', 2480, 1),
(3, 'SanDisk 128GB SD Card', 1550, 2),
(4, 'Manfrotto PIXI Tripod', 990, 2),
(5, 'Sony GP-VPT2BT Grip', 3980, 1);

-- Initial Opening Stock & Sale #1 (Mia Wang buys 2x SanDisk 128GB SD Card)
INSERT INTO orders VALUES
(1, 'S', '2026-11-17', 2, NULL, NULL);

INSERT INTO order_items VALUES
(1, 1, 3, 2, 1550);

INSERT INTO stock_changes VALUES
(1, NULL, 1, 10),
(2, NULL, 2, 8),
(3, NULL, 3, 15),
(4, NULL, 4, 5),
(5, NULL, 5, 4),
(6, 1, 3, -2);

-- Sale #2 (Alex Chen buys 1x Sony NP-FZ100 Battery)
INSERT INTO orders VALUES
(2, 'S', '2026-11-18', 1, NULL, NULL);

INSERT INTO order_items VALUES
(2, 2, 1, 1, 1980);

INSERT INTO stock_changes VALUES
(7, 2, 1, -1);

-- Purchase #3 (Store orders 3x Sony NP-FZ100 Battery from Sony Distributor)
INSERT INTO orders VALUES
(3, 'P', '2026-11-18', NULL, 1, NULL);

INSERT INTO order_items VALUES
(3, 3, 1, 3, 1500);

-- Restock #4 (Sony Distributor delivers Purchase #3: +3 stock)
INSERT INTO orders VALUES
(4, 'R', '2026-11-18', NULL, 1, 3);

INSERT INTO order_items VALUES
(4, 4, 1, 3, 1500);

INSERT INTO stock_changes VALUES
(8, 4, 1, 3);

-- Refund #5 (Alex Chen returns 1x Sony NP-FZ100 Battery from Sale #2: +1 stock)
INSERT INTO orders VALUES
(5, 'F', '2026-11-18', 1, NULL, 2);

INSERT INTO order_items VALUES
(5, 5, 1, 1, 1980);

INSERT INTO stock_changes VALUES
(9, 5, 1, 1);
