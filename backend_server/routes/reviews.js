//review.js routes

const express = require('express');
const router = express.Router();
const { submitReview } = require('../controllers/reviewController');
const auth = require('../middlewares/authMiddleware');

router.post('/:rideId/reviews', auth,  submitReview);

module.exports = router;

