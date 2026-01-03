// MISSING FILE 6: backend/src/routes/auth.routes.js (Optional but useful)
// ============================================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { createToken } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');

// Register new user
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Create user
    const user = new User({
      name,
      email,
      password,
      role: role || 'student',
    });
    
    await user.save();
    
    // Generate token
    const token = createToken({
      userId: user._id,
      role: user.role,
      email: user.email,
    });
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await user.updateLastLogin();
    
    // Generate token
    const token = createToken({
      userId: user._id,
      role: user.role,
      email: user.email,
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', require('../middleware/auth.middleware').authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;