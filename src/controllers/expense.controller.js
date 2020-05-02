const { body, param, validationResult } = require('express-validator');
const { User, Expense, ExpenseSheet, sequelize } = require('../models/db.config');

module.exports = {
  async addExpense(req, res) {
    await body('title', 'Title must not be empty (Must be 1-256 characters long)').isLength({ min: 1, max: 256 }).run(req);
    await body('amount', 'Amount must not be empty').isDecimal().run(req);
    await body('sharedBetween', 'shared between must not be empty').notEmpty().run(req);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json(errors.array()[0])
      return;
    }

    const { title, desc, amount, sharedBetween } = req.body;
    try {
      let paidByUser = await User.findOne({ where: { id: req.user.id } });

      let totalRatio = 0;

      for (let splitRatio of Object.values(sharedBetween)) {
        totalRatio += splitRatio;
      }
      if (totalRatio !== 100) {
        throw new Error('Split ratio of all users must sum up to total 100')
      }

      if (!Object.keys(sharedBetween).includes(paidByUser.id)) {
        throw new Error('Share ratio of the user who paid must be included');
      }

      let expense;
      await sequelize.transaction(async (t) => {
        expense = await Expense.create({
          title, desc, amount,
        }, { transaction: t });
        expense.setPaidBy(paidByUser, { transaction: t });

        for (let [userId, splitRatio] of Object.entries(sharedBetween)) {
          let credit = 0, debt = 0;
          const toPay = amount * splitRatio / 100;
          const user = await User.findOne({
            where: {
              id: userId
            }
          });
          if (!user) {
            throw new Error("One or more users doesn't exists");
          }

          if (userId === paidByUser.id) {
            credit = amount;
          } else {
            debt = toPay;
          }

          const expenseSheet = await ExpenseSheet.create({
            splitRatio,
            toPay,
            credit,
            debt
          }, { transaction: t })
          expenseSheet.setUser(user);
          expense.addExpenseSheet(expenseSheet);
        }
      });

      res.status(200).json({ message: "Expense added successfully", data: expense });
    } catch (err) {
      res.status(400).json({ message: err.message })
    }
  },

  async getExpense(req, res) {
    await param('expenseId', "ExpenseId must be passed as UUID").notEmpty().isUUID().run(req);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json(errors.array()[0])
      return;
    }
    const expenseId = req.params.expenseId;
    console.log(expenseId)

    try {
      const expense = await Expense.findOne({
        attributes: ['id', 'title', 'desc', 'amount', 'createdAt', 'updatedAt'],
        where: { id: expenseId },
        include: [
          {
            model: User,
            as: 'paidBy',
            attributes: ['id', 'email', 'firstName', 'lastName']
          },
          {
            model: ExpenseSheet,
            attributes: ['id', 'splitRatio', 'toPay', 'credit', 'debt'],
            include: [
              {
                model: User,
                attributes: ['id', 'email', 'firstName', 'lastName']
              }
            ]
          }
        ]
      });
      if (!expense) {
        res.status(404).json({ message: "Expense with this id not found" })
        return;
      }
      res.status(200).json({ message: "Expense Fetched", expense })
      return;

    } catch (err) {
      console.log(err)
      res.status(500).json({ message: "Internal Server error" })
    }
  },

  async getTotalBalance(req, res) {
    let totalMoneyToReceive = 0;
    let totalMoneyToPay = 0;

    try {
      const myExpenses = await Expense.findAll({
        where: {
          paidById: req.user.id
        },
        include: [
          {
            model: ExpenseSheet
          }
        ]
      });

      for (let expense of myExpenses) {
        for (let expenseSheet of expense.ExpenseSheets) {
          totalMoneyToReceive += expenseSheet.debt;
        }
      }

      const myExpenseSheets = await ExpenseSheet.findAll({
        where: {
          UserId: req.user.id
        }
      })

      for (let expenseSheet of myExpenseSheets) {
        totalMoneyToPay += expenseSheet.debt
      }

      res.json({ totalMoneyToReceive, totalMoneyToPay });
    } catch (err) {
      console.log("ERRPRR", err)
      res.status(500).json(err)
    }
  },

  async userSummary(req, res) {
    try {
      const user = await User.findOne({ where: { id: req.user.id } });
      const myExpenses = await user.getExpenses({ include: [{ model: ExpenseSheet }] })

      let usersWhoOweMe = {};

      for (let expense of myExpenses) {
        for (let expenseSheet of expense.ExpenseSheets) {
          if (expenseSheet.UserId !== user.id) {
            usersWhoOweMe[expenseSheet.UserId] = isNaN(usersWhoOweMe[expenseSheet.UserId]) ? expenseSheet.debt :
              usersWhoOweMe[expenseSheet.UserId] + expenseSheet.debt;
          }
        }
      }

      let usersIOwe = {};
      const myExpenseSheets = await user.getExpenseSheets({ include: [{ model: Expense }] });

      for (let expenseSheet of myExpenseSheets) {
        if (expenseSheet.Expense.paidById !== user.id) {
          usersIOwe[expenseSheet.Expense.paidById] = isNaN(usersIOwe[expenseSheet.Expense.paidById]) ? expenseSheet.debt :
            usersIOwe[expenseSheet.Expense.paidById] + expenseSheet.debt;
        }
      }

      res.status(200).json({ message: "Users summary of money he owes and is owed from his friends",
        data: { usersWhoOweMe, usersIOwe } });

    } catch (err) {
      console.log("ERRPRR", err)
      res.status(500).json(err)
    }
  }
}