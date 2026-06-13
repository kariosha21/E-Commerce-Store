const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../db');

// @route   GET api/products
// @desc    Get all products (with optional category filtering)
router.get('/', async (req, res) => {
  const { category } = req.query;
  try {
    let products;
    if (category) {
      products = await dbAll('SELECT * FROM products WHERE category = ?', [category]);
    } else {
      products = await dbAll('SELECT * FROM products');
    }
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/products/:id
// @desc    Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
