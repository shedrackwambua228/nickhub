const crypto = require('crypto');
const prisma = require('../config/db');
const { getSecretKey, paystackRequest } = require('../config/paystack');

const PLAN_CODES = { artist: process.env.PAYSTACK_PLAN_ARTIST, label: process.env.PAYSTACK_PLAN_LABEL };
const planForCode = (code) => Object.entries(PLAN_CODES).find(([, value]) => value === code)?.[0];
function metadataOf(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

async function createCheckoutSession(req, res) {
  const { plan } = req.body;
  const planCode = PLAN_CODES[plan];
  if (!planCode) return res.status(400).json({ error: 'Choose the Artist or Pro Label plan' });
  const configuredPlan = await paystackRequest(`/plan/${encodeURIComponent(planCode)}`);
  const reference = `nickhub-${req.user.id}-${Date.now()}`;
  const data = await paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: req.user.email,
      amount: configuredPlan.amount,
      currency: configuredPlan.currency,
      plan: planCode,
      reference,
      callback_url: `${process.env.CLIENT_URL}/billing/success`,
      metadata: JSON.stringify({ userId: req.user.id, plan })
    })
  });
  res.json({ url: data.authorization_url, reference: data.reference });
}

async function confirmCheckoutSession(req, res) {
  const reference = req.body.reference || req.body.sessionId;
  if (!reference || typeof reference !== 'string') return res.status(400).json({ error: 'Payment reference is required' });
  const transaction = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
  const metadata = metadataOf(transaction.metadata);
  const planCode = transaction.plan?.plan_code || transaction.plan_object?.plan_code;
  const plan = metadata.plan || planForCode(planCode);
  if (transaction.status !== 'success') return res.status(409).json({ error: 'Payment has not completed' });
  if (transaction.customer?.email?.toLowerCase() !== req.user.email.toLowerCase() || metadata.userId !== req.user.id) {
    return res.status(403).json({ error: 'Payment does not belong to this account' });
  }
  if (!plan || PLAN_CODES[plan] !== planCode) return res.status(409).json({ error: 'Payment plan could not be verified' });
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      subscriptionId: transaction.subscription?.subscription_code || reference,
      subscriptionPlan: plan,
      subscriptionStatus: 'ACTIVE'
    }
  });
  res.json({ status: 'ACTIVE', plan });
}

async function createPortalSession(req, res) {
  if (!req.user.subscriptionId?.startsWith('SUB_')) {
    return res.status(400).json({ error: 'Subscription management will be available after Paystack confirms the subscription' });
  }
  const subscription = await paystackRequest(`/subscription/${encodeURIComponent(req.user.subscriptionId)}`);
  if (!subscription.manage_link) return res.status(409).json({ error: 'Paystack did not return a subscription management link' });
  res.json({ url: subscription.manage_link });
}

async function getSubscriptionStatus(req, res) {
  res.json({ status: req.user.subscriptionStatus, plan: req.user.subscriptionPlan, currentPeriodEnd: req.user.currentPeriodEnd });
}

async function updateUserByEmail(email, data) {
  if (!email) return;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (user) await prisma.user.update({ where: { id: user.id }, data });
}

async function handleWebhook(req, res) {
  const signature = req.headers['x-paystack-signature'];
  const expected = crypto.createHmac('sha512', getSecretKey()).update(req.body).digest('hex');
  const supplied = typeof signature === 'string' ? signature : '';
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  const event = JSON.parse(req.body.toString('utf8'));
  const data = event.data || {};
  const email = data.customer?.email;
  const plan = planForCode(data.plan?.plan_code || data.plan?.planCode);
  switch (event.event) {
    case 'subscription.create':
      await updateUserByEmail(email, {
        subscriptionId: data.subscription_code,
        subscriptionPlan: plan,
        subscriptionStatus: 'ACTIVE',
        currentPeriodEnd: data.next_payment_date ? new Date(data.next_payment_date) : null
      });
      break;
    case 'invoice.update': {
      if (data.paid || data.status === 'success') {
        const update = { subscriptionStatus: 'ACTIVE' };
        if (data.subscription?.next_payment_date) update.currentPeriodEnd = new Date(data.subscription.next_payment_date);
        await updateUserByEmail(email, update);
      }
      break;
    }
    case 'invoice.payment_failed':
      await updateUserByEmail(email, { subscriptionStatus: 'PAST_DUE' });
      break;
    case 'subscription.disable':
      await updateUserByEmail(email, { subscriptionStatus: 'CANCELED' });
      break;
    default:
      break;
  }
  res.json({ received: true });
}

module.exports = { createCheckoutSession, createPortalSession, confirmCheckoutSession, getSubscriptionStatus, handleWebhook };
