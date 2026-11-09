/**
 * Explainable Application Readiness Engine
 * 
 * Deterministic, rule-based, server-side readiness calculation.
 * Evaluates an Application document & metadata without any AI/ML or client manipulation.
 */

const isNonEmptyString = (val) => typeof val === 'string' && val.trim().length > 0;
const isValidNumber = (val) => typeof val === 'number' && !isNaN(val) && val !== null && val !== undefined;

/**
 * Checks if a document slot in application.documents metadata exists.
 */
const isDocumentUploaded = (app, docType) => {
  const docMeta = app?.documents?.[docType];
  return Boolean(docMeta && docMeta.storedName && docMeta.originalName);
};

/**
 * Calculates application readiness score and breakdown.
 * @param {Object} application - Mongoose Application document or plain object
 * @returns {Object} Structured readiness report
 */
const calculateReadiness = (application) => {
  const missingItems = [];
  const completedItems = [];

  if (!application) {
    // Generate all missing items if application doesn't exist at all
    return {
      applicationNumber: null,
      readinessScore: 0,
      canSubmit: false,
      breakdown: {
        personalAndAddress: { score: 0, maxScore: 20 },
        academic: { score: 0, maxScore: 20 },
        programSelection: { score: 0, maxScore: 10 },
        marksheets: { score: 0, maxScore: 20 },
        idProof: { score: 0, maxScore: 15 },
        passportPhoto: { score: 0, maxScore: 15 }
      },
      missingItems: getAllPossibleMissingItems(),
      completedItems: []
    };
  }

  // --- Category A: Personal & Address Details (20 points max, 12 required fields) ---
  const personalRequiredFields = [
    { key: 'personal.firstName', field: 'firstName', label: 'First Name', cat: 'Personal & Address Details' },
    { key: 'personal.lastName', field: 'lastName', label: 'Last Name', cat: 'Personal & Address Details' },
    { key: 'personal.dateOfBirth', field: 'dateOfBirth', label: 'Date of Birth', cat: 'Personal & Address Details' },
    { key: 'personal.gender', field: 'gender', label: 'Gender', cat: 'Personal & Address Details' },
    { key: 'personal.phone', field: 'phone', label: 'Phone Number', cat: 'Personal & Address Details' },
    { key: 'personal.email', field: 'email', label: 'Email Address', cat: 'Personal & Address Details' },
    { key: 'personal.nationality', field: 'nationality', label: 'Nationality', cat: 'Personal & Address Details' },
    { key: 'address.addressLine1', field: 'addressLine1', label: 'Address Line 1', cat: 'Personal & Address Details' },
    { key: 'address.city', field: 'city', label: 'City', cat: 'Personal & Address Details' },
    { key: 'address.state', field: 'state', label: 'State', cat: 'Personal & Address Details' },
    { key: 'address.postalCode', field: 'postalCode', label: 'Postal Code', cat: 'Personal & Address Details' },
    { key: 'address.country', field: 'country', label: 'Country', cat: 'Personal & Address Details' }
  ];

  let personalCompletedCount = 0;
  personalRequiredFields.forEach(({ key, field, label, cat }) => {
    if (isNonEmptyString(application[field])) {
      personalCompletedCount += 1;
      completedItems.push({ key, label, category: cat });
    } else {
      missingItems.push({ key, label, category: cat });
    }
  });

  const rawPersonalScore = (personalCompletedCount / personalRequiredFields.length) * 20;

  // --- Category B: Academic Details (20 points max, 10 for Class 10 & 10 for Class 12) ---
  const class10Fields = [
    { key: 'academic.class10.board', field: 'board', label: 'Class 10 Board', type: 'string' },
    { key: 'academic.class10.institutionName', field: 'institutionName', label: 'Class 10 Institution Name', type: 'string' },
    { key: 'academic.class10.passingYear', field: 'passingYear', label: 'Class 10 Passing Year', type: 'number' },
    { key: 'academic.class10.percentage', field: 'percentage', label: 'Class 10 Percentage', type: 'number' }
  ];

  let class10Completed = 0;
  const c10Obj = application.class10 || {};
  class10Fields.forEach(({ key, field, label, type }) => {
    const val = c10Obj[field];
    const isDone = type === 'string' ? isNonEmptyString(val) : isValidNumber(val);
    if (isDone) {
      class10Completed += 1;
      completedItems.push({ key, label, category: 'Academic Details' });
    } else {
      missingItems.push({ key, label, category: 'Academic Details' });
    }
  });

  const class12Fields = [
    { key: 'academic.class12.board', field: 'board', label: 'Class 12 Board', type: 'string' },
    { key: 'academic.class12.institutionName', field: 'institutionName', label: 'Class 12 Institution Name', type: 'string' },
    { key: 'academic.class12.passingYear', field: 'passingYear', label: 'Class 12 Passing Year', type: 'number' },
    { key: 'academic.class12.percentage', field: 'percentage', label: 'Class 12 Percentage', type: 'number' }
  ];

  let class12Completed = 0;
  const c12Obj = application.class12 || {};
  class12Fields.forEach(({ key, field, label, type }) => {
    const val = c12Obj[field];
    const isDone = type === 'string' ? isNonEmptyString(val) : isValidNumber(val);
    if (isDone) {
      class12Completed += 1;
      completedItems.push({ key, label, category: 'Academic Details' });
    } else {
      missingItems.push({ key, label, category: 'Academic Details' });
    }
  });

  const rawClass10Score = (class10Completed / 4) * 10;
  const rawClass12Score = (class12Completed / 4) * 10;
  const rawAcademicScore = rawClass10Score + rawClass12Score;

  // --- Category C: Program Selection (10 points max, 3 required fields) ---
  const programFields = [
    { key: 'program.programLevel', field: 'programLevel', label: 'Program Level', cat: 'Program Selection' },
    { key: 'program.programName', field: 'programName', label: 'Degree', cat: 'Program Selection' },
    { key: 'program.preferredDepartment', field: 'preferredDepartment', label: 'Preferred B.Tech Programme / Specialisation', cat: 'Program Selection' }
  ];

  let programCompletedCount = 0;
  programFields.forEach(({ key, field, label, cat }) => {
    if (isNonEmptyString(application[field])) {
      programCompletedCount += 1;
      completedItems.push({ key, label, category: cat });
    } else {
      missingItems.push({ key, label, category: cat });
    }
  });

  const rawProgramScore = (programCompletedCount / programFields.length) * 10;

  // --- Category D: Marksheets (20 points max: 10 Class 10 + 10 Class 12) ---
  const hasClass10Marksheet = isDocumentUploaded(application, 'class10Marksheet');
  const hasClass12Marksheet = isDocumentUploaded(application, 'class12Marksheet');

  if (hasClass10Marksheet) {
    completedItems.push({ key: 'documents.class10Marksheet', label: 'Class 10 Marksheet', category: 'Documents' });
  } else {
    missingItems.push({ key: 'documents.class10Marksheet', label: 'Class 10 Marksheet', category: 'Documents' });
  }

  if (hasClass12Marksheet) {
    completedItems.push({ key: 'documents.class12Marksheet', label: 'Class 12 Marksheet', category: 'Documents' });
  } else {
    missingItems.push({ key: 'documents.class12Marksheet', label: 'Class 12 Marksheet', category: 'Documents' });
  }

  const rawMarksheetsScore = (hasClass10Marksheet ? 10 : 0) + (hasClass12Marksheet ? 10 : 0);

  // --- Category E: ID Proof (15 points max) ---
  const hasIdProof = isDocumentUploaded(application, 'idProof');
  if (hasIdProof) {
    completedItems.push({ key: 'documents.idProof', label: 'ID Proof', category: 'Documents' });
  } else {
    missingItems.push({ key: 'documents.idProof', label: 'ID Proof', category: 'Documents' });
  }
  const rawIdProofScore = hasIdProof ? 15 : 0;

  // --- Category F: Passport Photo (15 points max) ---
  const hasPassportPhoto = isDocumentUploaded(application, 'passportPhoto');
  if (hasPassportPhoto) {
    completedItems.push({ key: 'documents.passportPhoto', label: 'Passport Photo', category: 'Documents' });
  } else {
    missingItems.push({ key: 'documents.passportPhoto', label: 'Passport Photo', category: 'Documents' });
  }
  const rawPassportPhotoScore = hasPassportPhoto ? 15 : 0;

  // --- Total Score Calculation ---
  const unroundedTotal = rawPersonalScore + rawAcademicScore + rawProgramScore + rawMarksheetsScore + rawIdProofScore + rawPassportPhotoScore;
  
  // Clean integer readiness score bounded between 0 and 100
  const readinessScore = Math.min(100, Math.max(0, Math.round(unroundedTotal)));

  // Submission eligibility requirement: score MUST be exactly 100 AND zero missing items
  const canSubmit = readinessScore === 100 && missingItems.length === 0;

  return {
    applicationNumber: application.applicationNumber || null,
    readinessScore,
    canSubmit,
    breakdown: {
      personalAndAddress: {
        score: Math.round(rawPersonalScore),
        maxScore: 20
      },
      academic: {
        score: Math.round(rawAcademicScore),
        maxScore: 20
      },
      programSelection: {
        score: Math.round(rawProgramScore),
        maxScore: 10
      },
      marksheets: {
        score: Math.round(rawMarksheetsScore),
        maxScore: 20
      },
      idProof: {
        score: Math.round(rawIdProofScore),
        maxScore: 15
      },
      passportPhoto: {
        score: Math.round(rawPassportPhotoScore),
        maxScore: 15
      }
    },
    missingItems,
    completedItems
  };
};

