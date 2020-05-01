const { DataTypes } = require('sequelize');
const uuid = require('uuid')

module.exports = (sequelize) => {
  const ExpenseSheet = sequelize.define('ExpenseSheet', {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: () => uuid.v4()
    },
    splitRatio: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    debit: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    credit: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
  }, {
    timestamp: true
  });

  return ExpenseSheet;
}