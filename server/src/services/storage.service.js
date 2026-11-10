const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ALLOWED_DOCUMENT_TYPES } = require('../middleware/upload.middleware');

const ALLOWED_MIME_TYPES = {
  class10Marksheet: ['application/pdf', 'image/jpeg', 'image/png'],
  class12Marksheet: ['application/pdf', 'image/jpeg', 'image/png'],
  idProof: ['application/pdf', 'image/jpeg', 'image/png'],
  passportPhoto: ['image/jpeg', 'image/png']
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Helper to resolve physical document path for local disk storage
const getPhysicalFilePath = (applicationId, storedName) => {
  const uploadsDir = path.resolve(__dirname, '../../../uploads/applications');
  const targetDir = path.join(uploadsDir, applicationId.toString());
  const safeFilename = path.basename(storedName);
  return path.join(targetDir, safeFilename);
};

// Check if Vercel Blob storage is configured / active in this environment
const isBlobStorageEnabled = () => {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.BLOB_STORE_ID ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.STORAGE_PROVIDER === 'blob'
  );
};

// Determine whether a given document metadata entry belongs to Blob storage
const isBlobDocument = (docMeta) => {
  if (!docMeta) return false;
  if (docMeta.storageProvider === 'blob') return true;
  if (docMeta.relativePath && !docMeta.relativePath.startsWith('uploads/')) return true;
  return false;
};

// Generate safe, server-controlled unique pathname for Private Blob
const generateBlobPathname = (applicationId, documentType, originalName) => {
  const ext = (path.extname(originalName || '').toLowerCase()) || '.bin';
  const randomHex = crypto.randomBytes(4).toString('hex');
  return `applications/${applicationId.toString()}/${documentType}/${documentType}-${Date.now()}-${randomHex}${ext}`;
};

/**
 * Generate a short-lived signed PUT URL for direct client upload to Private Blob.
 * Scoped strictly to the specific server-generated pathname, operation, MIME type, and size.
 */
const generateSignedUploadUrl = async ({ applicationId, documentType, originalName, mimeType, size }) => {
  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    const err = new Error(`Invalid document type: ${documentType}`);
    err.statusCode = 400;
    throw err;
  }

  const allowedMimes = ALLOWED_MIME_TYPES[documentType];
  const normalizedMime = (mimeType || '').toLowerCase();
  if (!allowedMimes.includes(normalizedMime)) {
    let msg = `Unsupported file type '${mimeType}'. Allowed: PDF, JPEG, PNG.`;
    if (documentType === 'passportPhoto') {
      msg = 'Passport photo must be an image (JPEG, JPG, or PNG). PDF is not allowed.';
    }
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  }

  if (size && size > MAX_FILE_SIZE) {
    const err = new Error('File exceeds maximum allowed size of 5 MB');
    err.statusCode = 400;
    throw err;
  }

  const pathname = generateBlobPathname(applicationId, documentType, originalName);
  const validUntil = Date.now() + 15 * 60 * 1000; // 15 minutes validity

  const { issueSignedToken, presignUrl } = require('@vercel/blob');

  const token = await issueSignedToken({
    pathname,
    operations: ['put'],
    validUntil,
    allowedContentTypes: [normalizedMime],
    maximumSizeInBytes: MAX_FILE_SIZE
  });

  const { presignedUrl } = await presignUrl(token, {
    operation: 'put',
    pathname,
    access: 'private',
    validUntil,
    allowedContentTypes: [normalizedMime],
    maximumSizeInBytes: MAX_FILE_SIZE
  });

  return {
    uploadUrl: presignedUrl,
    pathname,
    documentType
  };
};

/**
 * Confirm and verify that the uploaded private blob exists and is valid before saving to MongoDB.
 */
const verifyAndFinalizeBlobUpload = async ({ applicationId, documentType, pathname, originalName, mimeType }) => {
  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    const err = new Error(`Invalid document type: ${documentType}`);
    err.statusCode = 400;
    throw err;
  }

  const expectedPrefix = `applications/${applicationId.toString()}/${documentType}/`;
  if (!pathname || !pathname.startsWith(expectedPrefix)) {
    const err = new Error('Invalid or unauthorized blob pathname for this application');
    err.statusCode = 403;
    throw err;
  }

  const { head, del } = require('@vercel/blob');

  let blobMeta;
  try {
    blobMeta = await head(pathname);
  } catch (headErr) {
    const err = new Error(`Failed to verify uploaded blob: ${headErr.message}`);
    err.statusCode = 400;
    throw err;
  }

  if (!blobMeta) {
    const err = new Error('Uploaded document blob could not be located in Blob storage');
    err.statusCode = 404;
    throw err;
  }

  if (blobMeta.size > MAX_FILE_SIZE) {
    await del(pathname).catch(() => {});
    const err = new Error('Uploaded file exceeds the maximum allowed size of 5 MB');
    err.statusCode = 400;
    throw err;
  }

  // Verify content-type matches allowed slot types
  const allowedMimes = ALLOWED_MIME_TYPES[documentType];
  const detectedContentType = (blobMeta.contentType || mimeType || '').toLowerCase();
  if (detectedContentType && !allowedMimes.includes(detectedContentType)) {
    await del(pathname).catch(() => {});
    const err = new Error(`Uploaded file type '${detectedContentType}' is not permitted for ${documentType}`);
    err.statusCode = 400;
    throw err;
  }

  return {
    originalName: originalName || path.basename(pathname),
    storedName: path.basename(pathname),
    relativePath: pathname,
    storageProvider: 'blob',
    mimeType: mimeType || blobMeta.contentType || 'application/octet-stream',
    size: blobMeta.size,
    uploadedAt: new Date()
  };
};

/**
 * Generate a short-lived signed GET URL for private blob viewing / downloading.
 */
const generateSignedViewUrl = async (docMeta) => {
  if (!docMeta || !docMeta.relativePath) {
    return null;
  }

  if (isBlobDocument(docMeta)) {
    const { issueSignedToken, presignUrl } = require('@vercel/blob');
    const validUntil = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    const token = await issueSignedToken({
      pathname: docMeta.relativePath,
      operations: ['get'],
      validUntil
    });

    const { presignedUrl } = await presignUrl(token, {
      operation: 'get',
      pathname: docMeta.relativePath,
      access: 'private',
      validUntil
    });

    return {
      url: presignedUrl,
      storageProvider: 'blob'
    };
  }

  return {
    storageProvider: 'local'
  };
};

/**
 * Safely delete an existing document from local filesystem or Private Blob.
 */
const deleteStoredFile = async (applicationId, docMeta) => {
  if (!docMeta) return;

  if (isBlobDocument(docMeta)) {
    try {
      const { del } = require('@vercel/blob');
      await del(docMeta.relativePath);
    } catch (err) {
      console.error(`Failed to delete blob at ${docMeta.relativePath}:`, err.message);
    }
  } else if (docMeta.storedName) {
    try {
      const physicalPath = getPhysicalFilePath(applicationId, docMeta.storedName);
      if (fs.existsSync(physicalPath)) {
        fs.unlinkSync(physicalPath);
      }
    } catch (err) {
      console.error(`Failed to delete physical file at ${docMeta.storedName}:`, err.message);
    }
  }
};

module.exports = {
  isBlobStorageEnabled,
  isBlobDocument,
  getPhysicalFilePath,
  generateSignedUploadUrl,
  verifyAndFinalizeBlobUpload,
  generateSignedViewUrl,
  deleteStoredFile,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};
