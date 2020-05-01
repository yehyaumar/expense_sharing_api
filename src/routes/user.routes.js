const { Router } = require('express');
const passport =  require('passport');
const { register, login, profile } = require('../controllers/user.controller')

const userRouter = Router();

userRouter.route('/register')
  .post(register);

userRouter.route('/login')
  .post(login);

userRouter.route('/me')
  .get(passport.authenticate('jwt', { session: false, failWithError:true }), profile);

module.exports = userRouter;