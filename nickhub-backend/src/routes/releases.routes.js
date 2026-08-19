const router = require('express').Router();
const { requireAuth, requireActiveSubscription } = require('../middleware/auth');
const c = require('../controllers/releases.controller');

router.use(requireAuth);
router.get('/', c.listMyReleases);
router.get('/catalog-search', requireActiveSubscription, c.searchArtistCatalog);
router.post('/import', requireActiveSubscription, c.importCatalog);
router.post('/', requireActiveSubscription, c.createRelease);
router.get('/:id', c.getRelease);
router.post('/:id/submit', requireActiveSubscription, c.submitRelease);

module.exports = router;
