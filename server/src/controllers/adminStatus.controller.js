const Application = require('../models/Application');
const { executeTransition, VALID_STATUSES } = require('../services/statusWorkflow.service');
const mongoose = require('mongoose');

/**
 * PATCH /api/applications/:applicationId/status
 * Admin-only endpoint to execute authoritative status transitions (e.g. SUBMITTED -> UNDER_REVIEW -> SELECTED / REJECTED)
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

    // Find application by Mongoose _id or applicationNumber
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

    // Execute server-controlled status transition
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
  updateApplicationStatusByAdmin
};
