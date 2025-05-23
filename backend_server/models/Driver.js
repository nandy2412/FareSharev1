//Driver.js model 

const mongoose = require('mongoose');

//Driver Schema 
const driverSchema = new mongoose.Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  licenseNo: { type: String, required: true },
  carName: { type: String, required: true },
  seats: { type: Number, default: 4 },
  reviewScoreDriver: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
