const { body, param, validationResult } = require('express-validator');
const { User, Expense, ExpenseSheet, sequelize } = require('../models/db.config');

async function userSummaryInternal(id) {
  try {
    const user = await User.findOne({ where: { id } });

    if (!user) {
      return null;
    }

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
    return {
      usersWhoOweMe, usersIOwe
    }

  } catch (err) {
    throw Error(err)
  }
}
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
  async getAllExpenses(req, res) {
    try {
      const expenses = await Expense.findAll({
        attributes: ['id', 'title', 'desc', 'amount', 'createdAt', 'updatedAt'],
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

      res.status(200).json({ message: "All Expenses Fetched", data: expenses })
      return;

    } catch (err) {
      console.log(err)
      res.status(500).json({ message: "Internal Server error" })
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
      res.status(200).json({ message: "Expense Fetched", data: expense })
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

      res.json({ message: "Total money to receive and total money to be paid", data: { totalMoneyToReceive, totalMoneyToPay } });
    } catch (err) {
      console.log("[GetTotalBalance]", err)
      res.status(500).json({ message: "Internal server error" })
    }
  },

  async userSummary(req, res) {
    try {
      const result = await userSummaryInternal(req.user.id)
      console.log(result)

      res.status(200).json({
        message: "Users summary of money he owes and is owed from his friends",
        data: result
      });

    } catch (err) {
      console.log("[UsersSummary]", err)
      res.status(500).json({ message: "Internal server error" })
    }
  },

  async payAgainstExpense(req, res) {
    await param('expenseId', "ExpenseId must be passed as a valid UUID param").notEmpty().isUUID().run(req);
    await body('amount', "amount must be passed as a valid decimal").notEmpty().isDecimal().run(req);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json(errors.array()[0])
      return;
    }
    const expenseId = req.params.expenseId;
    console.log(expenseId);
    const amount = Number(req.body.amount);

    if (amount <= 0) {
      res.status(400).json({ message: "amount must be greater than zero" });
    }

    try {
      const expense = await Expense.findOne({
        where: {
          id: expenseId
        },
        include: [
          {
            model: ExpenseSheet
          }
        ]
      });

      if (!expense) {
        res.status(404).json({ message: "Expense with this id not found" })
        return;
      }
      for (let expenseSheet of expense.ExpenseSheets) {
        if (expenseSheet.UserId === req.user.id) {
          if (expenseSheet.debt > 0 && amount <= expenseSheet.debt) {
            expenseSheet.debt -= amount;
            expenseSheet.credit += amount;
            await expenseSheet.save();
            res.status(200).json({ message: `Debt of ${amount} paid. Remaining debt ${expenseSheet.debt}` })
          } else {
            res.status(400).json({ message: "[Error paying debt] Double check your debt against this expense" })
            return;
          }
        }
      }
    } catch (err) {
      console.log("[PayAgainstExpense]", err)
      res.status(500).json({ message: "Internal ServerError" })
    }
  },

  async payAgainstUser(req, res) {
    await param('userId', "ExpenseId must be passed as a valid UUID param").notEmpty().isUUID().run(req);
    await body('amount', "amount must be passed as a valid decimal").notEmpty().isDecimal().run(req);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json(errors.array()[0])
      return;
    }
    const userId = req.params.userId;
    let amount = Number(req.body.amount);
    const amountPaid = amount;

    if (amount <= 0) {
      res.status(400).json({ message: "amount must be greater than zero" });
    }

    try {

      const userToPay = await User.findOne({
        where: {
          id: userId
        }
      });

      if (!userToPay) {
        res.status(404).json({ message: "User with this id not found" });
        return;
      }

      const { usersWhoOweMe, usersIOwe } = await userSummaryInternal(req.user.id);
      console.log(usersIOwe[userId])
      if (Object.keys(usersIOwe).includes(userId) && usersIOwe[userId] > 0 && amount <= usersIOwe[userId]) {
        const expenses = await userToPay.getExpenses()
        for (let expense of expenses) {
          const expenseSheets =  await expense.getExpenseSheets();
          for (let expenseSheet of expenseSheets) {

            if (expenseSheet.UserId === req.user.id && expenseSheet.debt > 0) {
              if (amount > expenseSheet.debt) {
                amount -= expenseSheet.debt;
                expenseSheet.credit += expenseSheet.debt;
                expenseSheet.debt = 0;
              }else{
                expenseSheet.debt -= amount;
                expenseSheet.credit += amount;
                amount = 0;
              }
              await expenseSheet.save();
              if(amount === 0 ){
                res.status(200).json({ message: `Debt of ${amountPaid} paid to ${userToPay.email}.` })
                return;
              }
            }
          }
        }

      } else {
        res.status(400).json({ message: "[Error paying debt] Double check your debt against this user" })
        return;
      }

    } catch (err) {
      console.log("[PayAgainstUser]", err);
      res.status(500).json({ message: "Internal server error" })
    }



  }
}