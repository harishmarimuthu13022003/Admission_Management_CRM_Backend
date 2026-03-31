const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { auth, checkRole, getPermissionsForRole, ROLE_PERMISSIONS } = require('../middleware/auth');

// 1. Register User (Admin only)
router.post('/register', auth, checkRole(['Admin']), async (req, res) => {
  try {
    const { username, password, role, fullName } = req.body;

    // Validate role
    const validRoles = Object.keys(ROLE_PERMISSIONS);
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const user = await User.create({ username, password, role, fullName });
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user._id, username: user.username, role: user.role, fullName: user.fullName },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username already exists.' });
    }
    res.status(400).json({ error: error.message });
  }
});

// 2. Seed First Admin (only works if no users exist)
router.post('/seed-admin', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(400).json({ error: 'Users already exist. Use /register instead.' });
    }

    const { username, password, fullName } = req.body;
    const user = await User.create({
      username: username || 'admin',
      password: password || 'admin123',
      role: 'Admin',
      fullName: fullName || 'System Administrator',
    });

    res.status(201).json({
      message: 'Admin user seeded successfully',
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 3. Login User
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '8h' },
    );

    const permissions = getPermissionsForRole(user.role);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
      permissions,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const permissions = getPermissionsForRole(user.role);
    res.json({ user, permissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. List all users (Admin only)
router.get('/users', auth, checkRole(['Admin']), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
