const axios = require('axios');
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

async function runDiagnostics() {
  console.log('--- PS4 Timetable System Diagnostics ---');

  // 1. Check Database
  console.log('\n[1/4] Checking Database...');
  const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Database Connected');
  } catch (err) {
    console.error('❌ Database Connection Failed:', err.message);
  }

  // 2. Check Solver
  console.log('\n[2/4] Checking Python Solver...');
  try {
    const solverUrl = process.env.SOLVER_URL || 'http://localhost:5001';
    const resp = await axios.get(`${solverUrl}/health`, { timeout: 3000 });
    console.log('✅ Solver is Alive:', resp.data);
  } catch (err) {
    console.error('❌ Solver Unreachable:', err.message);
    console.log('   (Did you run "python app.py" in the solver directory?)');
  }

  // 3. Check AI Configuration
  console.log('\n[3/4] Checking AI Config...');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.includes('your-key-here')) {
    console.log('⚠️ AI Key is placeholder/missing');
  } else {
    console.log('✅ AI Key is set (Length:', key.length, ')');
    console.log('   Base URL:', process.env.ANTHROPIC_BASE_URL || 'Default (Anthropic)');
  }

  // 4. Check Frontend
  console.log('\n[4/4] Checking Frontend...');
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resp = await axios.get(frontendUrl, { timeout: 3000 });
    console.log('✅ Frontend is Up');
  } catch (err) {
    console.log('⚠️ Frontend might be down or not responding to GET /');
  }

  console.log('\n--- Diagnostics Complete ---');
  process.exit(0);
}

runDiagnostics();
