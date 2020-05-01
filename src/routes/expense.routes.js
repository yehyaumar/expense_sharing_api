const { Router } = require('express');
const passport = require('passport');
const { addExpense, getExpense, getTotalBalance } = require('../controllers/expense.controller')
const expenseRouter = Router();

expenseRouter.route('/add')
  .post(passport.authenticate('jwt', { session: false, failWithError: true }), addExpense);

expenseRouter.route('/total-balance')
  .get(passport.authenticate('jwt', { session: false, failWithError: true }), getTotalBalance);

expenseRouter.route('/:expenseId')
  .get(passport.authenticate('jwt', { session: false, failWithError: true }), getExpense);

module.exports = expenseRouter;