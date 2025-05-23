//driverController.js

const Driver = require('../models/Driver');
const User = require('../models/User');

//Creating new driver for the user (based if they enter their car registration details in profile)
exports.createDriver = async (req, res) => {
  const { licenseNo, carName, seats } = req.body;
  try {
    const user = await User.findOne({ firebaseUID: req.user.uid }); //Matching the user schema to the Firebase ID for authenticated requests
    if (!user) return res.status(404).json({ message: 'User not found' });

    //Duplicate drivers prevention 
    const existing = await Driver.findOne({ userID: user._id });
    if (existing) return res.status(400).json({ message: 'Driver profile already exists' });

    const newDriver = new Driver({ userID: user._id, licenseNo, carName, seats });
    await newDriver.save();

    //Saving License Validation as true to allow the user to host rides
    user.licenseValidated = true;
    await user.save();

    res.status(201).json(newDriver);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//Retrieving driver profiles  
exports.getDriver = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUID: req.params.driverID }); //Same as above (mapping firebaseUID to the user ID in Mongo)
    if (!user) return res.status(404).json({ message: 'User not found' });

    const driver = await Driver.findOne({ userID: user._id });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    res.status(200).json({ driverId: driver._id });
  } catch (err) {
    console.error("Error fetching driver:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//Updating the driver details 
exports.updateDriver = async (req, res) => {
  const { licenseNo, carName, seats } = req.body;
  try {
    const user = await User.findOne({ firebaseUID: req.user.uid }); //Same as above
    if (!user) return res.status(404).json({ message: 'User not found' });

    //Checking if there is an existing driver profile connected to the user
    const existing = await Driver.findOne({ userID: user._id });
    if (!existing) return res.status(404).json({ message: 'Driver profile not found' });

    existing.licenseNo = licenseNo;
    existing.carName = carName;
    existing.seats = seats;
    await existing.save();

    res.status(200).json(existing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating driver' });
  }
};