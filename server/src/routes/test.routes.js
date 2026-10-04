const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');

router.get('/admin-only', authMiddleware, allowRoles('admin'), (req, res) => {
  res.status(200).json({
    message: 'Welcome Admin!',
    user: req.user.toSafeObject()
  });
});

module.exports = router;
