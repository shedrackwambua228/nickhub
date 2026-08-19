const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/support.controller');

router.use(requireAuth);
router.post('/', c.createTicket);
router.get('/', c.listMyTickets);

module.exports = router;
