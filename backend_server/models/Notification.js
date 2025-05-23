//Notification.js model

const mongoose = require('mongoose');

//Group Notification Schema 
const notificationSchema = new mongoose.Schema({
  userID:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  groupID:   { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  rideID:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ride',  required: true },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date,    default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);