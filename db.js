const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'store.db');
const db = new DatabaseSync(dbPath);
console.log('Connected to the built-in SQLite database.');

// Helper functions for DB queries returning Promises (preserving API compatibility)
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      resolve({
        changes: result.changes,
        lastID: result.lastInsertRowid
      });
    } catch (err) {
      reject(err);
    }
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const row = stmt.get(...params);
      resolve(row);
    } catch (err) {
      reject(err);
    }
  });
};

async function initDb() {
  // Create tables
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 10,
      featured INTEGER DEFAULT 0
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'Pending',
      shipping_name TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      shipping_zip TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `);

  // Seed products if empty
  const countRow = await dbGet('SELECT COUNT(*) as count FROM products');
  if (countRow.count === 0) {
    console.log('Seeding initial products...');
    const seedProducts = [
      {
        name: 'Aether Studio Headphones',
        description: 'Premium active noise-cancelling over-ear headphones with custom spatial audio, 40-hour battery life, and high-fidelity sound. Designed with memory foam cups and an aluminum frame for ultimate comfort.',
        price: 299.99,
        image: '/assets/headphones.png',
        category: 'Audio',
        stock: 15,
        featured: 1
      },
      {
        name: 'Aether Neo Mechanical Keyboard',
        description: 'Minimalist 75% mechanical keyboard with hot-swappable custom linear tactile switches, sound-dampening foam, premium PBT keycaps, and dynamic RGB underglow. Crafted for high-speed typing and gaming.',
        price: 189.99,
        image: '/assets/keyboard.png',
        category: 'Desk Accessories',
        stock: 20,
        featured: 1
      },
      {
        name: 'Aether Ambient Lamp',
        description: 'A sleek, minimalist smart LED light bar featuring sound-reactive ambient lighting, HSL custom color wheel, and wireless app control. Perfect for adding a warm, responsive glow to your work setup.',
        price: 79.99,
        image: '/assets/lamp.png',
        category: 'Lighting',
        stock: 30,
        featured: 1
      },
      {
        name: 'Aether Chrono Smart Watch',
        description: 'Titanium-alloy body smart watch featuring an always-on 1.4-inch AMOLED display, fitness/sleep tracking, blood-oxygen monitoring, and up to 14 days of battery life. Waterproof up to 50 meters.',
        price: 349.99,
        image: '/assets/watch.png',
        category: 'Wearables',
        stock: 12,
        featured: 0
      },
      {
        name: 'Aether Precision Grip Mouse',
        description: 'Ultra-lightweight wireless gaming mouse with 26K DPI optical sensor, optical switches, and an ergonomic design for precision and speed. Up to 80 hours of lag-free performance.',
        price: 129.99,
        image: '/assets/mouse.png',
        category: 'Desk Accessories',
        stock: 25,
        featured: 0
      }
    ];

    for (const p of seedProducts) {
      await dbRun(
        'INSERT INTO products (name, description, price, image, category, stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [p.name, p.description, p.price, p.image, p.category, p.stock, p.featured]
      );
    }
    console.log('Database seeded successfully.');
  }
}

module.exports = {
  db,
  dbRun,
  dbAll,
  dbGet,
  initDb
};
