const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const c = require('../controllers/admin.controller');

router.use(requireAuth, requireRole('ADMIN'));

router.get('/users', c.listUsers);
router.get('/releases/pending', c.listReleasesForReview);
router.post('/releases/:id/review', c.reviewRelease);
router.get('/withdrawals', c.listWithdrawals);
router.post('/withdrawals/:id', c.updateWithdrawal);
router.post('/royalty-reports/import', c.importRoyaltyReport);
router.get('/tickets', c.listTickets);
router.post('/tickets/:id', c.updateTicket);

module.exports = router;
