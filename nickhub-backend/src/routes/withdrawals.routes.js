const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/withdrawals.controller');

router.use(requireAuth);
router.post('/', c.requestWithdrawal);
router.get('/', c.listMyWithdrawals);

module.exports = router;
