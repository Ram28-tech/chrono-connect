const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  studentName: String,
  email: String,
  phone: String,
  year: String,
  branch: String
});

module.exports = mongoose.model('Registration', RegistrationSchema);
