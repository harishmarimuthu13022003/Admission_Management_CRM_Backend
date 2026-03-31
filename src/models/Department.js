const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
