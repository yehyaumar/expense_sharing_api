const { Router } = require('express');
const passport = require('passport');
const { addExpense, getExpense, getTotalBalance, userSummary, getAllExpenses, payAgainstExpense } = require('../controllers/expense.controller')
const expenseRouter = Router();

expenseRouter.route('/add')
  .post(passport.authenticate('jwt', { session: false, failWithError: true }), addExpense);

expenseRouter.route('/total-balance')
  .get(passport.authenticate('jwt', { session: false, failWithError: true }), getTotalBalance);

expenseRouter.route('/summary')
  .get(passport.authenticate('jwt', { session: false, failWithError: true }), userSummary);

expenseRouter.route('/:expenseId/pay')
  .post(passport.authenticate('jwt', { session: false, failWithError: true }), payAgainstExpense);

expenseRouter.route('/:expenseId')
  .get(passport.authenticate('jwt', { session: false, failWithError: true }), getExpense);

expenseRouter.route('/')
  .get(passport.authenticate('jwt', { session: false, failWithError: true }), getAllExpenses);

module.exports = expenseRouter;