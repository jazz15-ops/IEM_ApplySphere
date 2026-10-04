const Application = require('../models/Application');

// Helper to generate a collision-safe readable application number with bounded retries
const generateUniqueApplicationNumber = async (maxRetries = 5) => {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const candidateAppNum = `IEM-${year}-${randomDigits}`;

    const existing = await Application.findOne({ applicationNumber: candidateAppNum }).lean();
    if (!existing) {
      return candidateAppNum;
    }
  }

  throw new Error('Unable to generate unique application number. Please try again.');
};

// POST /api/applications - Create a new draft application
const createApplication = async (req, res) => {
  try {
    const applicantId = req.user._id;

    // Check if applicant already has an application
    const existingApp = await Application.findOne({ applicant: applicantId });
    if (existingApp) {
      return res.status(400).json({
        message: 'Application already exists for this applicant',
        applicationNumber: existingApp.applicationNumber
      });
    }

    const applicationNumber = await generateUniqueApplicationNumber();

    // Extract optional payload fields (excluding protected ones)
    const {
      firstName, middleName, lastName, dateOfBirth, gender, phone, alternatePhone,
      email, nationality, addressLine1, addressLine2, city, state, postalCode, country,
      class10, class12, programLevel, programName, preferredDepartment
    } = req.body;

    const newApplication = new Application({
      applicant: applicantId,
      applicationNumber,
      status: 'DRAFT',
      firstName: firstName || req.user.name || '',
      middleName: middleName || '',
      lastName: lastName || '',
      dateOfBirth: dateOfBirth || '',
      gender: gender || '',
      phone: phone || req.user.phone || '',
      alternatePhone: alternatePhone || '',
      email: email || req.user.email || '',
      nationality: nationality || '',
      addressLine1: addressLine1 || '',
      addressLine2: addressLine2 || '',
      city: city || '',
      state: state || '',
      postalCode: postalCode || '',
      country: country || '',
      class10: class10 || {},
      class12: class12 || {},
      programLevel: programLevel || 'Undergraduate',
      programName: programName || 'B.Tech Computer Science',
      preferredDepartment: preferredDepartment || 'School of Engineering & Technology'
    });

    await newApplication.save();

    return res.status(201).json({
      message: 'Draft application created successfully',
      application: newApplication
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    // Handle rare race condition duplicate key error on MongoDB unique index
    if (error.code === 11000) {
      if (error.keyPattern?.applicant) {
        return res.status(400).json({ message: 'Application already exists for this applicant' });
      }
      return res.status(409).json({ message: 'Application number collision detected. Please retry creation.' });
    }
    console.error('Create application error:', error);
    return res.status(500).json({ message: 'Error creating application' });
  }
};

// GET /api/applications/me - Get current applicant's application
const getMyApplication = async (req, res) => {
  try {
    const application = await Application.findOne({ applicant: req.user._id });
    if (!application) {
      return res.status(200).json({
        application: null,
        message: 'No application found for this applicant'
      });
    }

    return res.status(200).json({ application });
  } catch (error) {
    console.error('Get application error:', error);
    return res.status(500).json({ message: 'Error retrieving application' });
  }
};

// PATCH /api/applications/me - Update applicant's draft application
const updateMyApplication = async (req, res) => {
  try {
    const application = await Application.findOne({ applicant: req.user._id });
    if (!application) {
      return res.status(404).json({ message: 'No application found to update' });
    }

    // Strip protected / immutable fields from request payload
    const updateData = { ...req.body };
    delete updateData.applicant;
    delete updateData.applicationNumber;
    delete updateData.status;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.documents;
    delete updateData.readinessScore;
    delete updateData.readiness;
    delete updateData.canSubmit;
    delete updateData.breakdown;
    delete updateData.missingItems;
    delete updateData.completedItems;

    // Apply updates
    Object.keys(updateData).forEach((key) => {
      if (key === 'class10' || key === 'class12') {
        application[key] = { ...application[key].toObject(), ...updateData[key] };
      } else {
        application[key] = updateData[key];
      }
    });

    await application.save();

    return res.status(200).json({
      message: 'Draft application updated successfully',
      application
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Update application error:', error);
    return res.status(500).json({ message: 'Error updating application' });
  }
};

module.exports = {
  createApplication,
  getMyApplication,
  updateMyApplication
};
