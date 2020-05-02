const { body, param, validationResult } = require('express-validator');
const { User, Expense, ExpenseSheet } = require('../models/db.config');

module.exports = {
  async register(req, res) {
    await body("email", "Email is not valid").isEmail().run(req);
    await body("password", "Password must be at least 8-256 characters long").isLength({ min: 8, max: 256 }).run(req);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json(errors.array()[0])
      return;
    }

    try {
      const existingUser = await User.findOne({ where: { email: req.body.email } })
      if (existingUser) {
        res.status(400).json({ message: "User with this email already exists" });
        return;
      }

      const user = await User.create({
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName
      })

      res.status(200).json({ message: "User created", user: user.cleanedUser() });
      return;

    } catch (err) {
      console.log('[UserController]', err)
    }
  },

  async login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Invalid email or password" });
      return;
    }


    try {
      const user = await User.findOne({ where: { email } });
      if (user && await user.isValidPassword(password)) {
        const token = user.generateJWT();
        res.status(200).json({ message: "Logged in successfully", user: user.userWithToken(token) });
        return;
      } else {
        res.status(400).json({ message: "Invalid email or password" })
        return;
      }
    } catch (err) {
      console.log("LoginController", err);
      res.status(500).json({ message: "Internal server error" })
      return;
    }
  },

  async profile(req, res) {
    const user = await User.findOne({
      where: {
        email: req.user.email
      }
    })
    res.json(user.cleanedUser())
  },

  async getUserById(req, res) {
    await param('userId', "UserId must be passed as valid UUID param").notEmpty().isUUID().run(req);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json(errors.array()[0])
      return;
    }
    const userId = req.params.userId;
    console.log(userId)

    try {
      const user = await User.findOne({ 
        where: { id: userId },
        attributes: ['id', 'email', 'firstName', 'lastName'],
        include: [
          {
            model: Expense,
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
          }
        ] 
      });
      if (!user) {
        res.status(404).json({ message: "User with this id doesn't exist" })
      }
      res.status(200).json({ message: "User by id fetched", user: user })
      return;
    } catch (err) {
      console.log("[GetUserById]", err);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  },

  async getAllUsers(req, res) {
    try {
      const users = await User.findAll();
      const cleanedUsers = [];

      for (user of users) {
        cleanedUsers.push(user.cleanedUser());
      }
      res.status(200).json({ message: "All registered users", data: cleanedUsers })
      return;

    } catch (err) {
      console.log("[GetAllUsers]", err);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
}