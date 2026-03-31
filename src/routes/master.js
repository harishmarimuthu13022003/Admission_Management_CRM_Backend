const express = require('express');
const router = express.Router();
const Institution = require('../models/Institution');
const Campus = require('../models/Campus');
const Department = require('../models/Department');
const Program = require('../models/Program');
const { auth, checkRole, checkPermission } = require('../middleware/auth');

// ──────────────────────────────────────────────
// RBAC:
//   POST (create/update) → Admin only
//   GET (read) → Admin + Officer (Officer needs to read programs when creating applicants)
//   Management has no access to master data
// ──────────────────────────────────────────────

// --- Institution ---
router.post('/institution', auth, checkRole(['Admin']), checkPermission('createInstitution'), async (req, res) => {
  try {
    const data = await Institution.create(req.body);
    res.status(201).json(data);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

router.get('/institution', auth, checkRole(['Admin', 'Admission Officer']), async (req, res) => {
  try { res.json(await Institution.find()); } catch (error) { res.status(400).json({ error: error.message }); }
});

// --- Campus ---
router.post('/campus', auth, checkRole(['Admin']), checkPermission('createCampus'), async (req, res) => {
  try { res.status(201).json(await Campus.create(req.body)); } catch (error) { res.status(400).json({ error: error.message }); }
});

router.get('/campus', auth, checkRole(['Admin', 'Admission Officer']), async (req, res) => {
  try { res.json(await Campus.find().populate('institutionId', 'name')); } catch (error) { res.status(400).json({ error: error.message }); }
});

// --- Department ---
router.post('/department', auth, checkRole(['Admin']), checkPermission('createDepartment'), async (req, res) => {
  try { res.status(201).json(await Department.create(req.body)); } catch (error) { res.status(400).json({ error: error.message }); }
});

router.get('/department', auth, checkRole(['Admin', 'Admission Officer']), async (req, res) => {
  try { res.json(await Department.find().populate('campusId', 'name')); } catch (error) { res.status(400).json({ error: error.message }); }
});

// --- Program ---
router.post('/program', auth, checkRole(['Admin']), checkPermission('createProgram'), async (req, res) => {
  try { res.status(201).json(await Program.create(req.body)); } catch (error) { res.status(400).json({ error: error.message }); }
});

router.get('/program', auth, checkRole(['Admin', 'Admission Officer']), async (req, res) => {
  try { res.json(await Program.find().populate('departmentId', 'name')); } catch (error) { res.status(400).json({ error: error.message }); }
});

module.exports = router;
