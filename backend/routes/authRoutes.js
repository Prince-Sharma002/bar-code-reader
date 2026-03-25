const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Signup - Create new store owner
router.post('/signup', authController.signup);

// Invite - Create staff account
router.post('/invite', authController.inviteStaff);

// Login
router.post('/login', authController.login);

// Refresh access token using refresh token
router.post('/refresh-token', authController.refreshToken);

// Logout (invalidate refresh token)
router.post('/logout', authController.logout);

const { authMiddleware } = require('../middleware/auth');

// Get/Update profile information
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
