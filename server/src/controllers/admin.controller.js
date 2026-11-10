const Application = require('../models/Application');
const User = require('../models/User');
const { calculateReadiness } = require('../services/readiness.service');
const { executeTransition, VALID_STATUSES } = require('../services/statusWorkflow.service');
const { ALLOWED_DOCUMENT_TYPES } = require('../middleware/upload.middleware');
const storageService = require('../services/storage.service');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Helper to safely escape regex special characters
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/admin/applications
 * List applications with search, status & department filters, and pagination.
 */
const getAdminApplications = async (req, res) => {
  try {
    let { status, department, search, page = 1, limit = 10 } = req.query;

    // Parse & sanitize pagination
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50; // Constrain maximum limit to 50

    const filter = {};

    // Filter by status if valid
    if (status && typeof status === 'string' && VALID_STATUSES.includes(status.trim().toUpperCase())) {
      filter.status = status.trim().toUpperCase();
    }

    // Filter by department
    if (department && typeof department === 'string' && department.trim()) {
      filter.preferredDepartment = { $regex: escapeRegex(department.trim()), $options: 'i' };
    }

    // Filter by search term
    if (search && typeof search === 'string' && search.trim()) {
      const searchStr = search.trim();
      const escapedTerm = escapeRegex(searchStr);
      const searchRegex = new RegExp(escapedTerm, 'i');

      // 1. Cross-collection lookup: find matching users by name or email
      // (User schema stores single 'name' and 'email')
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }]
      }).select('_id');

      const userIds = matchingUsers.map(u => u._id);

      // 2. Build search conditions for Application collection
      const searchOr = [
        { applicationNumber: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { applicant: { $in: userIds } }
      ];

      // 3. Support full applicant name search where practical (e.g. "Ana Roy")
      // If search contains multiple words, match firstName and lastName together
      const nameParts = searchStr.split(/\s+/).filter(Boolean);
      if (nameParts.length >= 2) {
        const firstPartRegex = new RegExp(escapeRegex(nameParts[0]), 'i');
        const lastPartRegex = new RegExp(escapeRegex(nameParts.slice(1).join(' ')), 'i');
        searchOr.push({
          $and: [
            { firstName: firstPartRegex },
            { lastName: lastPartRegex }
          ]
        });
      }

      filter.$or = searchOr;
    }

    const total = await Application.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    const applications = await Application.find(filter)
      .populate('applicant', 'name email phone')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const mappedApplications = applications.map(app => {
      const readiness = calculateReadiness(app);
      const fullName = `${app.firstName || ''} ${app.lastName || ''}`.trim();
      const applicantName = fullName.length > 0 ? fullName : (app.applicant?.name || 'N/A');
      const applicantEmail = app.email || app.applicant?.email || 'N/A';

      return {
        _id: app._id,
        applicationNumber: app.applicationNumber,
        applicantName,
        applicantEmail,
        preferredDepartment: app.preferredDepartment || 'N/A',
        programName: app.programName || 'N/A',
        status: app.status,
        readinessScore: readiness.readinessScore,
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt
      };
    });

    return res.status(200).json({
      applications: mappedApplications,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get admin applications error:', error);
    return res.status(500).json({ message: 'Error retrieving applications' });
  }
};

/**
 * GET /api/admin/applications/:applicationId
 * Get detailed application information for administrative review.
 */
const getAdminApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;

    let query = {};
    if (mongoose.Types.ObjectId.isValid(applicationId)) {
      query = { _id: applicationId };
    } else {
      query = { applicationNumber: applicationId };
    }

    const application = await Application.findOne(query).populate('applicant', '-passwordHash');
    if (!application) {
      return res.status(404).json({ message: `Application not found for ID '${applicationId}'` });
    }

    // Compute readiness server-side
    const readinessReport = calculateReadiness(application);

    const detailPayload = {
      _id: application._id,
      applicationNumber: application.applicationNumber,
      status: application.status,
      submittedAt: application.submittedAt,
      reviewStartedAt: application.reviewStartedAt,
      decisionAt: application.decisionAt,
      statusHistory: application.statusHistory,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      applicant: {
        _id: application.applicant?._id,
        name: application.applicant?.name || `${application.firstName} ${application.lastName}`.trim(),
        email: application.applicant?.email || application.email,
        phone: application.applicant?.phone || application.phone,
        role: application.applicant?.role
      },
      personalDetails: {
        firstName: application.firstName,
        middleName: application.middleName,
        lastName: application.lastName,
        dateOfBirth: application.dateOfBirth,
        gender: application.gender,
        phone: application.phone,
        alternatePhone: application.alternatePhone,
        email: application.email,
        nationality: application.nationality
      },
      addressDetails: {
        addressLine1: application.addressLine1,
        addressLine2: application.addressLine2,
        city: application.city,
        state: application.state,
        postalCode: application.postalCode,
        country: application.country
      },
      academicDetails: {
        class10: application.class10,
        class12: application.class12
      },
      programSelection: {
        programLevel: application.programLevel,
        programName: application.programName,
        preferredDepartment: application.preferredDepartment
      },
      documents: application.documents || {},
      readiness: readinessReport
    };

    return res.status(200).json(detailPayload);
  } catch (error) {
    console.error('Get admin application detail error:', error);
    return res.status(500).json({ message: 'Error retrieving application detail' });
  }
};

/**
/**
 * GET /api/admin/applications/:applicationId/documents/:documentType/file
 * Admin-only protected streaming of applicant uploaded document file (or 302 redirect for Blob).
 */
const streamAdminDocumentFile = async (req, res) => {
  try {
    const { applicationId, documentType } = req.params;

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ message: `Invalid document type '${documentType}'` });
    }

    let query = {};
    if (mongoose.Types.ObjectId.isValid(applicationId)) {
      query = { _id: applicationId };
    } else {
      query = { applicationNumber: applicationId };
    }

    const application = await Application.findOne(query);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const docMeta = application.documents ? application.documents[documentType] : null;
    if (!docMeta || (!docMeta.storedName && !docMeta.relativePath)) {
      return res.status(404).json({ message: `No document uploaded for slot '${documentType}'` });
    }

    if (storageService.isBlobDocument(docMeta)) {
      const viewResult = await storageService.generateSignedViewUrl(docMeta);
      if (viewResult && viewResult.url) {
        return res.redirect(302, viewResult.url);
      }
      return res.status(404).json({ message: 'Failed to generate signed view URL for blob' });
    }

    const uploadsDir = path.resolve(__dirname, '../../../uploads/applications');
    const filePath = path.join(uploadsDir, application._id.toString(), path.basename(docMeta.storedName));

    // Verify path traversal prevention
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).json({ message: 'Access forbidden: Invalid file path' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Physical file not found on disk' });
    }

    res.setHeader('Content-Type', docMeta.mimeType || 'application/octet-stream');
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Stream admin document error:', error);
    return res.status(500).json({ message: 'Error streaming document file' });
  }
};

/**
 * GET /api/admin/applications/:applicationId/documents/:documentType/view-url
 * Returns short-lived signed GET URL for Blob or local streaming URL for admin preview.
 */
const getAdminDocumentViewUrl = async (req, res) => {
  try {
    const { applicationId, documentType } = req.params;

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ message: `Invalid document type '${documentType}'` });
    }

    let query = {};
    if (mongoose.Types.ObjectId.isValid(applicationId)) {
      query = { _id: applicationId };
    } else {
      query = { applicationNumber: applicationId };
    }

    const application = await Application.findOne(query);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const docMeta = application.documents ? application.documents[documentType] : null;
    if (!docMeta) {
      return res.status(404).json({ message: `No document uploaded for slot '${documentType}'` });
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

    return res.status(200).json({
      url: `/api/admin/applications/${application._id}/documents/${documentType}/file`,
      storageProvider: 'local'
    });
  } catch (error) {
    console.error('Get admin document view URL error:', error);
    return res.status(500).json({ message: 'Error generating admin document view URL' });
  }
};

/**
 * PATCH /api/admin/applications/:applicationId/status
 * Admin status transition handler.
 */
const updateApplicationStatusByAdmin = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status: targetStatus } = req.body;

    if (!targetStatus) {
      return res.status(400).json({ message: 'Target status field is required in request body' });
    }

    if (!VALID_STATUSES.includes(targetStatus)) {
      return res.status(400).json({ message: `Invalid target status '${targetStatus}'` });
    }

    let query = {};
    if (mongoose.Types.ObjectId.isValid(applicationId)) {
      query = { _id: applicationId };
    } else {
      query = { applicationNumber: applicationId };
    }

    const application = await Application.findOne(query);
    if (!application) {
      return res.status(404).json({ message: `Application not found for ID '${applicationId}'` });
    }

    await executeTransition(application, targetStatus, req.user);

    return res.status(200).json({
      message: `Application status transitioned to '${targetStatus}' successfully`,
      applicationNumber: application.applicationNumber,
      status: application.status,
      submittedAt: application.submittedAt,
      reviewStartedAt: application.reviewStartedAt,
      decisionAt: application.decisionAt,
      statusHistory: application.statusHistory
    });
  } catch (error) {
    console.error('Admin status transition error:', error.message);
    return res.status(400).json({ message: error.message || 'Error updating application status' });
  }
};

module.exports = {
  getAdminApplications,
  getAdminApplicationById,
  streamAdminDocumentFile,
  getAdminDocumentViewUrl,
  updateApplicationStatusByAdmin
};
