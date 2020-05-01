const { body, validationResult } = require('express-validator');
const { User } = require('../models/db.config');

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
        password: req.body.password
      })

      res.status(200).json({ message: "User created", user: user.cleanedUser() });
      return;

    } catch (err) {
      console.log('[UserController]', err)
    }
  },

  async login(req, res){
    const { email, password } = req.body;
    if(!email || !password){
      res.status(400).json({ message: "Invalid email or password"});
      return;
    }


    try{
      const user = await User.findOne({ where: { email } });
      if(user && await user.isValidPassword(password)) {
        const token = user.generateJWT();
        res.status(200).json({message: "Logged in successfully", user: user.userWithToken(token)});
        return;
      }else{
        res.status(400).json({message: "Invalid email or password"})
        return;
      }
    }catch(err){
      console.log("LoginController", err);
      res.status(500).json({message: "Internal server error"})
      return;
    }
  },

  async profile(req, res){
    const user = await User.findOne({ where: {
      email: req.user.email
    }})
    res.json(user.cleanedUser())
  }
}