const Application = require('../models/Application');

const VALID_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SELECTED', 'REJECTED'];

/**
 * GET /api/admin/analytics (or /api/admin/applications/analytics)
 * Returns statistical aggregate information for administrative overview using MongoDB aggregation.
 */
const getAdminAnalytics = async (req, res) => {
  try {
    // 1. Status Aggregation Pipeline using $group
    const statusAgg = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Map status counts to ensure all 5 statuses are present in predictable order
    const statusCountMap = {};
    statusAgg.forEach((item) => {
      if (item._id) {
        statusCountMap[item._id] = item.count;
      }
    });

    const byStatus = VALID_STATUSES.map((status) => ({
      status,
      count: statusCountMap[status] || 0
    }));

    const draftCount = statusCountMap['DRAFT'] || 0;
    const submittedCount = statusCountMap['SUBMITTED'] || 0;
    const underReviewCount = statusCountMap['UNDER_REVIEW'] || 0;
    const selectedCount = statusCountMap['SELECTED'] || 0;
    const rejectedCount = statusCountMap['REJECTED'] || 0;

    const totalApplications = draftCount + submittedCount + underReviewCount + selectedCount + rejectedCount;

    // 2. Department Aggregation Pipeline using $group, $cond, and $sort
    const deptAgg = await Application.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              {
                $or: [
                  { $eq: ['$preferredDepartment', ''] },
                  { $eq: ['$preferredDepartment', null] }
                ]
              },
              'Not Selected',
              '$preferredDepartment'
            ]
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1, _id: 1 }
      }
    ]);

    const byDepartment = deptAgg.map((item) => ({
      department: item._id,
      count: item.count
    }));

    // 3. Decision Summary Calculations
    const decidedApplications = selectedCount + rejectedCount;
    const selectionRate = decidedApplications > 0 ? Math.round((selectedCount / decidedApplications) * 100) : 0;

    // 4. Review Pipeline Workload Calculations
    const reviewPipeline = {
      awaitingReview: submittedCount,
      currentlyUnderReview: underReviewCount,
      completedDecisions: decidedApplications
    };

    return res.status(200).json({
      overview: {
        totalApplications,
        draft: draftCount,
        submitted: submittedCount,
        underReview: underReviewCount,
        selected: selectedCount,
        rejected: rejectedCount
      },
      byStatus,
      byDepartment,
      decisions: {
        decidedApplications,
        selected: selectedCount,
        rejected: rejectedCount,
        selectionRate
      },
      reviewPipeline
    });
  } catch (error) {
    console.error('Get admin analytics error:', error);
    return res.status(500).json({ message: 'Error generating admin analytics' });
  }
};

module.exports = {
  getAdminAnalytics
};
