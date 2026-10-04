const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const { ALLOWED_DOCUMENT_TYPES } = require('../middleware/upload.middleware');

// Helper to resolve physical document path safely in root uploads/
const getPhysicalFilePath = (applicationId, storedName) => {
  const uploadsDir = path.resolve(__dirname, '../../../uploads/applications');
  const targetDir = path.join(uploadsDir, applicationId.toString());
  const safeFilename = path.basename(storedName);
  return path.join(targetDir, safeFilename);
};

// POST /api/applications/me/documents/:documentType
const uploadDocument = async (req, res) => {
  try {
    const documentType = req.params.documentType;

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: `Invalid document type '${documentType}'` });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Field name must be "file".' });
    }

    const application = req.application || (await Application.findOne({ applicant: req.user._id }));
    if (!application) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'No admission application found. Create an application draft first.' });
    }

    // SERVER-SIDE LOCK: Submitted applications cannot modify documents
    if (application.status !== 'DRAFT') {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Submitted applications can no longer accept document uploads.' });
    }

    const oldDocument = application.documents ? application.documents[documentType] : null;

    // Create relative path reference
    const relativePath = `uploads/applications/${application._id}/${req.file.filename}`;

    const newMetadata = {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      relativePath,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    };

    if (!application.documents) {
      application.documents = {};
    }
    application.documents[documentType] = newMetadata;

    await application.save();

    // After DB save succeeds, remove old file from disk if present
    if (oldDocument && oldDocument.storedName && oldDocument.storedName !== req.file.filename) {
      const oldFilePath = getPhysicalFilePath(application._id, oldDocument.storedName);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error(`Failed to cleanup old document ${oldFilePath}:`, err.message);
        }
      }
    }

    return res.status(200).json({
      message: `Document '${documentType}' uploaded successfully`,
      documentType,
      metadata: newMetadata
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload document error:', error);
    return res.status(500).json({ message: error.message || 'Error uploading document' });
  }
};

// DELETE /api/applications/me/documents/:documentType
const deleteDocument = async (req, res) => {
  try {
    const documentType = req.params.documentType;

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ message: `Invalid document type '${documentType}'` });
    }

    const application = await Application.findOne({ applicant: req.user._id });
    if (!application) {
      return res.status(404).json({ message: 'No application found' });
    }

    // SERVER-SIDE LOCK: Submitted applications cannot delete documents
    if (application.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Submitted applications can no longer delete documents.' });
    }

    const docMeta = application.documents ? application.documents[documentType] : null;
    if (!docMeta) {
      return res.status(404).json({ message: `No document uploaded for '${documentType}'` });
    }

    const storedName = docMeta.storedName;

    // Remove metadata from MongoDB
    application.documents[documentType] = null;
    await application.save();

    // Remove file from local disk cleanly
    if (storedName) {
      const physicalPath = getPhysicalFilePath(application._id, storedName);
      if (fs.existsSync(physicalPath)) {
        try {
          fs.unlinkSync(physicalPath);
        } catch (err) {
          console.error(`Failed to delete physical file ${physicalPath}:`, err.message);
        }
      }
    }

    return res.status(200).json({
      message: `Document '${documentType}' deleted successfully`,
      documentType
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({ message: 'Error deleting document' });
  }
};

// GET /api/applications/me/documents
const getDocumentMetadata = async (req, res) => {
  try {
    const application = await Application.findOne({ applicant: req.user._id });
    if (!application) {
      return res.status(200).json({
        documents: {
          class10Marksheet: null,
          class12Marksheet: null,
          idProof: null,
          passportPhoto: null
        }
      });
    }

    return res.status(200).json({
      documents: application.documents || {
        class10Marksheet: null,
        class12Marksheet: null,
        idProof: null,
        passportPhoto: null
      }
    });
  } catch (error) {
    console.error('Get document metadata error:', error);
    return res.status(500).json({ message: 'Error retrieving document metadata' });
  }
};

// GET /api/applications/me/documents/:documentType/file
const streamDocumentFile = async (req, res) => {
  try {
    const documentType = req.params.documentType;

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ message: `Invalid document type '${documentType}'` });
    }

    const application = await Application.findOne({ applicant: req.user._id });
    if (!application) {
      return res.status(404).json({ message: 'No application found' });
    }

    const docMeta = application.documents ? application.documents[documentType] : null;
    if (!docMeta || !docMeta.storedName) {
      return res.status(404).json({ message: `No document file found for slot '${documentType}'` });
    }

    const filePath = getPhysicalFilePath(application._id, docMeta.storedName);

    // Verify path traversal prevention
    const uploadsDir = path.resolve(__dirname, '../../../uploads/applications');
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).json({ message: 'Access forbidden: Invalid file path' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Physical file not found on disk' });
    }

    res.setHeader('Content-Type', docMeta.mimeType || 'application/octet-stream');
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Stream document file error:', error);
    return res.status(500).json({ message: 'Error retrieving document file' });
  }
};

module.exports = {
  uploadDocument,
  deleteDocument,
  getDocumentMetadata,
  streamDocumentFile
};
