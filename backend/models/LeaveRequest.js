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
  request_type: { type: DataTypes.ENUM('full_day', 'partial_day', 'multi_day'), defaultValue: 'full_day' },
  slots:       { type: DataTypes.JSON, allowNull: true }, // [0, 1, 2] for partial day
  status:      { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  admin_note:  { type: DataTypes.TEXT, allowNull: true },
  reviewed_by: { type: DataTypes.UUID, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'leave_requests', timestamps: true });

module.exports = LeaveRequest;
