const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Application = require('../models/Application');

const ALLOWED_DOCUMENT_TYPES = ['class10Marksheet', 'class12Marksheet', 'idProof', 'passportPhoto'];

const ALLOWED_MIME_TYPES = {
  class10Marksheet: ['application/pdf', 'image/jpeg', 'image/png'],
  class12Marksheet: ['application/pdf', 'image/jpeg', 'image/png'],
  idProof: ['application/pdf', 'image/jpeg', 'image/png'],
  passportPhoto: ['image/jpeg', 'image/png'] // Strictly images only
};

// Custom Storage Engine to dynamically target root uploads/applications/<applicationId>/
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const documentType = req.params.documentType;
      if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
        const err = new Error(`Invalid document type: ${documentType}`);
        err.statusCode = 400;
        return cb(err);
      }

      // Fetch applicant's application to get applicationId
      const application = await Application.findOne({ applicant: req.user._id });
      if (!application) {
        const err = new Error('No admission application found. Please create an application draft first.');
        err.statusCode = 404;
        return cb(err);
      }

      req.application = application; // Attach for downstream controller

      const dir = path.resolve(__dirname, '../../../uploads/applications', application._id.toString());
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    const documentType = req.params.documentType;
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const randomHex = crypto.randomBytes(4).toString('hex');
    const storedName = `${documentType}-${Date.now()}-${randomHex}${ext}`;
    cb(null, storedName);
  }
});

// File filter checking MIME types and extensions
const fileFilter = (req, file, cb) => {
  const documentType = req.params.documentType;

  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    const err = new Error(`Invalid document type: ${documentType}`);
    err.statusCode = 400;
    return cb(err);
  }

  const allowedMimes = ALLOWED_MIME_TYPES[documentType];
  const mimeType = file.mimetype.toLowerCase();

  if (!allowedMimes.includes(mimeType)) {
    let msg = `Unsupported file type '${file.mimetype}'. Allowed: PDF, JPEG, PNG.`;
    if (documentType === 'passportPhoto') {
      msg = 'Passport photo must be an image (JPEG, JPG, or PNG). PDF is not allowed.';
    }
    const err = new Error(msg);
    err.statusCode = 400;
    return cb(err);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  }
});

module.exports = {
  upload,
  ALLOWED_DOCUMENT_TYPES
};
