const { DataTypes } = require('sequelize')

module.exports = (sequelize) => sequelize.define('UserTodo', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  numero: { type: DataTypes.STRING, allowNull: false },
  text: { type: DataTypes.STRING(300), allowNull: false },
  completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
})
