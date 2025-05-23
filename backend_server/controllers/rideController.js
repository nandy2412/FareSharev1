//rideController.js

const Ride = require('../models/Ride');
const RideHistory = require('../models/RideHistory');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Group = require('../models/Group');
const Notification = require('../models/Notification');

//Creating a ride (only a driver can create the ride i.e. only if the driver has entered their details)
exports.createRide = async (req, res, next) => {
  try {

    const { dateTime, seats } = req.body;

    const schedule = new Date(dateTime);
    const now = new Date();

    //The ride can only be booked if the ride time is 1 hour after the current time
    if (isNaN(schedule)) {
      return res.status(400).json({ message: 'Invalid date/time' });
    }
    if (schedule <= now) {
      return res.status(400).json({ message: 'Cannot create a ride in the past' });
    }
    const oneHour = 60 * 60 * 1000;
    if (schedule - now < oneHour) {
      return res
        .status(400)
        .json({ message: 'Rides must be scheduled at least one hour in advance' });
    }

    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const driver = await Driver.findOne({ userID: user._id });
    if (!driver) return res.status(403).json({ message: 'Not a driver' });

    if (!user || user.licenseValidated == false || !driver.licenseNo || !driver.carName) {
      return res.status(403).json({message: 'Cannot create the ride as missing license validation or car details'});
    }

    if (!seats || driver.seats < seats) return res.status(403).json({ message: 'Seats cannot be more than your available seats' });
    const ride = await Ride.create({ ...req.body, driverID: driver._id });
    
    const driverUser = await User.findById(driver.userID);
    const existingHistory = await RideHistory.findOne({ rideID: ride._id, userID: driver.userID });
    if (!existingHistory) {await RideHistory.create({ userID: driver.userID, rideID: ride._id, driverName: `${driverUser.firstName} ${driverUser.lastName}`, message: 'Ride created by driver' });
    }

    const groups = await Group.find({ users: driver.userID }).select('users');
    const allNotifs = [];
    groups.forEach(g => {
      g.users
        .filter(u => !u.equals(driver.userID))
        .forEach(u => {
          allNotifs.push({
            userID:  u,
            groupID: g._id,
            rideID:  ride._id
          });
      });
    });
    if (allNotifs.length > 0) {
      await Notification.insertMany(allNotifs);
    }

    res.status(201).json(ride);
  } catch (err) { next(err); }
};

//Searching all the rides that the user has been a driver or a passenger in
exports.searchRides = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const driver = await Driver.findOne({ userID: user._id });
    const driverObjectId = driver?._id;

    const rides = await Ride.find({
      $or: [
        ...(driverObjectId ? [{ driverID: driverObjectId }] : []),
        { 'passengers.userID': user._id }
      ]
    })
    .sort({ dateTime: -1 }) 
    .populate({
      path: 'driverID',
      select: 'carName licenseNo reviewScoreDriver totalReviews userID',
      populate: { path: 'userID', select: 'firstName lastName' }
    }) 
    .populate('passengers.userID', 'firstName lastName');

    return res.json(rides);
  } catch (err) {
    next(err);
  }
};

//Searching all the rides that the user is not in
exports.searchUnrelatedRides = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const driver = await Driver.findOne({ userID: user._id });
    const driverObjectId = driver?._id;

    const excludeFilters = [
      { 'passengers.userID': user._id }
    ];
    if (driverObjectId) {
      excludeFilters.push({ driverID: driverObjectId });
    }

    const rides = await Ride.find({
      $nor: excludeFilters
    })
    .sort({ dateTime: -1 })   //Sorting based on date and time
    
    .populate({
      path: 'driverID',
      select: 'carName licenseNo reviewScoreDriver totalReviews userID',
      populate: { path: 'userID', select: 'firstName lastName' }
    })
    .populate('passengers.userID', 'firstName lastName');

    return res.json(rides);
  } catch (err) {
    next(err);
  }
};

//Retrieving single rides using the ride ID with all the details including driver and passenger details
exports.getRideById = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate({
        path: 'driverID',
        select: 'carName userID reviewScoreDriver totalReviews',
        populate: { path: 'userID', select: 'firstName lastName' }
      })
      .populate('passengers.userID', 'firstName lastName');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (err) {
    next(err);
  }
};

//Booking a seat on a ride only if the ride is pending (driver cannot book their own ride)
exports.bookRide = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ride = await Ride.findById(req.params.rideId);
    if (!ride || ride.status !== 'pending')
      return res.status(400).json({ message: 'Ride not available' });

    if (ride.seats <= 0)
      return res.status(400).json({ message: 'No seats available' });

    const driver = await Driver.findById(ride.driverID);
    if (driver.userID.equals(user._id))
      return res.status(400).json({ message: 'Driver cannot book own ride' });

    if (ride.passengers.some(p => p.userID.equals(user._id)))
      return res.status(400).json({ message: 'Already booked' });

    const driverUser = await User.findById(driver.userID);
    const driverName = `${driverUser.firstName} ${driverUser.lastName}`;
    
    //Creating OTPS for the passengers so that the driver can validate it later
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await RideHistory.create({
      userID:   user._id,
      rideID:   ride._id,
      driverName: driverName,
      message:  'Ride booked'
    });

    ride.passengers.push({ userID: user._id, otp });
    ride.driverValidationOTPs.push({ userID: user._id, otp });
    ride.seats -= 1;

    await ride.save();
    res.json({ message: 'Ride booked, OTP generated' });

  } catch (err) {
    next(err);
  }
};


