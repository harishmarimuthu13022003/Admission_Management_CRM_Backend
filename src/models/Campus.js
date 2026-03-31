const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  name: { type: String, required: true },
  city: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Campus', campusSchema);
