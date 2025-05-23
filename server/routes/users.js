const express = require('express');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/authMiddleware');
const { hasRole } = require('../middleware/roleMiddleware');
const User = require('../models/User');

const router = express.Router();

// 📄 Get users (admin sees all, client_admin sees their org only)
router.get('/users', protect, hasRole('admin', 'client_admin'), async (req, res) => {
  try {
    const currentUser = await User.findOne({ email: req.user.email });

    const filter = currentUser.role === 'admin'
      ? {}
      : { orgId: currentUser.orgId };

    const users = await User.find(filter, 'firstName lastName email role orgId plan allowedIntegrations status')
      .populate('orgId', 'name orgId');

    res.json({ users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ✅ Profile route for client portal
router.get('/users/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate({
        path: 'orgId',
        select: 'name orgId' // 👈 pulls in organization name
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organization: user.orgId?.name || '',
      role: user.role,
      orgId: user.orgId?.orgId || ''
    });
  } catch (err) {
    console.error('❌ Error loading profile:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// 👤 Get current logged-in user's profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(user);
  } catch (err) {
    console.error('❌ Error fetching user profile:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});


// ➕ Create new user (admin or client_admin)
router.post('/users', protect, hasRole('admin', 'client_admin'), async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

  if (!email || !password || !firstName || !lastName || !role) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    const creatingUser = await User.findOne({ email: req.user.email });
    const orgId = creatingUser.orgId;

    const hashed = await bcrypt.hash(password, 10);
    await User.create({
      email,
      password: hashed,
      role,
      firstName,
      lastName,
      orgId,
      status: 'active'
    });

    res.status(201).json({ message: 'User created successfully.' });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Server error during user creation.' });
  }
});

// 📝 General user update (name, role, status)
router.put('/users/:email', protect, hasRole('admin', 'client_admin', 'platform_editor'), async (req, res) => {
  const { email } = req.params;
  const updates = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { email },
      updates,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User updated.', user });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// 🎚 Toggle Active/Disabled status only
router.put('/users/:email/status', protect, hasRole('admin', 'client_admin', 'platform_editor'), async (req, res) => {
  const { status } = req.body;
  const { email } = req.params;

  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: `User status updated to ${status}.` });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// 🔄 Update role only (legacy route, optional)
router.post('/users/:email/role', protect, hasRole('admin', 'client_admin'), async (req, res) => {
  const { role } = req.body;
  const { email } = req.params;

  if (!['client_admin', 'client_editor', 'client_viewer'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  try {
    const updated = await User.findOneAndUpdate(
      { email, role: { $ne: 'admin' } },
      { role },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'User not found or is a super admin.' });
    }

    res.json({ message: 'Role updated.', role: updated.role });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// 🔐 Reset password
router.post('/users/:email/password', protect, hasRole('admin', 'client_admin'), async (req, res) => {
  const { password } = req.body;
  const { email } = req.params;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate({ email }, { password: hashed });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
