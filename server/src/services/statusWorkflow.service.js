/**
 * Server-Controlled Status Workflow Service
 * 
 * Centralizes and enforces the authoritative application status transition matrix.
 * Enforces valid state changes, manages audit logs (statusHistory), and records server timestamps.
 */

const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['SELECTED', 'REJECTED'],
  SELECTED: [],
  REJECTED: []
});

const VALID_STATUSES = Object.freeze(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SELECTED', 'REJECTED']);

/**
 * Checks if a transition from currentStatus to targetStatus is permitted.
 */
const isValidTransition = (currentStatus, targetStatus) => {
  if (!currentStatus || !targetStatus) return false;
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
  return Boolean(allowedNext && allowedNext.includes(targetStatus));
};

/**
 * Executes a status transition on an application document.
 * @param {Object} application - Mongoose Application instance
 * @param {String} targetStatus - Target status to transition to
 * @param {Object} user - User object performing the transition ({ _id, role })
 */
const executeTransition = async (application, targetStatus, user) => {
  if (!application) {
    throw new Error('Application document is required for status transition');
  }

  if (!VALID_STATUSES.includes(targetStatus)) {
    throw new Error(`Invalid target status '${targetStatus}'`);
  }

  const currentStatus = application.status || 'DRAFT';

  // Prevent duplicate transition if status is already targetStatus
  if (currentStatus === targetStatus) {
    throw new Error(`Application is already in status '${targetStatus}'`);
  }

  if (!isValidTransition(currentStatus, targetStatus)) {
    throw new Error(`Invalid status transition: Cannot change status from '${currentStatus}' to '${targetStatus}'`);
  }

  const now = new Date();

  // Set server-controlled timestamps based on target state
  if (targetStatus === 'SUBMITTED') {
    application.submittedAt = now;
  } else if (targetStatus === 'UNDER_REVIEW') {
    application.reviewStartedAt = now;
  } else if (targetStatus === 'SELECTED' || targetStatus === 'REJECTED') {
    application.decisionAt = now;
  }

  // Append history entry
  if (!Array.isArray(application.statusHistory)) {
    application.statusHistory = [];
  }

  application.statusHistory.push({
    status: targetStatus,
    changedAt: now,
    changedBy: user._id,
    changedByRole: user.role
  });

  // Update current status
  application.status = targetStatus;

  await application.save();
  return application;
};

module.exports = {
  ALLOWED_TRANSITIONS,
  VALID_STATUSES,
  isValidTransition,
  executeTransition
};
