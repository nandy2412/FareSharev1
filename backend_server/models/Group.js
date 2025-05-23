//Group.js model

const mongoose = require('mongoose');

//Group Schema 
const groupSchema = new mongoose.Schema({
  groupName: { type: String, required: true, unique: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  groupColor: { type: String, default: '#000000' }
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);