//reviewController.js

const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');

//Users can submit a rating for driver if the ride has been completed 
exports.submitReview = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { rideId } = req.params;
    const { rating } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride || ride.status !== 'completed')
      return res.status(400).json({ message: 'Ride is not completed or doesn’t exist' });

    const isPassenger = ride.passengers.some(p => p.userID.toString() === user._id.toString());
    if (!isPassenger) return res.status(403).json({ message: 'User was not a passenger in this ride' });

    const driver = await Driver.findById(ride.driverID);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    //Updating the scores given by the users and number of reviewers for the driver
    driver.reviewScoreDriver = driver.reviewScoreDriver + rating;
    driver.totalReviews = driver.totalReviews + 1;

    await driver.save();

    res.json({ message: 'Review submitted successfully' });
  } catch (err) {
    next(err);
  }
};

