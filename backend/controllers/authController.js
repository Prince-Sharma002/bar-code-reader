const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const UserSession = require('../models/UserSession');

// Helper to generate access and refresh tokens
const generateTokens = (userId, roleName) => {
  const accessToken = jwt.sign(
    { id: userId, role: roleName },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '15m' } // Short-lived access token
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  return { accessToken, refreshToken };
};

// Seed roles if they don't exist
const ensureRole = async (roleName, description) => {
  let role = await Role.findOne({ name: roleName });
  if (!role) {
    role = await Role.create({ name: roleName, description });
  }
  return role;
};

// Signup (Store Owner)
exports.signup = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      email,
      password_hash,
      first_name,
      last_name,
      phone
    });

    // Get or Create 'Owner' role
    const ownerRole = await ensureRole('Owner', 'Full system access');

    // Link user to 'Owner' role
    await UserRole.create({
      user_id: newUser._id,
      role_id: ownerRole._id
    });

    // Generate Tokens directly so the user is instantly logged in
    const { accessToken, refreshToken } = generateTokens(newUser._id, 'Owner');

    // Calculate Refresh Token Expiry (e.g., 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store Refresh Token in DB
    await UserSession.create({
      user_id: newUser._id,
      refresh_token: refreshToken,
      device_info: req.headers['user-agent'] || 'Unknown Device',
      ip_address: req.ip || req.socket.remoteAddress,
      expires_at: expiresAt
    });

    // Send response
    res.status(201).json({
      message: 'Store Owner account created successfully',
      accessToken,
      refreshToken,
      user: { id: newUser._id, email: newUser.email, first_name: newUser.first_name, role: 'Owner' }
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
};

// Invite / Create Staff Account (e.g., Warehouse Ops by Owner)
exports.inviteStaff = async (req, res) => {
  try {
    // Note: In real app, add middleware to ensure req.user is an 'Owner'
    const { email, temp_password, first_name, last_name, phone, role_name } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(temp_password, salt);

    // Create user
    const newUser = await User.create({
      email,
      password_hash,
      first_name,
      last_name,
      phone,
      status: 'pending_verification' // Optionally pending
    });

    // Ensure role exists (e.g., 'Warehouse Ops')
    const targetRoleName = role_name || 'Warehouse Ops';
    const targetRole = await ensureRole(targetRoleName, 'Staff member for operations');

    // Link user to Staff role
    await UserRole.create({
      user_id: newUser._id,
      role_id: targetRole._id
    });

    res.status(201).json({
      message: `${targetRoleName} account created successfully`,
      user: { id: newUser._id, email: newUser.email }
    });
  } catch (error) {
    console.error('Invite Error:', error);
    res.status(500).json({ error: 'Server error during invite' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find User
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Fetch Role (simplifying to grab the first associated role)
    const userRoleLink = await UserRole.findOne({ user_id: user._id }).populate('role_id');
    const roleName = userRoleLink && userRoleLink.role_id ? userRoleLink.role_id.name : 'User';

    // Generate Tokens
    const { accessToken, refreshToken } = generateTokens(user._id, roleName);

    // Calculate Refresh Token Expiry (e.g., 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store Refresh Token in DB
    await UserSession.create({
      user_id: user._id,
      refresh_token: refreshToken,
      device_info: req.headers['user-agent'] || 'Unknown Device',
      ip_address: req.ip || req.socket.remoteAddress,
      expires_at: expiresAt
    });

    // Respond with tokens
    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: roleName,
        first_name: user.first_name
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token against DB
    const session = await UserSession.findOne({ refresh_token: refreshToken }).populate('user_id');
    if (!session || session.expires_at < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token. Please login again.' });
    }

    const user = session.user_id;
    
    // Optional: Fetch latest role
    const userRoleLink = await UserRole.findOne({ user_id: user._id }).populate('role_id');
    const roleName = userRoleLink && userRoleLink.role_id ? userRoleLink.role_id.name : 'User';

    // Generate NEW tokens (Refresh Token Rotation is best practice, or just issue new Access Token)
    // Here we'll just issue a new Access Token for simplicity, but we could rotate both.
    const newTokens = generateTokens(user._id, roleName);

    // Update session with new refresh token and extend expiry
    session.refresh_token = newTokens.refreshToken;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    session.expires_at = expiresAt;
    await session.save();

    res.status(200).json({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken
    });
  } catch (error) {
    console.error('Refresh Token Error:', error);
    res.status(500).json({ error: 'Server error during token refresh' });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await UserSession.deleteOne({ refresh_token: refreshToken });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { first_name, last_name, phone },
      { new: true, runValidators: true }
    ).select('-password_hash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Also attach their role to the response
    const userRoleLink = await UserRole.findOne({ user_id: user._id }).populate('role_id');
    const roleName = userRoleLink && userRoleLink.role_id ? userRoleLink.role_id.name : 'User';

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: roleName,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};
