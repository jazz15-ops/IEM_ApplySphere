const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing');
  }

  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    secret,
    { expiresIn }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields (name, email, phone, password) are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // CRITICAL: Public registration strictly creates applicant role
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      passwordHash,
      role: 'applicant'
    });

    await newUser.save();

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: newUser.toSafeObject()
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Error registering user' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user with passwordHash explicitly selected
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Error logging in' });
  }
};

const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      user: req.user.toSafeObject()
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ message: 'Error retrieving user profile' });
  }
};

module.exports = {
  register,
  login,
  getMe
};
