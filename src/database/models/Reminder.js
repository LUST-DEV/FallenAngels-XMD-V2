const { DataTypes } = require('sequelize')

module.exports = (sequelize) => sequelize.define('Reminder', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  numero: { type: DataTypes.STRING, allowNull: false },
  jid: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.STRING(500), allowNull: false },
  dueAt: { type: DataTypes.DATE, allowNull: false },
  sentAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
})
