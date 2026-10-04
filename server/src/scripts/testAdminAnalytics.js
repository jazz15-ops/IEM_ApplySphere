require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Application = require('../models/Application');

const PORT = 5098;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development_only';

let server;

async function runTests() {
  console.log('=== ADMIN ANALYTICS DASHBOARD FOUNDATION TEST SUITE ===');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iem_applysphere_test';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for testing.');

    server = app.listen(PORT);
    const baseUrl = `http://127.0.0.1:${PORT}`;

    // Clean test DB collections
    await User.deleteMany({ email: /@testanalytics\.com$/ });
    await Application.deleteMany({});

    // 1. Create Test Users (Admin & Applicant)
    const adminUser = await User.create({
      name: 'Analytics Admin',
      email: 'admin@testanalytics.com',
      phone: '9876543210',
      passwordHash: 'hashedpassword',
      role: 'admin'
    });

    const applicantUser = await User.create({
      name: 'Analytics Applicant',
      email: 'applicant@testanalytics.com',
      phone: '9876543211',
      passwordHash: 'hashedpassword',
      role: 'applicant'
    });

    const adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: adminUser.role, email: adminUser.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const applicantToken = jwt.sign(
      { id: applicantUser._id.toString(), role: applicantUser.role, email: applicantUser.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TEST CASE 18: Empty dataset returns valid zero-state response
    console.log('\n--- Testing Empty Dataset Zero-State ---');
    const emptyRes = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const emptyData = await emptyRes.json();
    console.log('Empty Dataset Status:', emptyRes.status);
    console.log('Empty Dataset Overview:', JSON.stringify(emptyData.overview));
    if (
      emptyRes.status === 200 &&
      emptyData.overview.totalApplications === 0 &&
      emptyData.decisions.selectionRate === 0 &&
      emptyData.byDepartment.length === 0
    ) {
      console.log('PASS: Test 18 (Empty dataset zero-state handling)');
      console.log('PASS: Test 15 (Zero decided applications returns selectionRate 0, not NaN)');
    } else {
      throw new Error(`Test 18 failed: unexpected empty dataset output ${JSON.stringify(emptyData)}`);
    }

    // TEST CASE 2: Unauthenticated request -> 401
    console.log('\n--- Testing Unauthenticated Access ---');
    const unauthRes = await fetch(`${baseUrl}/api/admin/analytics`);
    console.log('Unauth Status:', unauthRes.status);
    if (unauthRes.status === 401) {
      console.log('PASS: Test 2 (Unauthenticated request returns 401)');
    } else {
      throw new Error(`Test 2 failed: expected 401, got ${unauthRes.status}`);
    }

    // TEST CASE 3: Applicant request -> 403
    console.log('\n--- Testing Applicant Role Access ---');
    const appRes = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${applicantToken}` }
    });
    console.log('Applicant Status:', appRes.status);
    if (appRes.status === 403) {
      console.log('PASS: Test 3 (Applicant request returns 403)');
    } else {
      throw new Error(`Test 3 failed: expected 403, got ${appRes.status}`);
    }

    // Create 12 distinct applicant users to satisfy unique applicant constraint
    const testAppsData = [
      { status: 'DRAFT', preferredDepartment: 'CSE' },
      { status: 'DRAFT', preferredDepartment: '' },
      { status: 'SUBMITTED', preferredDepartment: 'CSE' },
      { status: 'SUBMITTED', preferredDepartment: 'CSE' },
      { status: 'SUBMITTED', preferredDepartment: 'IT' },
      { status: 'UNDER_REVIEW', preferredDepartment: 'ECE' },
      { status: 'UNDER_REVIEW', preferredDepartment: 'CSE' },
      { status: 'SELECTED', preferredDepartment: 'CSE' },
      { status: 'SELECTED', preferredDepartment: 'CSE' },
      { status: 'SELECTED', preferredDepartment: 'IT' },
      { status: 'SELECTED', preferredDepartment: 'ECE' },
      { status: 'REJECTED', preferredDepartment: 'IT' }
    ];

    for (let i = 0; i < testAppsData.length; i++) {
      const u = await User.create({
        name: `Analytics Applicant ${i + 1}`,
        email: `applicant${i + 1}@testanalytics.com`,
        phone: `98765432${i < 10 ? '0' + i : i}`,
        passwordHash: 'hashedpassword',
        role: 'applicant'
      });

      await Application.create({
        applicant: u._id,
        applicationNumber: `APP-TEST-2026-${100 + i}`,
        status: testAppsData[i].status,
        preferredDepartment: testAppsData[i].preferredDepartment,
        personalDetails: { fullName: `Secret Applicant ${i + 1}` }
      });
    }
    console.log('\nInserted 12 test applications into MongoDB.');

    // TEST CASE 1: Admin analytics request succeeds
    console.log('\n--- Testing Populated Dataset Admin Analytics ---');
    const analyticsRes = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await analyticsRes.json();
    console.log('Populated Status:', analyticsRes.status);
    if (analyticsRes.status === 200) {
      console.log('PASS: Test 1 (Admin analytics request succeeds with 200)');
    } else {
      throw new Error(`Test 1 failed: expected 200, got ${analyticsRes.status}`);
    }

    // Verify Overview Counts (Test 4, 5, 6, 7, 8, 9, 10)
    console.log('\n--- Verifying Overview & Status Counts ---');
    console.log('Overview:', JSON.stringify(data.overview));
    console.log('byStatus:', JSON.stringify(data.byStatus));

    if (data.overview.totalApplications === 12) console.log('PASS: Test 4 (totalApplication count correct: 12)');
    else throw new Error(`Test 4 failed: totalApplications expected 12, got ${data.overview.totalApplications}`);

    if (data.overview.draft === 2) console.log('PASS: Test 5 (DRAFT count correct: 2)');
    else throw new Error(`Test 5 failed: draft expected 2, got ${data.overview.draft}`);

    if (data.overview.submitted === 3) console.log('PASS: Test 6 (SUBMITTED count correct: 3)');
    else throw new Error(`Test 6 failed: submitted expected 3, got ${data.overview.submitted}`);

    if (data.overview.underReview === 2) console.log('PASS: Test 7 (UNDER_REVIEW count correct: 2)');
    else throw new Error(`Test 7 failed: underReview expected 2, got ${data.overview.underReview}`);

    if (data.overview.selected === 4) console.log('PASS: Test 8 (SELECTED count correct: 4)');
    else throw new Error(`Test 8 failed: selected expected 4, got ${data.overview.selected}`);

    if (data.overview.rejected === 1) console.log('PASS: Test 9 (REJECTED count correct: 1)');
    else throw new Error(`Test 9 failed: rejected expected 1, got ${data.overview.rejected}`);

    const sumStatuses = data.byStatus.reduce((acc, curr) => acc + curr.count, 0);
    if (sumStatuses === data.overview.totalApplications) console.log('PASS: Test 10 (Status counts sum to totalApplications)');
    else throw new Error(`Test 10 failed: sum of statuses (${sumStatuses}) != totalApplications (${data.overview.totalApplications})`);

    // Verify Department Aggregation (Test 11, 12)
    console.log('\n--- Verifying Department Aggregation ---');
    console.log('byDepartment:', JSON.stringify(data.byDepartment));
    // Expected departments: CSE: 7, IT: 3, ECE: 2, Not Selected: 1 (Total 13? Wait, let's count our test apps)
    // CSE: 1(draft) + 2(sub) + 1(ur) + 2(sel) = 6
    // IT: 1(sub) + 1(sel) + 1(rej) = 3
    // ECE: 1(ur) + 1(sel) = 2
    // Blank: 1(draft) = 1
    // Total = 6 + 3 + 2 + 1 = 12
    const cseItem = data.byDepartment.find(d => d.department === 'CSE');
    const notSelItem = data.byDepartment.find(d => d.department === 'Not Selected');
    if (cseItem && cseItem.count === 6) {
      console.log('PASS: Test 11 (Department aggregation returns correct counts)');
    } else {
      throw new Error(`Test 11 failed: CSE count expected 6, got ${cseItem ? cseItem.count : 'null'}`);
    }

    if (notSelItem && notSelItem.count === 1) {
      console.log('PASS: Test 12 (Missing department handled safely as "Not Selected")');
    } else {
      throw new Error(`Test 12 failed: Not Selected count expected 1, got ${notSelItem ? notSelItem.count : 'null'}`);
    }

    // Verify Decision Summary (Test 13, 14)
    console.log('\n--- Verifying Decision Summary ---');
    console.log('Decisions:', JSON.stringify(data.decisions));
    // Decided = selected (4) + rejected (1) = 5
    // Selection Rate = (4 / 5) * 100 = 80%
    if (data.decisions.decidedApplications === 5) {
      console.log('PASS: Test 13 (decidedApplications calculation correct: 5)');
    } else {
      throw new Error(`Test 13 failed: decidedApplications expected 5, got ${data.decisions.decidedApplications}`);
    }

    if (data.decisions.selectionRate === 80) {
      console.log('PASS: Test 14 (selectionRate calculation correct: 80%)');
    } else {
      throw new Error(`Test 14 failed: selectionRate expected 80, got ${data.decisions.selectionRate}`);
    }

    // Verify Review Pipeline Workload (Test 16)
    console.log('\n--- Verifying Review Pipeline Workload ---');
    console.log('Review Pipeline:', JSON.stringify(data.reviewPipeline));
    if (
      data.reviewPipeline.awaitingReview === 3 &&
      data.reviewPipeline.currentlyUnderReview === 2 &&
      data.reviewPipeline.completedDecisions === 5
    ) {
      console.log('PASS: Test 16 (Review pipeline workload counts correct)');
    } else {
      throw new Error(`Test 16 failed: unexpected review pipeline counts ${JSON.stringify(data.reviewPipeline)}`);
    }

    // Verify Security Privacy Leakage (Test 17)
    console.log('\n--- Verifying Data Privacy (No Personal Info Exposed) ---');
    const jsonString = JSON.stringify(data);
    if (
      !jsonString.includes('passwordHash') &&
      !jsonString.includes('Secret Applicant') &&
      !jsonString.includes('applicant@testanalytics.com') &&
      !jsonString.includes('documents')
    ) {
      console.log('PASS: Test 17 (Analytics response exposes NO applicant personal information)');
    } else {
      throw new Error('Test 17 failed: personal info or sensitive details leaked in response');
    }

    // Verify Existing Admin Review Endpoint Regression (Test 19)
    console.log('\n--- Verifying Existing Admin Review Endpoint Still Works ---');
    const adminAppsRes = await fetch(`${baseUrl}/api/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminAppsData = await adminAppsRes.json();
    console.log('Admin List Status:', adminAppsRes.status);
    if (adminAppsRes.status === 200 && Array.isArray(adminAppsData.applications)) {
      console.log('PASS: Test 19 (Existing Admin Review list endpoint works cleanly)');
    } else {
      throw new Error(`Test 19 failed: expected 200 and array, got ${adminAppsRes.status}`);
    }

    console.log('\n=================================================');
    console.log('ALL BACKEND ANALYTICS TEST CASES PASSED SUCCESSFULLY!');
    console.log('=================================================\n');

  } catch (err) {
    console.error('TEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runTests();
