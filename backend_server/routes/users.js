//users.js routes

const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const { syncUser, isDriver } = require('../controllers/userController');
const User = require('../models/User');
const Driver = require('../models/Driver');

router.post('/', auth, syncUser);

router.get('/isdriver', auth, isDriver);

//Getting the logged in user's profile details and connect to the driver details (if the user is a driver)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUID: req.user?.uid });

    if (!user) {
      console.warn("No user found for UID:", req.user?.uid);
      return res.status(404).json({ message: 'User not found' });
    }

    let driverInfo = {};

    const driver = await Driver.findOne({ userID: user._id });
     if (driver) {
      driverInfo = {
        licenseNo: driver.licenseNo,
        carName: driver.carName,
        seats: driver.seats,
        reviewScoreDriver: driver.reviewScoreDriver,
        totalReviewsDriver: driver.totalReviews
      }
    }
    console.log(driver);
    console.log(driverInfo);

    res.json({...user.toObject(), driverInfo });
  } catch (err) {
    console.error("Error in /me route:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

//Updating the emergency contact details for SOS button 
router.put('/me/emergencycontact', auth, async (req, res) => {
  try {
    const { emergencyContact } = req.body;

    if (!emergencyContact) {
      return res.status(400).json({ message: 'Emergency contact is required' });
    }
    const user = await User.findOne({ firebaseUID: req.user?.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.emergencyphone = emergencyContact;
    console.log(user.emergencyphone);
    await user.save();

    res.status(200).json({ message: 'Emergency contact updated successfully' });
  } catch (err) {
    console.error('Error updating emergency contact:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;