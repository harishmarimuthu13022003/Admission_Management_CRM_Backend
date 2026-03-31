const express = require('express');
const router = express.Router();
const Program = require('../models/Program');
const Applicant = require('../models/Applicant');
const { auth, checkRole } = require('../middleware/auth');

// ──────────────────────────────────────────────
// RBAC:
//   Dashboard → All authenticated roles (Admin, Officer, Management)
//   Management uses this as their primary view
// ──────────────────────────────────────────────

// Dashboard summary
router.get('/summary', auth, checkRole(['Admin', 'Admission Officer', 'Management']), async (req, res) => {
  try {
    const programs = await Program.find();

    let totalIntake = 0;
    let totalAdmitted = 0;

    const quotaStats = {
      KCET: { allocated: 0, filled: 0, remaining: 0 },
      COMEDK: { allocated: 0, filled: 0, remaining: 0 },
      Management: { allocated: 0, filled: 0, remaining: 0 },
    };

    programs.forEach(p => {
      totalIntake += p.totalIntake;
      p.quotas.forEach(q => {
        if (quotaStats[q.quotaType]) {
          quotaStats[q.quotaType].allocated += q.allocatedSeats;
          quotaStats[q.quotaType].filled += q.filledSeats;
          quotaStats[q.quotaType].remaining += (q.allocatedSeats - q.filledSeats);
          totalAdmitted += q.filledSeats;
        }
      });
    });

    const pendingDocs = await Applicant.countDocuments({ documentStatus: { $in: ['Pending', 'Submitted'] } });
    const pendingFees = await Applicant.countDocuments({ feeStatus: 'Pending', admissionStatus: 'SeatLocked' });
    const totalApplicants = await Applicant.countDocuments();
    const confirmedCount = await Applicant.countDocuments({ admissionStatus: 'Confirmed' });

    res.json({
      totalIntake,
      totalAdmitted,
      remainingSeats: totalIntake - totalAdmitted,
      quotaStats,
      pendingDocs,
      pendingFees,
      totalApplicants,
      confirmedCount,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
