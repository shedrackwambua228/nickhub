require('dotenv').config({ path: ['.env.auth', '.env'] });
const prisma = require('../src/config/db');

const email = `auth-check-${Date.now()}@example.com`;
const baseUrl = `http://127.0.0.1:${process.env.PORT || 4000}`;

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

async function verify() {
  await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'LocalTest123!', displayName: 'Auth Check' })
  });
  const { token } = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'LocalTest123!' })
  });
  await request('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  console.log('Signup, login, and authenticated session verified');
}

verify()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });
