const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const { ALLOWED_DOCUMENT_TYPES } = require('../middleware/upload.middleware');
const storageService = require('../services/storage.service');

// Helper to resolve physical document path safely in root uploads/
const getPhysicalFilePath = (applicationId, storedName) => {
  return storageService.getPhysicalFilePath(applicationId, storedName);
};

// POST /api/applications/me/documents/:documentType
// Local development multipart upload endpoint (preserved unchanged)
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
      storageProvider: 'local',
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    };

    if (!application.documents) {
      application.documents = {};
    }
    application.documents[documentType] = newMetadata;

    await application.save();

    // After DB save succeeds, remove old file (local or blob) if present
    if (oldDocument && (oldDocument.storedName !== req.file.filename || oldDocument.storageProvider === 'blob')) {
      await storageService.deleteStoredFile(application._id, oldDocument);
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

// POST /api/applications/me/documents/:documentType/signed-upload-url
// Generates short-lived signed PUT URL for direct browser upload to Private Blob
const getSignedUploadUrl = async (req, res) => {
  try {
    const documentType = req.params.documentType;
    const { originalName, mimeType, size } = req.body || {};

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ message: `Invalid document type '${documentType}'` });
    }

    const application = req.application || (await Application.findOne({ applicant: req.user._id }));
    if (!application) {
      return res.status(404).json({ message: 'No admission application found. Create an application draft first.' });
    }

    // SERVER-SIDE LOCK: Submitted applications cannot accept new document uploads
    if (application.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Submitted applications can no longer accept document uploads.' });
    }

    const result = await storageService.generateSignedUploadUrl({
      applicationId: application._id,
      documentType,
      originalName,
      mimeType,
      size
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get signed upload URL error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || 'Error generating signed upload URL' });
  }
};

// POST /api/applications/me/documents/:documentType/confirm
// Verifies that direct-uploaded blob exists and is valid before saving metadata to MongoDB
const confirmDocumentUpload = async (req, res) => {
  try {
    const documentType = req.params.documentType;
    const { pathname, originalName, mimeType } = req.body || {};

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ message: `Invalid document type '${documentType}'` });
    }

    if (!pathname) {
      return res.status(400).json({ message: 'Missing blob pathname for verification.' });
    }

    const application = req.application || (await Application.findOne({ applicant: req.user._id }));
    if (!application) {
      return res.status(404).json({ message: 'No admission application found.' });
    }

    // SERVER-SIDE LOCK: Submitted applications cannot accept document modifications
    if (application.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Submitted applications can no longer accept document modifications.' });
    }

    const verifiedMeta = await storageService.verifyAndFinalizeBlobUpload({
      applicationId: application._id,
      documentType,
      pathname,
      originalName,
      mimeType
    });

    const oldDocument = application.documents ? application.documents[documentType] : null;

    if (!application.documents) {
      application.documents = {};
    }
    application.documents[documentType] = verifiedMeta;

    await application.save();

    // After DB save succeeds, safely cleanup old document if it was replaced
    if (oldDocument && (oldDocument.storedName || oldDocument.relativePath)) {
      await storageService.deleteStoredFile(application._id, oldDocument);
    }

    return res.status(200).json({
      message: `Document '${documentType}' uploaded successfully`,
      documentType,
      metadata: verifiedMeta
    });
  } catch (error) {
    console.error('Confirm document upload error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || 'Error confirming document upload' });
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

    // Remove metadata from MongoDB first
    application.documents[documentType] = null;
    await application.save();

    // Safely remove file from local disk or Private Blob
    await storageService.deleteStoredFile(application._id, docMeta);

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

// GET /api/applications/me/documents/:documentType/view-url
// Returns short-lived signed GET URL for Blob or relative path for local disk
const getDocumentViewUrl = async (req, res) => {
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
    if (!docMeta) {
      return res.status(404).json({ message: `No document file found for slot '${documentType}'` });
    }

    const viewResult = await storageService.generateSignedViewUrl(docMeta);
    if (!viewResult) {
      return res.status(404).json({ message: 'Unable to resolve view URL for document' });
    }

    if (viewResult.storageProvider === 'blob') {
      return res.status(200).json({
        url: viewResult.url,
        storageProvider: 'blob'
      });
    }

    // Local filesystem preview URL
    return res.status(200).json({
      url: `/api/applications/me/documents/${documentType}/file`,
      storageProvider: 'local'
    });
  } catch (error) {
    console.error('Get document view URL error:', error);
    return res.status(500).json({ message: 'Error generating document view URL' });
  }
};

// GET /api/applications/me/documents/:documentType/file
// Streams local physical file or redirects to short-lived signed GET URL for Blob
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
    if (!docMeta || (!docMeta.storedName && !docMeta.relativePath)) {
      return res.status(404).json({ message: `No document file found for slot '${documentType}'` });
    }

    if (storageService.isBlobDocument(docMeta)) {
      const viewResult = await storageService.generateSignedViewUrl(docMeta);
      if (viewResult && viewResult.url) {
        return res.redirect(302, viewResult.url);
      }
      return res.status(404).json({ message: 'Failed to generate signed view URL for blob' });
    }

    const filePath = storageService.getPhysicalFilePath(application._id, docMeta.storedName);

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
  getSignedUploadUrl,
  confirmDocumentUpload,
  deleteDocument,
  getDocumentMetadata,
  getDocumentViewUrl,
  streamDocumentFile
};
