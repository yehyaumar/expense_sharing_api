const express =  require('express');
const dotenev = require('dotenv');
const userRouter = require('./routes/user.routes.js');
const expenseController = require('./routes/expense.routes');
const db = require('./models/db.config');
const { initPassportJwt } = require('./config/passport_auth')

dotenev.config();

const app = express();

db.sequelize.sync()
  .then(()=> {
    console.log('Synced')
  })
  .catch(err => {
    console.log('Sync Failed', err)
  })
db.sequelize.authenticate()
  .then(() => {
    console.log('Connection established with db')
  })
  .catch(err => {
    console.log('Unable to connect to db', err)
  })

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(initPassportJwt());

app.use('/users', userRouter);
app.use('/expenses', expenseController);

app.listen(process.env.PORT || 3000, () => {
  console.log("Starting out the application at port " + (process.env.PORT || 4000));
})