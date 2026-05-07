const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaveRequest = sequelize.define('LeaveRequest', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  teacher_id:  { type: DataTypes.UUID, allowNull: false },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  from_date:   { type: DataTypes.DATEONLY, allowNull: false },
  to_date:     { type: DataTypes.DATEONLY, allowNull: false },
  reason:      { type: DataTypes.TEXT, allowNull: false },
  leave_type:  { type: DataTypes.ENUM('casual', 'medical', 'personal', 'other'), defaultValue: 'casual' },
  status:      { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  admin_note:  { type: DataTypes.TEXT, allowNull: true },
  reviewed_by: { type: DataTypes.UUID, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'leave_requests', timestamps: true });

module.exports = LeaveRequest;
