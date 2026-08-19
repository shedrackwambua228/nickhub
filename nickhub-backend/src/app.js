require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const { handleWebhook } = require('./controllers/billing.controller');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Stripe webhook must receive the raw body to verify its signature —
// mount it BEFORE express.json() and keep it out of the regular billing router.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json({ limit: '2mb' }));

// Basic rate limiting on the API surface
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/releases', require('./routes/releases.routes'));
app.use('/api/royalties', require('./routes/royalties.routes'));
app.use('/api/withdrawals', require('./routes/withdrawals.routes'));
app.use('/api/support', require('./routes/support.routes'));
app.use('/api/billing', require('./routes/billing.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
