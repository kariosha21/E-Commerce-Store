// Application State
const state = {
  user: null,
  cart: [],
  products: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initUser();
  initCart();
  setupGlobalEventListeners();
  handleRouting();
});

// Toast Notification Manager
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-xmark';
  if (type === 'info') icon = 'fa-circle-info';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger CSS transition
  setTimeout(() => {
    toast.classList.add('show');
  }, 50);

  // Remove after 3.5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// User Session Management
function initUser() {
  const token = localStorage.getItem('aether_token');
  const userStr = localStorage.getItem('aether_user');
  
  if (token && userStr) {
    state.user = {
      token,
      ...JSON.parse(userStr)
    };
    updateAuthUI(true);
  } else {
    updateAuthUI(false);
  }
}

function saveUserSession(token, user) {
  localStorage.setItem('aether_token', token);
  localStorage.setItem('aether_user', JSON.stringify(user));
  state.user = { token, ...user };
  updateAuthUI(true);
}

function clearUserSession() {
  localStorage.removeItem('aether_token');
  localStorage.removeItem('aether_user');
  state.user = null;
  updateAuthUI(false);
  showToast('Logged out successfully', 'info');
  window.location.hash = '#shop';
}

function updateAuthUI(isLoggedIn) {
  const navAuth = document.getElementById('nav-auth');
  const navOrders = document.getElementById('nav-orders');
  const userGreeting = document.getElementById('user-greeting');
  const greetingUsername = document.getElementById('greeting-username');

  if (isLoggedIn) {
    navAuth.classList.add('hidden');
    navOrders.classList.remove('hidden');
    userGreeting.classList.remove('hidden');
    greetingUsername.textContent = state.user.username;
  } else {
    navAuth.classList.remove('hidden');
    navOrders.classList.add('hidden');
    userGreeting.classList.add('hidden');
  }
}

// Cart Management
function initCart() {
  const storedCart = localStorage.getItem('aether_cart');
  if (storedCart) {
    state.cart = JSON.parse(storedCart);
  }
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('aether_cart', JSON.stringify(state.cart));
  updateCartUI();
}

function addToCart(product, quantity = 1) {
  const existingItem = state.cart.find(item => item.product.id === product.id);
  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (newQty > product.stock) {
      showToast(`Cannot add more. Available stock: ${product.stock}`, 'error');
      return;
    }
    existingItem.quantity = newQty;
  } else {
    if (quantity > product.stock) {
      showToast(`Cannot add. Available stock: ${product.stock}`, 'error');
      return;
    }
    state.cart.push({ product, quantity });
  }
  saveCart();
  showToast(`${product.name} added to bag.`);
}

function updateCartQuantity(productId, quantity) {
  const item = state.cart.find(item => item.product.id === productId);
  if (!item) return;

  if (quantity <= 0) {
    state.cart = state.cart.filter(item => item.product.id !== productId);
  } else {
    if (quantity > item.product.stock) {
      showToast(`Only ${item.product.stock} units available in stock.`, 'error');
      return;
    }
    item.quantity = quantity;
  }
  saveCart();
}

function clearCart() {
  state.cart = [];
  saveCart();
}

function updateCartUI() {
  const cartBadge = document.getElementById('cart-count');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartTotalPrice = document.getElementById('cart-total-price');

  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  cartBadge.textContent = totalCount;

  if (state.cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="cart-empty-message">
        <i class="fa-solid fa-bag-shopping"></i>
        <p>Your bag is currently empty.</p>
        <a href="#shop" class="btn btn-secondary" id="cart-empty-shop-btn">Go Shopping</a>
      </div>
    `;
    cartTotalPrice.textContent = '$0.00';
    
    // Bind shop button in cart
    const emptyShopBtn = document.getElementById('cart-empty-shop-btn');
    if (emptyShopBtn) {
      emptyShopBtn.addEventListener('click', () => {
        closeCartDrawer();
      });
    }
    return;
  }

  let subtotal = 0;
  cartItemsContainer.innerHTML = '';

  state.cart.forEach(item => {
    const itemTotal = item.product.price * item.quantity;
    subtotal += itemTotal;

    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <img src="${item.product.image}" alt="${item.product.name}" class="cart-item-img">
      <div class="cart-item-details">
        <div class="cart-item-title">${item.product.name}</div>
        <div class="cart-item-category">${item.product.category}</div>
        <div class="cart-item-actions">
          <div class="cart-qty">
            <button class="cart-qty-btn decrease-qty" data-id="${item.product.id}"><i class="fa-solid fa-minus"></i></button>
            <span class="cart-qty-val">${item.quantity}</span>
            <button class="cart-qty-btn increase-qty" data-id="${item.product.id}"><i class="fa-solid fa-plus"></i></button>
          </div>
          <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
        </div>
      </div>
    `;
    cartItemsContainer.appendChild(itemEl);
  });

  cartTotalPrice.textContent = `$${subtotal.toFixed(2)}`;

  // Bind cart quantity buttons
  document.querySelectorAll('.decrease-qty').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.dataset.id);
      const currentItem = state.cart.find(item => item.product.id === id);
      if (currentItem) updateCartQuantity(id, currentItem.quantity - 1);
    });
  });

  document.querySelectorAll('.increase-qty').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.dataset.id);
      const currentItem = state.cart.find(item => item.product.id === id);
      if (currentItem) updateCartQuantity(id, currentItem.quantity + 1);
    });
  });
}

