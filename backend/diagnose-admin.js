require('dotenv').config();

const mongoose = require('mongoose');
const { User } = require('./src/models');

function maskEmail(email) {
  if (!email || !email.includes('@')) return 'not configured';
  const [name, domain] = email.split('@');
  return name.slice(0, 2) + '***@' + domain;
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

    const matchedUser = email
      ? await User.findOne({ email }).select('role active')
      : null;

    const admins = await User.find({ role: 'admin' })
      .select('email role active')
      .limit(20)
      .lean();

    console.log({
      database: mongoose.connection.name,
      configuredEmail: maskEmail(email),
      configuredAccountFound: !!matchedUser,
      adminAccounts: admins.map(user => ({
        email: maskEmail(user.email),
        active: user.active
      }))
    });
  } catch (error) {
    console.error(error.message);
  } finally {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }
  }
}

main();
