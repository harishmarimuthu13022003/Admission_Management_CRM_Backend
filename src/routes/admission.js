const express = require('express');
const router = express.Router();
const Applicant = require('../models/Applicant');
const Program = require('../models/Program');
const Department = require('../models/Department');
const Campus = require('../models/Campus');
const Institution = require('../models/Institution');
const { auth, checkRole, checkPermission } = require('../middleware/auth');

// ──────────────────────────────────────────────
// RBAC:
//   All admission routes → Admin + Officer only
//   Management has NO access to admission operations
// ──────────────────────────────────────────────

// 1. Create Applicant
router.post('/applicant', auth, checkRole(['Admission Officer', 'Admin']), checkPermission('createApplicant'), async (req, res) => {
  try {
    const app = await Applicant.create({ ...req.body, admissionStatus: 'Draft' });
    res.status(201).json(app);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// 2. Get Applicants
router.get('/applicants', auth, checkRole(['Admission Officer', 'Admin']), checkPermission('readApplicants'), async (req, res) => {
  try {
    const apps = await Applicant.find().populate('programId', 'name code');
    res.json(apps);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// 3. Get single applicant
router.get('/applicant/:id', auth, checkRole(['Admission Officer', 'Admin']), async (req, res) => {
  try {
    const app = await Applicant.findById(req.params.id).populate({
      path: 'programId',
      populate: { path: 'departmentId', select: 'name code' },
    });
    if (!app) return res.status(404).json({ error: 'Applicant not found' });
    res.json(app);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// 4. Get quota availability for a program
router.get('/quota-availability/:programId', auth, checkRole(['Admission Officer', 'Admin']), async (req, res) => {
  try {
    const program = await Program.findById(req.params.programId);
    if (!program) return res.status(404).json({ error: 'Program not found' });

    const availability = program.quotas.map(q => ({
      quotaType: q.quotaType,
      allocated: q.allocatedSeats,
      filled: q.filledSeats,
      remaining: q.allocatedSeats - q.filledSeats,
      isFull: q.filledSeats >= q.allocatedSeats,
    }));

    res.json({ program: program.name, totalIntake: program.totalIntake, quotas: availability });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// 5. Allocate Seat (Lock Seat)
router.post('/allocate/:id', auth, checkRole(['Admission Officer', 'Admin']), checkPermission('allocateSeat'), async (req, res) => {
  try {
    const applicant = await Applicant.findById(req.params.id);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    if (applicant.admissionStatus !== 'Draft') {
      return res.status(400).json({ error: 'Already allocated or confirmed.' });
    }

    // Check quota logic
    const program = await Program.findById(applicant.programId);
    if (!program) return res.status(400).json({ error: 'Program invalid' });

    // Validate allocation based on Govt or Mgmt
    if (applicant.flowType === 'Government' && !applicant.allotmentNumber) {
      return res.status(400).json({ error: 'Allotment number required for Government flow' });
    }

    const quotaIndex = program.quotas.findIndex(q => q.quotaType === applicant.quotaType);
    if (quotaIndex === -1) return res.status(400).json({ error: 'Invalid Quota for this program' });

    const quotaInfo = program.quotas[quotaIndex];
    if (quotaInfo.filledSeats >= quotaInfo.allocatedSeats) {
      return res.status(400).json({
        error: 'Seat allocation blocked: Quota is full',
        quotaType: applicant.quotaType,
        filled: quotaInfo.filledSeats,
        allocated: quotaInfo.allocatedSeats,
      });
    }

    // Atomic increment using findOneAndUpdate to avoid race conditions
    const updatedProgram = await Program.findOneAndUpdate(
      {
        _id: program._id,
        [`quotas.${quotaIndex}.filledSeats`]: { $lt: program.quotas[quotaIndex].allocatedSeats },
      },
      { $inc: { [`quotas.${quotaIndex}.filledSeats`]: 1 } },
      { new: true },
    );

    if (!updatedProgram) {
      return res.status(400).json({ error: 'Could not allocate: Quota reached limit concurrently' });
    }

    applicant.admissionStatus = 'SeatLocked';
    await applicant.save();

    const remaining = updatedProgram.quotas[quotaIndex].allocatedSeats - updatedProgram.quotas[quotaIndex].filledSeats;

    res.json({
      message: 'Seat locked successfully',
      applicant,
      program: updatedProgram,
      quotaRemaining: remaining,
    });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// 6. Update Document & Fee Status Verification
router.put('/update-status/:id', auth, checkRole(['Admission Officer', 'Admin']), checkPermission('updateApplicantStatus'), async (req, res) => {
  try {
    const { documentStatus, feeStatus } = req.body;
    const applicant = await Applicant.findById(req.params.id);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    if (applicant.admissionStatus === 'Confirmed') {
      return res.status(400).json({ error: 'Cannot modify status of a confirmed admission.' });
    }

    // Build update object with only provided fields
    const update = {};
    if (documentStatus !== undefined) {
      if (!['Pending', 'Submitted', 'Verified'].includes(documentStatus)) {
        return res.status(400).json({ error: 'Invalid documentStatus. Must be Pending, Submitted, or Verified.' });
      }
      update.documentStatus = documentStatus;
    }
    if (feeStatus !== undefined) {
      if (!['Pending', 'Paid'].includes(feeStatus)) {
        return res.status(400).json({ error: 'Invalid feeStatus. Must be Pending or Paid.' });
      }
      update.feeStatus = feeStatus;
    }

    const updated = await Applicant.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// 7. Confirm Admission & Generate Admission Number
// Requirement: Generate Admission Number formatted as: INST/2026/UG/CSE/KCET/0001
router.post('/confirm/:id', auth, checkRole(['Admission Officer', 'Admin']), checkPermission('confirmAdmission'), async (req, res) => {
  try {
    const applicant = await Applicant.findById(req.params.id).populate({
      path: 'programId',
      populate: {
        path: 'departmentId',
        populate: {
          path: 'campusId',
          populate: { path: 'institutionId' },
        },
      },
    });

    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    if (applicant.admissionStatus === 'Confirmed' && applicant.admissionNumber) {
      return res.status(400).json({ error: 'Admission already confirmed' });
    }

    if (applicant.admissionStatus !== 'SeatLocked') {
      return res.status(400).json({ error: 'Seat must be locked before confirmation' });
    }

    if (applicant.documentStatus !== 'Verified') {
      return res.status(400).json({ error: 'Documents must be verified to confirm admission' });
    }

    if (applicant.feeStatus !== 'Paid') {
      return res.status(400).json({ error: 'Admission confirmed only when Fee = Paid' });
    }

    // Generate Admission Number
    // E.g: INST/2026/UG/CSE/KCET/0001
    const instCode = applicant.programId.departmentId.campusId.institutionId.code || 'INST';
    const year = String(applicant.programId.academicYear).split('-')[0] || new Date().getFullYear();
    const ugpg = applicant.programId.courseType;
    const pCode = applicant.programId.code;
    const qCode = applicant.quotaType;

    // Sequence number logic
    // Count confirmed students in this program + quota
    const count = await Applicant.countDocuments({
      programId: applicant.programId._id,
      quotaType: applicant.quotaType,
      admissionStatus: 'Confirmed',
    });

    const seq = String(count + 1).padStart(4, '0');
    const admissionNumber = `${instCode}/${year}/${ugpg}/${pCode}/${qCode}/${seq}`;

    applicant.admissionNumber = admissionNumber;
    applicant.admissionStatus = 'Confirmed';
    await applicant.save();

    res.json({ message: 'Admission Confirmed', admissionNumber: applicant.admissionNumber });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
