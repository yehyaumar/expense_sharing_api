const passport = require('passport');
const { Strategy, ExtractJwt} = require('passport-jwt');
const { User } = require('../models/db.config');

module.exports.initPassportJwt = () => {
  passport.use(new Strategy({
    secretOrKey: process.env.JWT_SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
  }, async (payload, done) => {
    try {
      const user = await User.findOne({
        where: { 
          email: payload.email 
        }
      });
      if(!user){
        return done(null, false, { message: "Invalid token"});
      }

      return done(null, user);
    }catch(err){
      return done(null, false, { message: "Invalid token"});
    }
  }));

  return passport.initialize();
}