//Starting a ride when sends all the OTPS of the passengers for the driver to validate
exports.startRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate('passengers.userID', 'firstName');

    const passengerList = ride.passengers.map(p => ({
      userID: {
        _id: p.userID._id,
        firstName: p.userID.firstName
      },
      otp: p.otp
    }));

    return res.json({ passengers: passengerList });
  } catch (err) {
    next(err);
  }
};


//Validating all the OTPs of the passengers
exports.validateBoarding = async (req, res, next) => {
  try {
    const { otp, userID, allValidated } = req.body;
    const ride = await Ride.findById(req.params.rideId).select('+driverValidationOTPs.otp');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const entry = ride.driverValidationOTPs.find(e =>
      e.userID.toString() === userID && e.otp === otp
    );
    if (!entry) return res.status(400).json({ message: 'Invalid OTP' });

    //Checking if all the OTPs have been validated or not and then clearing the OTPs and updating the ride status
    if (allValidated) {
      ride.status = 'ongoing';
      ride.driverValidationOTPs = [];
      await ride.save();
      return res.json({ message: 'All OTPs validated, ride is now ongoing' });
    }

    return res.json({ message: 'OTP validated' });
  } catch (err) {
    next(err);
  }
};


//Marking a ride as completed and updating the ride histories for both driver and passengers
exports.completeRide = async (req, res, next) => {
  try {

    const ride = await Ride.findById(req.params.rideId).populate('driverID');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const driver = await Driver.findOne({ userID: user._id });
    if (!driver) return res.status(403).json({ message: 'Not a driver' });

    if (ride.driverID.userID._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Only the driver can complete the ride' });
    }

    const driverUser = await User.findById(ride.driverID.userID);
    const driverName = `${driverUser.firstName} ${driverUser.lastName}`;

    ride.status = 'completed';
    await ride.save();

    await Notification.deleteMany({ rideID: ride._id }); //Deleting group notifications if the ride has been marked as completed

    for (const p of ride.passengers) {
      await RideHistory.create({ userID: p.userID, rideID: ride._id, driverName, message: "Ride completed"});
    }

    res.json({ message: 'Ride completed' });
  } catch (err) {
    next(err);
  }
};


//Cancelling a ride by the driver, this will update all the drivers and passengers ride histories
exports.cancelRide = async (req, res, next) => {
  try {

    const ride = await Ride.findById(req.params.rideId).populate('driverID');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (ride.driverID.userID.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Only the driver can cancel the ride' });
    }


    ride.status = 'cancelled';
    await ride.save();

    await Notification.deleteMany({ rideID: ride._id });
    
    await RideHistory.updateMany(
      { rideID: ride._id },
      { $set: { message: 'Ride cancelled by driver' } }
    );

    res.json({ message: 'Ride cancelled' });
  } catch (err) { next(err); }
};


//Cancelling a ride by the driver, this will remove the passenger and add back the seat
exports.unbookRide = async (req, res, next) => {
  try {

    const ride = await Ride.findById(req.params.rideId);
    if (!ride || ride.status !== 'pending') return res.status(400).json({ message: 'Ride not available' });

    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const passengerIndex = ride.passengers.findIndex(p => p.userID.toString() === user._id.toString());
    if (passengerIndex === -1) {
      return res.status(403).json({ message: 'User is not a passenger in this ride' });
    }
    ride.passengers.splice(passengerIndex, 1);
    ride.driverValidationOTPs = ride.driverValidationOTPs.filter(otp => otp.userID.toString() !== req.user.uid);

    ride.seats += 1;

    await ride.save();
    res.json({ message: 'Ride unbooked successfully' });

    await RideHistory.updateOne(
      { rideID: ride._id, userID: user._id },
      { $set: { message: 'Ride cancelled by user' } }
    );

  } catch (err) {
    next(err);
  }
};


//Getting OTPs for the logged in users on each of the pending rides
exports.getMyOtp = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const user = await User.findOne({ firebaseUID: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const passenger = ride.passengers.find(passenger => passenger.userID.toString() === user._id.toString());
    if (!passenger) {
      return res.status(403).json({ message: 'User is not a passenger in this ride' });
    }

    if (ride.status !== 'pending') {
      return res.status(400).json({ message: 'OTP not available for non-pending rides' }); }

    console.log(passenger);
    const otp = passenger.otp;
    console.log(otp);

    if (otp) {
      res.json({ otp });
    } else {
      res.status(404).json({ message: 'OTP not found for this user' });
    }
  } catch (err) {
    next(err);
  }
};
