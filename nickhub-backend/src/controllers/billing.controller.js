const stripe = require('../config/stripe');
const prisma = require('../config/db');

// These map to Prices you create once in the Stripe Dashboard (or via API) —
// see README.md for the exact steps. $2.99/month and $25.00/year.
const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY
};

async function createCheckoutSession(req, res) {
  const { plan } = req.body; // 'monthly' | 'yearly'
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return res.status(400).json({ error: 'plan must be "monthly" or "yearly"' });
  }

  let customerId = req.user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.displayName,
      metadata: { userId: req.user.id }
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { stripeCustomerId: customerId }
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/billing/cancelled`,
    metadata: { userId: req.user.id, plan }
  });

  res.json({ url: session.url });
}

// Lets a user manage/cancel their subscription via Stripe's hosted portal.
async function createPortalSession(req, res) {
  if (!req.user.stripeCustomerId) {
    return res.status(400).json({ error: 'No billing account on file yet' });
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: req.user.stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/dashboard`
  });
  res.json({ url: session.url });
}

async function getSubscriptionStatus(req, res) {
  res.json({
    status: req.user.subscriptionStatus,
    plan: req.user.subscriptionPlan,
    currentPeriodEnd: req.user.currentPeriodEnd
  });
}

function mapStripeStatus(status) {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
    case 'incomplete_expired':
      return 'CANCELED';
    default:
      return 'NONE';
  }
}

// Mounted with express.raw() in app.js — Stripe requires the untouched raw body
// to verify the webhook signature.
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionId: session.subscription,
            subscriptionPlan: plan,
            subscriptionStatus: 'ACTIVE'
          }
        });
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: sub.customer } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionId: sub.id,
            subscriptionStatus: mapStripeStatus(sub.status),
            currentPeriodEnd: new Date(sub.current_period_end * 1000)
          }
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: sub.customer } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: 'CANCELED' }
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: invoice.customer } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: 'PAST_DUE' }
        });
      }
      break;
    }

    default:
      break; // ignore events we don't act on
  }

  res.json({ received: true });
}

module.exports = {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  handleWebhook
};
