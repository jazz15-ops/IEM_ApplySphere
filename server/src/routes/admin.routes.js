const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminAnalyticsController = require('../controllers/adminAnalytics.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');

// All admin routes strictly require valid JWT and admin role
router.use(authMiddleware);
router.use(allowRoles('admin'));

// Admin Analytics Route
router.get('/analytics', adminAnalyticsController.getAdminAnalytics);

// Admin Application Review Routes
router.get('/', adminController.getAdminApplications);
router.get('/:applicationId', adminController.getAdminApplicationById);
router.get('/:applicationId/documents/:documentType/view-url', adminController.getAdminDocumentViewUrl);
router.get('/:applicationId/documents/:documentType/file', adminController.streamAdminDocumentFile);
router.patch('/:applicationId/status', adminController.updateApplicationStatusByAdmin);

module.exports = router;
