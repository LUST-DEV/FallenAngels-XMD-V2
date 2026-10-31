const { DataTypes } = require('sequelize')

module.exports = (sequelize) => sequelize.define('UserNote', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  numero: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING(80), allowNull: false },
  content: { type: DataTypes.STRING(1000), allowNull: false },
}, {
  indexes: [{ unique: true, fields: ['numero', 'title'] }],
})
