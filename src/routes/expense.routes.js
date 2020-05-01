const { Router } = require('express');
const passport =  require('passport');
const { addExpense, getExpense } = require('../controllers/expense.controller')
const expenseRouter = Router();

expenseRouter.route('/add')
  .post(passport.authenticate('jwt', { session: false, failWithError: true}), addExpense);

expenseRouter.route('/:expenseId')
  .get(passport.authenticate('jwt', { session: false, failWithError: true}), getExpense);

module.exports = expenseRouter;