require('dotenv').config();
const mongoose = require('mongoose'), bcrypt = require('bcryptjs');
const { User } = require('../src/models');
(async () => {
    try {
        if (!process.env.MONGODB_URI) throw Error('MONGODB_URI missing');
        for (const k of ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_NAME']) if (!process.env[k]) throw Error(`${k} missing`);
        if (process.env.ADMIN_PASSWORD.length < 12) throw Error('ADMIN_PASSWORD must be at least 12 characters');
        await mongoose.connect(process.env.MONGODB_URI);
        const email = process.env.ADMIN_EMAIL.toLowerCase();
        const existing = await User.findOne({ email });
        if (existing) { console.log('Account already exists; no role escalation performed.'); }
        else { await User.create({ name: process.env.ADMIN_NAME, email, password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), role: 'admin' }); console.log('Admin account created.'); }
    } catch (e) { console.error(e.message); process.exitCode = 1; } finally { await mongoose.disconnect(); }
})();
