require('dotenv').config({ path: ['.env.auth', '.env'] });
const prisma = require('../src/config/db');

const email = `billing-check-${Date.now()}@example.com`;
const baseUrl = `http://127.0.0.1:${process.env.PORT || 4000}`;

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

async function verify() {
  const signup = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'LocalTest123!', displayName: 'Billing Check' })
  });
  const checkout = await request('/api/billing/checkout-session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${signup.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'artist' })
  });
  const checkoutUrl = new URL(checkout.url);
  if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.paystack.com') {
    throw new Error('Paystack returned an unexpected checkout URL');
  }
  console.log('Authenticated Paystack checkout initialization verified');
}

verify()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });
