const http = require('http');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper to make HTTP requests
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (err) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING E2E API VERIFICATION TESTS ---');
  
  let testUserToken = null;
  let testUserId = null;
  let products = [];

  // 1. Fetch Products
  try {
    const res = await request('GET', '/api/products');
    console.log(`[TEST 1] GET /api/products: Status ${res.statusCode}`);
    if (res.statusCode === 200 && Array.isArray(res.body) && res.body.length > 0) {
      products = res.body;
      console.log(`  SUCCESS: Loaded ${products.length} products from seed data.`);
      products.forEach(p => console.log(`    - ID ${p.id}: ${p.name} ($${p.price}) [Stock: ${p.stock}]`));
    } else {
      throw new Error('Failed to load seeded products');
    }
  } catch (err) {
    console.error('  FAIL:', err.message);
    process.exit(1);
  }

  // 2. Register Test User
  try {
    const registerPayload = {
      username: 'tester_' + Math.floor(Math.random() * 10000),
      email: `test_${Math.floor(Math.random() * 10000)}@example.com`,
      password: 'testpassword123'
    };
    const res = await request('POST', '/api/auth/register', registerPayload);
    console.log(`[TEST 2] POST /api/auth/register: Status ${res.statusCode}`);
    if (res.statusCode === 200 && res.body.token) {
      testUserToken = res.body.token;
      testUserId = res.body.user.id;
      console.log(`  SUCCESS: Registered user "${res.body.user.username}" (ID: ${testUserId})`);
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    console.error('  FAIL:', err.message);
    process.exit(1);
  }

  // 3. User Login
  try {
    const loginPayload = {
      usernameOrEmail: 'testuser_verify',
      password: 'password123'
    };
    
    await request('POST', '/api/auth/register', {
      username: 'testuser_verify',
      email: 'verify@example.com',
      password: 'password123'
    });

    const res = await request('POST', '/api/auth/login', loginPayload);
    console.log(`[TEST 3] POST /api/auth/login: Status ${res.statusCode}`);
    if (res.statusCode === 200 && res.body.token) {
      console.log(`  SUCCESS: Authenticated and received JWT token.`);
    } else {
      throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    console.error('  FAIL:', err.message);
    process.exit(1);
  }

  // 4. Validate Me (Token Auth)
  try {
    const res = await request('GET', '/api/auth/me', null, testUserToken);
    console.log(`[TEST 4] GET /api/auth/me (Protected): Status ${res.statusCode}`);
    if (res.statusCode === 200 && res.body.username) {
      console.log(`  SUCCESS: Verified token. Logged in as: ${res.body.username}`);
    } else {
      throw new Error(`Token validation failed: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    console.error('  FAIL:', err.message);
    process.exit(1);
  }

  // 5. Checkout (Place Order)
  try {
    const orderPayload = {
      items: [
        { productId: 1, quantity: 1 },
        { productId: 3, quantity: 2 }
      ],
      shippingDetails: {
        name: 'Test Verification Admin',
        address: '100 Terminal Street',
        city: 'Binary Town',
        zip: '10101'
      }
    };

    const res = await request('POST', '/api/orders', orderPayload, testUserToken);
    console.log(`[TEST 5] POST /api/orders (Checkout): Status ${res.statusCode}`);
    if (res.statusCode === 201 && res.body.orderId) {
      console.log(`  SUCCESS: Placed order #AET-${res.body.orderId}. Total price: $${res.body.total}`);
    } else {
      throw new Error(`Checkout failed: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    console.error('  FAIL:', err.message);
    process.exit(1);
  }

  // 6. View Order History
  try {
    const res = await request('GET', '/api/orders', null, testUserToken);
    console.log(`[TEST 6] GET /api/orders (History): Status ${res.statusCode}`);
    if (res.statusCode === 200 && Array.isArray(res.body) && res.body.length > 0) {
      console.log(`  SUCCESS: Found ${res.body.length} orders in history.`);
      res.body.forEach(order => {
        console.log(`    Order #AET-${order.id} | Total: $${order.total} | Status: ${order.status}`);
        order.items.forEach(item => {
          console.log(`      - ${item.name} (Qty: ${item.quantity}) at $${item.price} each`);
        });
      });
    } else {
      throw new Error(`Failed to load order history: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    console.error('  FAIL:', err.message);
    process.exit(1);
  }

  console.log('\n--- ALL E2E API VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests();
