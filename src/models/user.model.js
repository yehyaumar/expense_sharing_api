const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const uuid = require('uuid')
const jwt = require('jsonwebtoken')

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: () => uuid.v4()
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailVerfied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true
  });

  User.addHook('beforeCreate', async (user, options) => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);
    user.password = hash;
  })

  User.prototype.cleanedUser = function(){
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName || undefined,
      lastName: this.lastName || undefined
    }
  }

  User.prototype.userWithToken = function(token){
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      token
    }
  }

  User.prototype.isValidPassword = function(candidatePassword){
    return new Promise((resolve, reject) => {
      bcrypt.compare(candidatePassword, this.password)
        .then(result => resolve(result))
        .catch(err => reject(err));
    })
  }

  User.prototype.generateJWT = function(){
    let today = new Date();
    let expiry = new Date(today);

    expiry.setDate(today.getDate() + 1);

    return jwt.sign({
      id: this.id,
      email: this.email,
      exp: Math.round(expiry.getTime() / 1000)
    }, process.env.JWT_SECRET)
  }

  return User;
}