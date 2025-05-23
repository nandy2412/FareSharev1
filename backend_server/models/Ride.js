//Ride.js model

const mongoose = require('mongoose');

//Ride Schema 
const rideSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  cost: { type: Number, required: true },
  dateTime: { type: Date, required: true },
  driverID: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  seats: { type: Number, required: true }, //added
  passengers: [{ userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, otp: { type: String, select: true } }],
  driverValidationOTPs: [{ userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, otp: { type: String, select: false } }], //CHANGED IT HERE 
  status: { type: String, enum: ['pending','ongoing','completed','cancelled'], default: 'pending' },
  fromCoordinates: { type: [Number], required: true },
  toCoordinates: { type: [Number], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);