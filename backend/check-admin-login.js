require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./src/models');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!email || !password) {
      throw new Error('ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');
    }

    const user = await User.findOne({ email }).select('+password role active');

    console.log({
      accountFound: !!user,
      isAdmin: user?.role === 'admin',
      isActive: user?.active === true,
      passwordMatches: user
        ? await bcrypt.compare(password, user.password)
        : false
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
