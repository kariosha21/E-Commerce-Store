const express = require('express');
const router = express.Router();
const { dbRun, dbAll, dbGet } = require('../db');
const auth = require('../middleware/auth');

// @route   POST api/orders
// @desc    Create a new order (Checkout)
// @access  Private
router.post('/', auth, async (req, res) => {
  const { items, shippingDetails } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'No items in order' });
  }

  if (!shippingDetails || !shippingDetails.name || !shippingDetails.address || !shippingDetails.city || !shippingDetails.zip) {
    return res.status(400).json({ message: 'Missing shipping details' });
  }

  try {
    let total = 0;
    const validatedItems = [];

    // Validate products, stock, and calculate total
    for (const item of items) {
      const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.productId]);
      if (!product) {
        return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
      }

      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      validatedItems.push({
        product,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Create the order
    const orderResult = await dbRun(
      `INSERT INTO orders (user_id, total, status, shipping_name, shipping_address, shipping_city, shipping_zip)
       VALUES (?, ?, 'Pending', ?, ?, ?, ?)`,
      [
        req.user.id,
        total,
        shippingDetails.name,
        shippingDetails.address,
        shippingDetails.city,
        shippingDetails.zip
      ]
    );

    const orderId = orderResult.lastID;

    // Create order items and decrement stock
    for (const item of validatedItems) {
      await dbRun(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product.id, item.quantity, item.price]
      );

      // Update stock
      await dbRun(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product.id]
      );
    }

    res.status(201).json({
      message: 'Order placed successfully',
      orderId,
      total
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders
// @desc    Get user's order history
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const orders = await dbAll(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    const ordersWithItems = [];

    for (const order of orders) {
      const items = await dbAll(
        `SELECT oi.id, oi.quantity, oi.price, p.name, p.image, p.category 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      ordersWithItems.push({
        ...order,
        items
      });
    }

    res.json(ordersWithItems);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;const express = require('express');
const router = express.Router();
const { dbRun, dbAll, dbGet } = require('../db');
const auth = require('../middleware/auth');

// @route   POST api/orders
// @desc    Create a new order (Checkout)
// @access  Private
router.post('/', auth, async (req, res) => {
  const { items, shippingDetails } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'No items in order' });
  }

  if (!shippingDetails || !shippingDetails.name || !shippingDetails.address || !shippingDetails.city || !shippingDetails.zip) {
    return res.status(400).json({ message: 'Missing shipping details' });
  }

  try {
    let total = 0;
    const validatedItems = [];

    // Validate products, stock, and calculate total
    for (const item of items) {
      const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.productId]);
      if (!product) {
        return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
      }

      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      validatedItems.push({
        product,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Create the order
    const orderResult = await dbRun(
      `INSERT INTO orders (user_id, total, status, shipping_name, shipping_address, shipping_city, shipping_zip)
       VALUES (?, ?, 'Pending', ?, ?, ?, ?)`,
      [
        req.user.id,
        total,
        shippingDetails.name,
        shippingDetails.address,
        shippingDetails.city,
        shippingDetails.zip
      ]
    );

    const orderId = orderResult.lastID;

    // Create order items and decrement stock
    for (const item of validatedItems) {
      await dbRun(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product.id, item.quantity, item.price]
      );

      // Update stock
      await dbRun(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product.id]
      );
    }

    res.status(201).json({
      message: 'Order placed successfully',
      orderId,
      total
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders
// @desc    Get user's order history
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const orders = await dbAll(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    const ordersWithItems = [];

    for (const order of orders) {
      const items = await dbAll(
        `SELECT oi.id, oi.quantity, oi.price, p.name, p.image, p.category 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      ordersWithItems.push({
        ...order,
        items
      });
    }

    res.json(ordersWithItems);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
