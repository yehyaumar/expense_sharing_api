const express = require('express');
const dotenev = require('dotenv');

dotenev.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(process.env.PORT || 4000, () => {
  console.log("Starting out the application at port " + (process.env.PORT || 4000));
})