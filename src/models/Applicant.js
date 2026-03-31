const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema({
  // Basic Details
  fullName: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  category: { type: String, enum: ['GM', 'SC', 'ST', 'OBC', 'Cat-1', 'Other'], required: true },
  parentName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  
  // Academic Details
  sslcPercentage: { type: Number, required: true },
  pucPercentage: { type: Number, required: true },
  qualifyingExam: { type: String, required: true },
  examRegisterNumber: { type: String },
  
  // Admission Flow Details
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  flowType: { type: String, enum: ['Government', 'Management'], required: true },
  quotaType: { type: String, enum: ['KCET', 'COMEDK', 'Management'], required: true },
  entryType: { type: String, enum: ['Regular', 'Lateral'], default: 'Regular' },
  allotmentNumber: { type: String }, // Required only for Government flow
  
  // Status Tracking
  admissionStatus: { 
    type: String, 
    enum: ['Draft', 'SeatLocked', 'Confirmed'], 
    default: 'Draft' 
  },
  documentStatus: { 
    type: String, 
    enum: ['Pending', 'Submitted', 'Verified'], 
    default: 'Pending' 
  },
  feeStatus: { 
    type: String, 
    enum: ['Pending', 'Paid'], 
    default: 'Pending' 
  },
  admissionNumber: { type: String, unique: true, sparse: true }
}, { timestamps: true });

module.exports = mongoose.model('Applicant', applicantSchema);
