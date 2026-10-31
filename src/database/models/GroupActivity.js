const { DataTypes } = require('sequelize')

module.exports = (sequelize) => sequelize.define('GroupActivity', {
  groupJid: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  participantJid: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  activityDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    primaryKey: true,
  },
  messageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
})
