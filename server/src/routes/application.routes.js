const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/application.controller');
const documentController = require('../controllers/document.controller');
const readinessController = require('../controllers/readiness.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const { upload } = require('../middleware/upload.middleware');
const multer = require('multer');

// All routes require authentication and applicant role
router.use(authMiddleware);
router.use(allowRoles('applicant'));

// Application Draft & Readiness Routes
router.post('/', applicationController.createApplication);
router.get('/me', applicationController.getMyApplication);
router.patch('/me', applicationController.updateMyApplication);
router.get('/me/readiness', readinessController.getMyApplicationReadiness);

// Document Management Routes
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

router.get('/me/documents', documentController.getDocumentMetadata);
router.get('/me/documents/:documentType/file', documentController.streamDocumentFile);
router.post('/me/documents/:documentType', handleMulterUpload, documentController.uploadDocument);
router.delete('/me/documents/:documentType', documentController.deleteDocument);

module.exports = router;
