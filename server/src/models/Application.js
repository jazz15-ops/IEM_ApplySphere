const mongoose = require('mongoose');

const academicSubSchema = new mongoose.Schema(
  {
    board: { type: String, trim: true, default: '' },
    institutionName: { type: String, trim: true, default: '' },
    passingYear: {
      type: Number,
      validate: {
        validator: function (v) {
          if (v === null || v === undefined) return true;
          return v >= 1970 && v <= 2035;
        },
        message: 'Passing year must be between 1970 and 2035'
      }
    },
    percentage: {
      type: Number,
      validate: {
        validator: function (v) {
          if (v === null || v === undefined) return true;
          return v >= 0 && v <= 100;
        },
        message: 'Percentage must be between 0 and 100'
      }
    }
  },
  { _id: false }
);

const documentMetaSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    relativePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SELECTED', 'REJECTED'],
      required: true
    },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByRole: { type: String, enum: ['applicant', 'admin'], required: true }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SELECTED', 'REJECTED'],
      default: 'DRAFT',
      required: true
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },
    submittedAt: { type: Date, default: null },
    reviewStartedAt: { type: Date, default: null },
    decisionAt: { type: Date, default: null },
    // Personal Details
    firstName: { type: String, trim: true, default: '' },
    middleName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    dateOfBirth: { type: String, trim: true, default: '' },
    gender: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    alternatePhone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    nationality: { type: String, trim: true, default: '' },

    // Address Details
    addressLine1: { type: String, trim: true, default: '' },
    addressLine2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },

    // Academic Details
    class10: { type: academicSubSchema, default: () => ({}) },
    class12: { type: academicSubSchema, default: () => ({}) },

    // Program Selection
    programLevel: { type: String, trim: true, default: 'Undergraduate' },
    programName: { type: String, trim: true, default: 'B.Tech Computer Science' },
    preferredDepartment: { type: String, trim: true, default: 'School of Engineering & Technology' },

    // Document References (Metadata ONLY, no binary contents)
    documents: {
      class10Marksheet: { type: documentMetaSchema, default: null },
      class12Marksheet: { type: documentMetaSchema, default: null },
      idProof: { type: documentMetaSchema, default: null },
      passportPhoto: { type: documentMetaSchema, default: null }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Application', applicationSchema);
