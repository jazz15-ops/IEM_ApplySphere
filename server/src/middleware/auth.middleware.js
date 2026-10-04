const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('FATAL: JWT_SECRET environment variable is missing.');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized access: Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized access: Token not provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorized access: Token invalid or expired' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized access: User no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = authMiddleware;
