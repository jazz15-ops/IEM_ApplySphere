const Application = require('../models/Application');
const { calculateReadiness } = require('../services/readiness.service');

/**
 * GET /api/applications/me/readiness
 * Retrieves current authenticated applicant's application readiness score & breakdown.
 */
const getMyApplicationReadiness = async (req, res) => {
  try {
    const applicantId = req.user._id;

    // Fetch applicant's stored application document
    const application = await Application.findOne({ applicant: applicantId });

    // Calculate server-side deterministic readiness
    const readinessReport = calculateReadiness(application);

    return res.status(200).json(readinessReport);
  } catch (error) {
    console.error('Get application readiness error:', error);
    return res.status(500).json({ message: 'Error calculating application readiness' });
  }
};

module.exports = {
  getMyApplicationReadiness
};
