var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var db = require('./config/connection')
var hbs = require('express-handlebars');
var session = require('express-session')
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var Handlebars = require('handlebars')
var multer  = require('multer')
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine('hbs', hbs.engine({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layout/', partialsDir: __dirname + '/views/partials/', runtimeOptions: { allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true, }, }));
var handlebars = hbs.create({});
handlebars.handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

handlebars.handlebars.registerHelper('times', function(n, block) {
  var accum = '';
  for(var i = 1; i < n; ++i)
      accum += block.fn(i);
  return accum;
});


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// app.use(fileUpload())



app.use(session({
  secret: "thisismysecrctekey",
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 },
  resave: false
}));

app.use((req, res, next) => {
  res.set("cache-control", "private,no-cache,no-store,must revalidate");
  next();
});

db.connect((err) => {
  if (err)
    console.log("connection error" + err);
  else
    console.log("Database conncted");
})


app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