// Drawer Toggle Handlers
function openCartDrawer() {
  document.getElementById('cart-drawer').classList.add('open');
}

function closeCartDrawer() {
  document.getElementById('cart-drawer').classList.remove('open');
}

// Routing & View Injectors
window.addEventListener('hashchange', handleRouting);

function handleRouting() {
  const hash = window.location.hash || '#shop';
  const viewport = document.getElementById('app-viewport');
  
  // Close cart drawer on route change
  closeCartDrawer();

  // Scroll to top
  window.scrollTo(0, 0);

  // Update navbar active link
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === hash.split('?')[0]) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Route: #shop (with categories query)
  if (hash.startsWith('#shop')) {
    const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    const category = params.get('category');
    renderShopView(viewport, category);
    return;
  }

  // Route: #product/:id
  if (hash.startsWith('#product/')) {
    const id = parseInt(hash.split('/')[1]);
    renderProductDetailView(viewport, id);
    return;
  }

  // Route: #auth
  if (hash === '#auth') {
    if (state.user) {
      window.location.hash = '#shop';
    } else {
      renderAuthView(viewport);
    }
    return;
  }

  // Route: #checkout
  if (hash === '#checkout') {
    if (!state.user) {
      showToast('Please sign in to place an order', 'info');
      localStorage.setItem('redirect_after_auth', '#checkout');
      window.location.hash = '#auth';
    } else if (state.cart.length === 0) {
      showToast('Your cart is empty', 'error');
      window.location.hash = '#shop';
    } else {
      renderCheckoutView(viewport);
    }
    return;
  }

  // Route: #orders
  if (hash === '#orders') {
    if (!state.user) {
      window.location.hash = '#auth';
    } else {
      renderOrdersView(viewport);
    }
    return;
  }

  // Fallback 404
  viewport.innerHTML = `
    <div style="text-align: center; padding: 5rem 0;">
      <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">View Not Found</h2>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">The page you are looking for does not exist.</p>
      <a href="#shop" class="btn btn-primary">Back to Shop</a>
    </div>
  `;
}

