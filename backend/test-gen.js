const axios = require('axios');
const path = require('path');
require('dotenv').config();

async function testGeneration() {
  console.log('--- Testing Timetable Generation ---');

  try {
    // 1. Login
    console.log('Logging in as admin...');
    const loginResp = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@school.com',
      password: 'admin123'
    });
    const token = loginResp.data.token;
    console.log('✅ Logged in');

    // 2. Trigger Generation
    console.log('Triggering generation...');
    const genResp = await axios.post('http://localhost:4000/api/v1/timetables/generate', {
      name: 'Diagnostic Test Timetable',
      academic_year: '2024-25',
      semester: 'Semester 1'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const ttId = genResp.data.timetableId;
    console.log('✅ Generation started. Timetable ID:', ttId);

    // 3. Poll for status
    console.log('Polling for status (waiting 15s)...');
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(r => setTimeout(r, 3000));
      const statusResp = await axios.get(`http://localhost:4000/api/v1/timetables/${ttId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const status = statusResp.data.status;
      console.log(`   Attempt ${attempts+1}: Status = ${status}`);
      
      if (status === 'feasible' || status === 'optimal') {
        console.log('🎉 SUCCESS: Timetable generated successfully!');
        break;
      }
      if (status === 'infeasible') {
        console.log('⚠️ INFEASIBLE: Conflicts detected (as expected if constraints are tight)');
        break;
      }
      attempts++;
    }

  } catch (err) {
    console.error('❌ Test Failed:', err.response?.data || err.message);
  }

  process.exit(0);
}

testGeneration();
