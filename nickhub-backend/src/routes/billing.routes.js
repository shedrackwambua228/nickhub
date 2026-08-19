const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/billing.controller');

router.post('/checkout-session', requireAuth, c.createCheckoutSession);
router.post('/portal-session', requireAuth, c.createPortalSession);
router.get('/subscription', requireAuth, c.getSubscriptionStatus);

// NOTE: POST /api/billing/webhook is intentionally NOT here — it's mounted
// directly on the app in app.js, before express.json(), because Stripe
// signature verification requires the raw, unparsed request body.

module.exports = router;
