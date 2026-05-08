const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function fix() {
  try {
    await sequelize.authenticate();
    console.log('Connected');

    // Add columns to LeaveRequest if they don't exist
    const columns = await sequelize.query("SHOW COLUMNS FROM leave_requests", { type: QueryTypes.SELECT });
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('request_type')) {
      console.log('Adding request_type to leave_requests');
      await sequelize.query("ALTER TABLE leave_requests ADD COLUMN request_type ENUM('full_day', 'partial_day', 'multi_day') DEFAULT 'full_day'");
    }
    if (!columnNames.includes('slots')) {
      console.log('Adding slots to leave_requests');
      await sequelize.query("ALTER TABLE leave_requests ADD COLUMN slots JSON NULL");
    }

    // Create substitutions table if not exists (regular sync will do this but let's be safe)
    console.log('Syncing models...');
    await sequelize.sync(); 
    
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
