//RideHistory.js model

const mongoose = require('mongoose');

//Ride History Schema
const RideHistorySchema = new mongoose.Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rideID: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
  driverName: { type: String, required: true },
  message: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("RideHistory", RideHistorySchema);

