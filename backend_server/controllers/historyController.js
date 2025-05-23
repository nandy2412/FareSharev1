//historyController.js

const RideHistory = require('../models/RideHistory');
const User = require('../models/User');

//Retrieving all the ride histories for the logged in user
exports.getHistory = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const history = await RideHistory.find({ userID: user._id }).populate('rideID');

    res.json(history);
  } catch (err) {
    next(err);
  }
};
