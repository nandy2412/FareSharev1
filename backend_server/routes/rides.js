//rides.js routes

const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const rc = require('../controllers/rideController');

router.post('/', auth, rc.createRide);
router.get('/unrelated',   auth, rc.searchUnrelatedRides);
router.get('/', auth, rc.searchRides);
router.get('/:rideId', auth, rc.getRideById);
router.post('/:rideId/book', auth, rc.bookRide);
router.post('/:rideId/join', auth, rc.bookRide);
router.post('/:rideId/start', auth, rc.startRide);
router.post('/:rideId/validate', auth, rc.validateBoarding);
router.post('/:rideId/complete', auth, rc.completeRide);
router.post('/:rideId/cancel', auth, rc.cancelRide);
router.post('/:rideId/unbook', auth, rc.unbookRide)
router.get('/:rideId/myotp', auth, rc.getMyOtp);


module.exports = router;
