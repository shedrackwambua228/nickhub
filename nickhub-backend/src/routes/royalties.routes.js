const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/royalties.controller');

router.use(requireAuth);
router.get('/', c.listMyRoyalties);
router.get('/summary', c.earningsSummary);

module.exports = router;
