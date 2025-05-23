//userController.js

const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');

//Syncing users for the profile data 
exports.syncUser = async (req, res, next) => {
  try {
    const {
      firebaseUID,
      email,
      firstName,
      lastName,
      phone,
      profilePhoto,
      reviewScoreUser,
      totalReviews,
      wallet,
      licenseValidated,
      emergencyphone
    } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUID },
      {
        email,
        firstName,
        lastName,
        phone,
        profilePhoto,
        reviewScoreUser,
        totalReviews,
        wallet,
        licenseValidated, 
        emergencyphone
      },
      { upsert: true, new: true }
    );

    res.json(user);
  } catch (err) {
    next(err);
  }
};

//Checking if the logged in user is a driver for a ride based on ride ID
exports.isDriver = async (req, res, next) => {
  try {
    const { rideID } = req.query;
    if (!rideID) return res.status(400).json({ message: 'Ride ID is required' });

    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ride = await Ride.findById(rideID).populate('driverID');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const isDriver = ride.driverID?.userID.toString() === user._id.toString();

    res.json({ isDriver });
  } catch (err) {
    next(err);
  }
};