// VIEW: Shop / Catalog
async function renderShopView(container, filterCategory = null) {
  container.innerHTML = `
    <section class="hero">
      <span class="hero-tagline">Exquisite Design meets high acoustics</span>
      <h1 class="hero-title">Refining Daily Tools</h1>
      <p class="hero-subtitle">Meticulously crafted smart instruments, custom acoustic headphones, and ambient lights designed to enhance visual and sonic environments.</p>
    </section>

    <div class="category-tabs">
      <button class="tab-btn ${!filterCategory ? 'active' : ''}" data-cat="">All Artifacts</button>
      <button class="tab-btn ${filterCategory === 'Audio' ? 'active' : ''}" data-cat="Audio">Acoustics</button>
      <button class="tab-btn ${filterCategory === 'Desk Accessories' ? 'active' : ''}" data-cat="Desk Accessories">Desk Accessories</button>
      <button class="tab-btn ${filterCategory === 'Lighting' ? 'active' : ''}" data-cat="Lighting">Ambient Light</button>
      <button class="tab-btn ${filterCategory === 'Wearables' ? 'active' : ''}" data-cat="Wearables">Wearables</button>
    </div>

    <div class="product-grid" id="products-list-grid">
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 0; color: var(--text-secondary)">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <p>Gathering items from the database...</p>
      </div>
    </div>
  `;

  // Bind category tabs clicks
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = btn.dataset.cat;
      if (cat) {
        window.location.hash = `#shop?category=${encodeURIComponent(cat)}`;
      } else {
        window.location.hash = '#shop';
      }
    });
  });

  try {
    const url = filterCategory ? `/api/products?category=${encodeURIComponent(filterCategory)}` : '/api/products';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch products');
    const products = await res.json();
    state.products = products; // Cache in state

    const grid = document.getElementById('products-list-grid');
    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 0; color: var(--text-secondary)">
          <p>No products found in this category.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="product-image-wrapper">
          <img src="${p.image}" alt="${p.name}">
          <span class="product-category-badge">${p.category}</span>
        </div>
        <div class="product-card-body">
          <h3 class="product-title">${p.name}</h3>
          <p class="product-desc-excerpt">${p.description}</p>
          <div class="product-card-footer">
            <span class="product-price">$${p.price.toFixed(2)}</span>
            <div style="display: flex; gap: 0.5rem;">
              <a href="#product/${p.id}" class="btn btn-secondary btn-icon-small" title="View Details"><i class="fa-solid fa-eye"></i></a>
              <button class="btn btn-primary add-to-cart-btn" data-id="${p.id}"><i class="fa-solid fa-plus"></i> Bag</button>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // Bind add to cart click listeners
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = parseInt(btn.dataset.id);
        const product = state.products.find(p => p.id === id);
        if (product) {
          addToCart(product);
        }
      });
    });

  } catch (err) {
    console.error(err);
    document.getElementById('products-list-grid').innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 0; color: var(--accent-rose)">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
        <p>Error listing items. Please check if server is active.</p>
      </div>
    `;
  }
}

// VIEW: Product Details
async function renderProductDetailView(container, id) {
  container.innerHTML = `
    <div style="text-align: center; padding: 5rem 0; color: var(--text-secondary)">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
      <p>Consulting product catalog...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) {
      if (res.status === 404) {
        container.innerHTML = `
          <div style="text-align: center; padding: 5rem 0;">
            <h2>Product Not Found</h2>
            <a href="#shop" class="btn btn-primary" style="margin-top: 1.5rem">Back to Shop</a>
          </div>
        `;
        return;
      }
      throw new Error('Failed to fetch product');
    }
    const p = await res.json();

    let stockText = 'In Stock';
    let stockClass = 'stock-tag';
    if (p.stock === 0) {
      stockText = 'Out of Stock';
      stockClass = 'stock-tag out';
    } else if (p.stock <= 5) {
      stockText = `Low Stock: Only ${p.stock} Left`;
      stockClass = 'stock-tag low';
    }

    container.innerHTML = `
      <div class="detail-container">
        <div>
          <a href="#shop" class="detail-back-link"><i class="fa-solid fa-arrow-left"></i> Back to Shop</a>
          <div class="detail-image-box">
            <img src="${p.image}" alt="${p.name}">
          </div>
        </div>
        <div class="detail-info">
          <span class="detail-category">${p.category}</span>
          <h1 class="detail-title">${p.name}</h1>
          
          <div class="detail-price-row">
            <span class="detail-price">$${p.price.toFixed(2)}</span>
          </div>

          <p class="detail-desc">${p.description}</p>

          <div class="detail-meta">
            <div class="detail-meta-item">
              <span class="detail-meta-label">Availability</span>
              <span class="detail-meta-value ${stockClass}">${stockText}</span>
            </div>
            <div class="detail-meta-item">
              <span class="detail-meta-label">Delivery</span>
              <span class="detail-meta-value">Free Express Shipping</span>
            </div>
          </div>

          <div class="detail-actions">
            ${p.stock > 0 ? `
              <div class="qty-picker">
                <button class="qty-btn" id="detail-qty-minus"><i class="fa-solid fa-minus"></i></button>
                <span class="qty-value" id="detail-qty-val">1</span>
                <button class="qty-btn" id="detail-qty-plus"><i class="fa-solid fa-plus"></i></button>
              </div>
              <button class="btn btn-primary" id="detail-add-btn" style="flex: 1"><i class="fa-solid fa-bag-shopping"></i> Add to Bag</button>
            ` : `
              <button class="btn btn-secondary btn-full" disabled>Out of Stock</button>
            `}
          </div>
        </div>
      </div>
    `;

    if (p.stock > 0) {
      const qtyVal = document.getElementById('detail-qty-val');
      let currentQty = 1;

      document.getElementById('detail-qty-minus').addEventListener('click', () => {
        if (currentQty > 1) {
          currentQty--;
          qtyVal.textContent = currentQty;
        }
      });

      document.getElementById('detail-qty-plus').addEventListener('click', () => {
        if (currentQty < p.stock) {
          currentQty++;
          qtyVal.textContent = currentQty;
        } else {
          showToast(`Limit reached. Available stock: ${p.stock}`, 'error');
        }
      });

      document.getElementById('detail-add-btn').addEventListener('click', () => {
        addToCart(p, currentQty);
      });
    }

  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div style="text-align: center; padding: 5rem 0; color: var(--accent-rose)">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
        <p>Failed to load product details.</p>
        <a href="#shop" class="btn btn-primary" style="margin-top: 1.5rem">Back to Shop</a>
      </div>
    `;
  }
}

// VIEW: Authentication (Login/Register)
function renderAuthView(container) {
  container.innerHTML = `
    <div class="container-narrow">
      <div class="auth-card">
        <div class="auth-tabs">
          <div class="auth-tab active" id="tab-login">Login</div>
          <div class="auth-tab" id="tab-register">Register</div>
        </div>

        <!-- Login Form -->
        <form id="login-form" class="auth-form-view">
          <div class="form-group">
            <label for="login-username">Username or Email</label>
            <input type="text" id="login-username" class="form-control" placeholder="Enter username or email" required>
          </div>
          <div class="form-group" style="margin-bottom: 2rem;">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" class="form-control" placeholder="Enter password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full">Sign In</button>
        </form>

        <!-- Register Form -->
        <form id="register-form" class="auth-form-view hidden">
          <div class="form-group">
            <label for="reg-username">Username</label>
            <input type="text" id="reg-username" class="form-control" placeholder="Choose a username" required>
          </div>
          <div class="form-group">
            <label for="reg-email">Email Address</label>
            <input type="email" id="reg-email" class="form-control" placeholder="name@example.com" required>
          </div>
          <div class="form-group" style="margin-bottom: 2rem;">
            <label for="reg-password">Password</label>
            <input type="password" id="reg-password" class="form-control" placeholder="Create password (min 6 chars)" minlength="6" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full">Create Account</button>
        </form>
      </div>
    </div>
  `;

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  // Submit Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameOrEmail = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      saveUserSession(data.token, data.user);
      showToast(`Welcome back, ${data.user.username}!`);
      
      const redirect = localStorage.getItem('redirect_after_auth') || '#shop';
      localStorage.removeItem('redirect_after_auth');
      window.location.hash = redirect;

    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Submit Register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      saveUserSession(data.token, data.user);
      showToast(`Account created! Welcome, ${data.user.username}`);
      
      const redirect = localStorage.getItem('redirect_after_auth') || '#shop';
      localStorage.removeItem('redirect_after_auth');
      window.location.hash = redirect;

    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// VIEW: Checkout
function renderCheckoutView(container) {
  let subtotal = 0;
  let summaryItemsHtml = '';

  state.cart.forEach(item => {
    const cost = item.product.price * item.quantity;
    subtotal += cost;
    summaryItemsHtml += `
      <div class="summary-item">
        <div>
          <span class="summary-item-name">${item.product.name}</span>
          <span class="summary-item-qty">x${item.quantity}</span>
        </div>
        <span class="summary-item-price">$${cost.toFixed(2)}</span>
      </div>
    `;
  });

  const shipping = 0.00;
  const total = subtotal + shipping;

  container.innerHTML = `
    <div class="checkout-container">
      <div class="checkout-form-box">
        <h2 class="checkout-title">Shipping Address</h2>
        <form id="checkout-form">
          <div class="form-group">
            <label for="ship-name">Full Name</label>
            <input type="text" id="ship-name" class="form-control" placeholder="John Doe" required>
          </div>
          <div class="form-group">
            <label for="ship-address">Street Address</label>
            <input type="text" id="ship-address" class="form-control" placeholder="123 Minimalist Way" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="ship-city">City</label>
              <input type="text" id="ship-city" class="form-control" placeholder="San Francisco" required>
            </div>
            <div class="form-group">
              <label for="ship-zip">ZIP Code</label>
              <input type="text" id="ship-zip" class="form-control" placeholder="94105" required>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top: 1.5rem">Place Your Order</button>
        </form>
      </div>

      <div class="checkout-summary-box">
        <h3 class="checkout-title" style="font-size: 1.35rem; margin-bottom: 1.5rem;">Bag Summary</h3>
        <div class="summary-items">
          ${summaryItemsHtml}
        </div>
        <div class="summary-totals">
          <div class="summary-total-row">
            <span style="color: var(--text-secondary)">Subtotal</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          <div class="summary-total-row">
            <span style="color: var(--text-secondary)">Shipping</span>
            <span>FREE</span>
          </div>
          <div class="summary-total-row grand-total">
            <span>Total</span>
            <span style="color: var(--text-primary)">$${total.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="checkout-demo-notice">
          <i class="fa-solid fa-circle-info"></i>
          <span>This is a secure checkout demonstration.</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const shippingDetails = {
      name: document.getElementById('ship-name').value,
      address: document.getElementById('ship-address').value,
      city: document.getElementById('ship-city').value,
      zip: document.getElementById('ship-zip').value
    };

    const orderPayload = {
      items: state.cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      })),
      shippingDetails
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.user.token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Order placement failed');

      showToast('Order placed successfully! Thank you.', 'success');
      clearCart();
      window.location.hash = '#orders';

    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// VIEW: Order History
