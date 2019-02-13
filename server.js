if (!process.env.PORT) {
  require('dotenv').config()
  process.env.NODE_ENV = "dev"
}

const express = require('express');
// New Middleware: "Path"
// - Formatting Tool For URL Pathways
const path = require('path');
// New Middleware: "Serve-Favicon"
// - Favicon = shortcut icon.
// - Module: Helps Servce Favicon
const favicon = require('serve-favicon');
// New Middleware: "Morgan"
// - Morgan: Logger Middleware For Node
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const methodOverride = require('method-override')
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport')

const app = express();

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI ||'mongodb://localhost/petes-pets',  { useCreateIndex: true, useNewUrlParser: true });

// const auth = {
//   auth: {
//     api_key: process.env.MAILGUN_API_KEY,
//     domain: process.env.EMAIL_DOMAIN
//   }
// }
//
// const nodemailerMailgun = nodemailer.createTransport(mg(auth));

// // Send Email
// const user = {
//   email: "ali.shalabi@students.makeschool.com",
//   name: 'Ali',
//   age: '27'
// }

// nodemailerMailgun.sendMail({
//   from: 'no-reply@example.com',
//   to: user.email, // An array if you have multiple recipients.
//   subject: 'Hey you, awesome!',
//   template: {
//     name: 'email.handlebars',
//     engine: 'handlebars',
//     context: user
//   }
// }).then(info => {
//   console.log('Response: ' + info);
// }).catch(err => {
//   console.log('Error: ' + err);
// });


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// override with POST having ?_method=DELETE or ?_method=PUT
app.use(methodOverride('_method'))

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.locals.PUBLIC_STRIPE_API_KEY = process.env.PUBLIC_STRIPE_API_KEY;

require('./routes/index.js')(app);
require('./routes/pets.js')(app);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