/**
 * Returns full list of missing items when no application exists yet.
 */
function getAllPossibleMissingItems() {
  return [
    { key: 'personal.firstName', label: 'First Name', category: 'Personal & Address Details' },
    { key: 'personal.lastName', label: 'Last Name', category: 'Personal & Address Details' },
    { key: 'personal.dateOfBirth', label: 'Date of Birth', category: 'Personal & Address Details' },
    { key: 'personal.gender', label: 'Gender', category: 'Personal & Address Details' },
    { key: 'personal.phone', label: 'Phone Number', category: 'Personal & Address Details' },
    { key: 'personal.email', label: 'Email Address', category: 'Personal & Address Details' },
    { key: 'personal.nationality', label: 'Nationality', category: 'Personal & Address Details' },
    { key: 'address.addressLine1', label: 'Address Line 1', category: 'Personal & Address Details' },
    { key: 'address.city', label: 'City', category: 'Personal & Address Details' },
    { key: 'address.state', label: 'State', category: 'Personal & Address Details' },
    { key: 'address.postalCode', label: 'Postal Code', category: 'Personal & Address Details' },
    { key: 'address.country', label: 'Country', category: 'Personal & Address Details' },
    { key: 'academic.class10.board', label: 'Class 10 Board', category: 'Academic Details' },
    { key: 'academic.class10.institutionName', label: 'Class 10 Institution Name', category: 'Academic Details' },
    { key: 'academic.class10.passingYear', label: 'Class 10 Passing Year', category: 'Academic Details' },
    { key: 'academic.class10.percentage', label: 'Class 10 Percentage', category: 'Academic Details' },
    { key: 'academic.class12.board', label: 'Class 12 Board', category: 'Academic Details' },
    { key: 'academic.class12.institutionName', label: 'Class 12 Institution Name', category: 'Academic Details' },
    { key: 'academic.class12.passingYear', label: 'Class 12 Passing Year', category: 'Academic Details' },
    { key: 'academic.class12.percentage', label: 'Class 12 Percentage', category: 'Academic Details' },
    { key: 'program.programLevel', label: 'Program Level', category: 'Program Selection' },
    { key: 'program.programName', label: 'Degree', category: 'Program Selection' },
    { key: 'program.preferredDepartment', label: 'Preferred B.Tech Programme / Specialisation', category: 'Program Selection' },
    { key: 'documents.class10Marksheet', label: 'Class 10 Marksheet', category: 'Documents' },
    { key: 'documents.class12Marksheet', label: 'Class 12 Marksheet', category: 'Documents' },
    { key: 'documents.idProof', label: 'ID Proof', category: 'Documents' },
    { key: 'documents.passportPhoto', label: 'Passport Photo', category: 'Documents' }
  ];
}

module.exports = {
  calculateReadiness
};
