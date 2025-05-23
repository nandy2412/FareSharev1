//history.js routes

const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const hc = require('../controllers/historyController');

router.get('/', auth, hc.getHistory);

module.exports = router;