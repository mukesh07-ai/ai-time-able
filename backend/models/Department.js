const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Department = sequelize.define('Department', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  institution_id: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'departments', timestamps: true });

module.exports = Department;
