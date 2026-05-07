const axios = require('axios');
require('dotenv').config();

const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:5001';

/**
 * Send config to Python CP-SAT solver and get result
 */
async function runSolver(config) {
  try {
    const response = await axios.post(`${SOLVER_URL}/solve`, config, {
      timeout: 90000, // 90 seconds
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Python solver is not running. Please start: cd solver && python app.py');
    }
    if (err.response) {
      throw new Error(`Solver error: ${err.response.data.error || err.response.statusText}`);
    }
    throw err;
  }
}

/**
 * Check solver health
 */
async function checkSolverHealth() {
  try {
    const response = await axios.get(`${SOLVER_URL}/health`, { timeout: 5000 });
    return response.data;
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

module.exports = { runSolver, checkSolverHealth };
