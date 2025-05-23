//User.js model

const mongoose = require('mongoose');

//User Schema 
const userSchema = new mongoose.Schema({
  firebaseUID: { type: String, required: true, unique: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  profilePhoto: { type: String, default: '' },
  reviewScoreUser: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  wallet: { type: Number, default: 0 },
  emergencyphone: { type: String, default: '' },
  licenseValidated: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
