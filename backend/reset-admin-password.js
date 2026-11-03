require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./src/models');

async function main() {
  try {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!email || !password) {
      throw new Error('ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');
    }

    if (password.length < 12) {
      throw new Error('ADMIN_PASSWORD must be at least 12 characters');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email }).select('_id role active');

    if (!user) {
      throw new Error('Admin account not found');
    }

    if (user.role !== 'admin' || !user.active) {
      throw new Error('Account is not an active admin. Password not changed.');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    console.log('Admin password reset successfully.');

    const updatedUser = await User.findById(user._id).select('+password');

    console.log({
      isAdmin: updatedUser.role === 'admin',
      isActive: updatedUser.active === true,
      passwordMatches: await bcrypt.compare(password, updatedUser.password)
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }
  }
}

main();
