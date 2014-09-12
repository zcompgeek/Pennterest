
/**
 * app.js: This is the heart of the application, 
 * which loads all external dependencies and 
 * spins up the server.
 */

// Module dependencies
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var settings = require('./routes/settings');
var board = require('./routes/board');
var test = require('./routes/test');
var home = require('./routes/home');
var search = require('./routes/search');
var login = require('./routes/login');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: 'super-duper-secret-secret' }));
app.use(express.urlencoded());
app.use(express.methodOverride());

app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', home.home);
app.get('/test', test.index);
app.get('/user', user.user);
app.post('/addBoard', user.addNewBoard);
app.get('/home', home.home);
app.get('/search', search.search);
app.get('/login', login.login);
app.get('/board', board.getBoardContent);
app.get('/settings', settings.settings);
app.post('/changeSettings', settings.change);
app.post('/follow', user.follow);
app.post('/updateRating', home.update);
app.post('/pinExisting', home.pinExisting);
app.post('/pinNewContent', home.pinNewContent);
app.post('/login', login.postLogin);
app.post('/register', login.postRegister);
app.get('/logout', function(req, res) {req.session.user = null; res.redirect('/login?logout=1');});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

