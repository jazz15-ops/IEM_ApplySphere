require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iem_applysphere';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for Seeding');

    const adminName = process.env.ADMIN_NAME || 'System Admin';
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@iem.edu').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass@123';
    const adminPhone = process.env.ADMIN_PHONE || '9876543210';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`User with email "${adminEmail}" already exists. Role: ${existingAdmin.role}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const adminUser = new User({
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      passwordHash,
      role: 'admin'
    });

    await adminUser.save();
    console.log(`Admin account (${adminEmail}) seeded successfully with role "admin".`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin account:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

seedAdmin();
