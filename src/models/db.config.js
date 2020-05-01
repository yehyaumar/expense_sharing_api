const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize


const User = require("./user.model")(sequelize);
const Expense = require('./expense.model')(sequelize);
const ExpenseSheet = require('./expense_sheet.model')(sequelize);

User.hasMany(Expense);
Expense.belongsTo(User, {as: 'paidBy'});

Expense.hasMany(ExpenseSheet);
ExpenseSheet.belongsTo(Expense);

User.hasMany(ExpenseSheet);
ExpenseSheet.belongsTo(User);

db.User = User;
db.Expense = Expense;
db.ExpenseSheet = ExpenseSheet;

module.exports = db;