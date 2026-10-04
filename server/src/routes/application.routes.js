const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/application.controller');
const documentController = require('../controllers/document.controller');
const readinessController = require('../controllers/readiness.controller');
const adminStatusController = require('../controllers/adminStatus.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const { upload } = require('../middleware/upload.middleware');
const multer = require('multer');

// All routes in this router require authentication
router.use(authMiddleware);

// Multer upload error handler middleware
const handleMulterUpload = (req, res, next) => {
  const singleUpload = upload.single('file');
  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum allowed size is 5 MB.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      const statusCode = err.statusCode || 400;
      return res.status(statusCode).json({ message: err.message });
    }
    next();
  });
};

// --- APPLICANT-ONLY ROUTES ---
router.post('/', allowRoles('applicant'), applicationController.createApplication);
router.get('/me', allowRoles('applicant'), applicationController.getMyApplication);
router.patch('/me', allowRoles('applicant'), applicationController.updateMyApplication);
router.get('/me/readiness', allowRoles('applicant'), readinessController.getMyApplicationReadiness);
router.post('/me/submit', allowRoles('applicant'), applicationController.submitMyApplication);
router.get('/me/status', allowRoles('applicant'), applicationController.getMyApplicationStatus);

// Applicant Document Routes
router.get('/me/documents', allowRoles('applicant'), documentController.getDocumentMetadata);
router.get('/me/documents/:documentType/file', allowRoles('applicant'), documentController.streamDocumentFile);
router.post('/me/documents/:documentType', allowRoles('applicant'), handleMulterUpload, documentController.uploadDocument);
router.delete('/me/documents/:documentType', allowRoles('applicant'), documentController.deleteDocument);

// --- ADMIN-ONLY ROUTES ---
router.patch('/:applicationId/status', allowRoles('admin'), adminStatusController.updateApplicationStatusByAdmin);

module.exports = router;
