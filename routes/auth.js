const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_farm_ledger_jwt_key_2026_dev',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// @route   GET /api/auth/farms
// @desc    Get list of registered farms for worker registration dropdown
// @access  Public
router.get('/farms', async (req, res) => {
  try {
    const farms = await User.find({ role: 'farmer', status: 'active' })
      .select('_id name farmName farmLocation phone')
      .sort({ farmName: 1 });
    res.json({
      success: true,
      farms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching farms list',
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new Farmer or Worker account
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'farmer',
      phone,
      // Farmer-specific
      farmName,
      farmLocation,
      farmSizeAcres,
      // Worker-specific
      farmerId,
      specialization,
      dailyWageRate,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    let user;
    if (role === 'worker') {
      let validFarmerId = null;
      if (farmerId && mongoose.Types.ObjectId.isValid(farmerId)) {
        const farmerExists = await User.findOne({ _id: farmerId, role: 'farmer' });
        if (farmerExists) {
          validFarmerId = farmerExists._id;
        }
      }

      user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: 'worker',
        phone: phone ? phone.trim() : '',
        farmerId: validFarmerId,
        specialization: specialization ? specialization.trim() : 'General Labor',
        dailyWageRate: dailyWageRate ? Number(dailyWageRate) : 500,
        status: 'active',
      });
    } else {
      user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: 'farmer',
        phone: phone ? phone.trim() : '',
        farmName: farmName ? farmName.trim() : 'My Farm',
        farmLocation: farmLocation ? farmLocation.trim() : '',
        farmSizeAcres: farmSizeAcres ? Number(farmSizeAcres) : 0,
        status: 'active',
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: `${role === 'worker' ? 'Worker' : 'Farmer'} account created successfully!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        farmName: user.farmName,
        farmLocation: user.farmLocation,
        farmSizeAcres: user.farmSizeAcres,
        farmerId: user.farmerId,
        specialization: user.specialization,
        dailyWageRate: user.dailyWageRate,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate Farmer or Worker & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user by email and include password for verification
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Contact your farm administrator.',
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        farmName: user.farmName,
        farmLocation: user.farmLocation,
        farmSizeAcres: user.farmSizeAcres,
        farmerId: user.farmerId,
        dailyWageRate: user.dailyWageRate,
        specialization: user.specialization,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current authenticated user info
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    let populatedUser = req.user;
    if (req.user.role === 'worker' && req.user.farmerId) {
      populatedUser = await User.findById(req.user._id).populate('farmerId', 'name farmName farmLocation phone');
    }

    res.json({
      success: true,
      user: populatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching user profile',
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update profile details
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, phone, farmName, farmLocation, farmSizeAcres } = req.body;
    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();

    if (user.role === 'farmer') {
      if (farmName) user.farmName = farmName.trim();
      if (farmLocation !== undefined) user.farmLocation = farmLocation.trim();
      if (farmSizeAcres !== undefined) user.farmSizeAcres = Number(farmSizeAcres);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating profile',
    });
  }
});

module.exports = router;
