const { DataTypes } = require('sequelize');
const uuid = require('uuid')

module.exports = (sequelize) => {
  const Expense = sequelize.define('Expense', {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: () => uuid.v4()
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    desc: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
  }, {
    timestamp: true
  });

  return Expense;
}