async function renderOrdersView(container) {
  container.innerHTML = `
    <div class="orders-header">
      <h1 class="orders-title">Your Orders</h1>
      <p style="color: var(--text-secondary); margin-top: 0.5rem">View and track your minimalist design order logs.</p>
    </div>
    
    <div id="orders-list-container" class="orders-list">
      <div style="text-align: center; padding: 4rem 0; color: var(--text-secondary)">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <p>Loading your order logs...</p>
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/orders', {
      headers: {
        'Authorization': `Bearer ${state.user.token}`
      }
    });

    if (!res.ok) throw new Error('Failed to fetch orders');
    const orders = await res.json();

    const listContainer = document.getElementById('orders-list-container');

    if (orders.length === 0) {
      listContainer.innerHTML = `
        <div class="orders-empty-state">
          <i class="fa-solid fa-box-open"></i>
          <h3>No Orders Placed Yet</h3>
          <p style="color: var(--text-secondary)">Your design archives are empty. Ready to select your first tools?</p>
          <a href="#shop" class="btn btn-primary">Browse Shop</a>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    orders.forEach(order => {
      const dateStr = new Date(order.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const orderCard = document.createElement('div');
      orderCard.className = 'order-card';

      let itemsHtml = '';
      order.items.forEach(item => {
        itemsHtml += `
          <div class="order-item-row">
            <img src="${item.image}" alt="${item.name}" class="order-item-img">
            <div class="order-item-desc">
              <div class="order-item-name">${item.name}</div>
              <div class="order-item-qty">Quantity: ${item.quantity} &nbsp;&bull;&nbsp; Category: ${item.category}</div>
            </div>
            <div class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        `;
      });

      orderCard.innerHTML = `
        <div class="order-card-header">
          <div class="order-meta-info">
            <div class="order-meta-block">
              <span class="order-meta-label">Order Reference</span>
              <span class="order-meta-val">#AET-${order.id}</span>
            </div>
            <div class="order-meta-block">
              <span class="order-meta-label">Date Placed</span>
              <span class="order-meta-val">${dateStr}</span>
            </div>
            <div class="order-meta-block">
              <span class="order-meta-label">Total Amount</span>
              <span class="order-meta-val price">$${order.total.toFixed(2)}</span>
            </div>
            <div class="order-meta-block">
              <span class="order-meta-label">Ship To</span>
              <span class="order-meta-val">${order.shipping_name}</span>
            </div>
          </div>
          <span class="order-status-badge status-pending">${order.status}</span>
        </div>
        <div class="order-card-body">
          <div class="order-items-grid">
            ${itemsHtml}
          </div>
        </div>
      `;
      listContainer.appendChild(orderCard);
    });

  } catch (err) {
    console.error(err);
    document.getElementById('orders-list-container').innerHTML = `
      <div style="text-align: center; padding: 4rem 0; color: var(--accent-rose)">
        <i class="fa-solid fa-circle-exclamation" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
        <p>Failed to retrieve orders. Please check your connection.</p>
      </div>
    `;
  }
}

// GLOBAL LISTENERS & UI EVENTS
function setupGlobalEventListeners() {
  const cartToggleBtn = document.getElementById('cart-toggle-btn');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCartDrawer);
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      closeCartDrawer();
      window.location.hash = '#checkout';
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', clearUserSession);
  }
}
