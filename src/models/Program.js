const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  academicYear: { type: String, required: true, default: '2026-2027' },
  courseType: { type: String, enum: ['UG', 'PG'], required: true },
  entryType: { type: String, enum: ['Regular', 'Lateral'], default: 'Regular' },
  admissionMode: { type: String, enum: ['Government', 'Management'], required: true },
  totalIntake: { type: Number, required: true },
  quotas: {
    type: [{
      quotaType: { type: String, enum: ['KCET', 'COMEDK', 'Management'], required: true },
      allocatedSeats: { type: Number, required: true },
      filledSeats: { type: Number, default: 0 }
    }],
    validate: {
      validator: function(v) {
        if (!v || v.length === 0) return false;
        const totalAllocated = v.reduce((acc, curr) => acc + Number(curr.allocatedSeats), 0);
        return totalAllocated === Number(this.totalIntake);
      },
      message: (props) => {
        const currentSum = props.value.reduce((acc, curr) => acc + Number(curr.allocatedSeats), 0);
        return `Validation failed: Total allocated seats (${currentSum}) must match program intake.`;
      }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Program', programSchema);
