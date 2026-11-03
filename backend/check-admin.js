require('dotenv').config();

const mongoose = require('mongoose');
const { User } = require('./src/models');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

    if (!email) {
      throw new Error('ADMIN_EMAIL missing from .env');
    }

    const user = await User.findOne({ email }).select('role active');

    if (user) {
      console.log({
        found: true,
        role: user.role,
        active: user.active
      });
    } else {
      console.log({ found: false });
    }
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
