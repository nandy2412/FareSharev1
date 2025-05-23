//drivers.js routes

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const dc = require('../controllers/driverController');

router.post('/', auth, dc.createDriver);
router.put('/',  auth, dc.updateDriver);
router.get('/:driverID', auth, dc.getDriver);

module.exports = router;
