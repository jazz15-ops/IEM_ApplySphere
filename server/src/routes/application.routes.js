const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/application.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');

// All routes require authentication and applicant role
router.use(authMiddleware);
router.use(allowRoles('applicant'));

router.post('/', applicationController.createApplication);
router.get('/me', applicationController.getMyApplication);
router.patch('/me', applicationController.updateMyApplication);

module.exports = router;
