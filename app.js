var express       = require('express'),
    cookieParser  = require('cookie-parser'),
    path          = require('path'),
    Theme         = require('./models/themes'),
    logger        = require('morgan'),
    app           = express(),
    pub           = require('pug'),
    bodyParser    = require('body-parser'),
    configs       = require('config'),
    mongoose      = require('mongoose'),
    mkdirp        = require('mkdirp'),
    exec          = require('child_process').exec,
    https         = require('follow-redirects').https,
    fs            = require('fs');

// Set global
global.appRoot = require('app-root-path');

var command = configs.get('command');

// Set views
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

// Set static path
app.use(express.static(path.join(__dirname, 'public'), {
  lastModified: true
}));

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Cookie parser
app.use(cookieParser());

// Set DB
mongoose.connect('mongodb://localhost/auto-review');

// Error handling for mongoDB
mongoose.connection.on('error', console.error.bind(console, 'Connection error:'));
mongoose.connection.once('open', function() {
  console.log("Connected to 'MongoDB!");
});


// Top Page
app.get('/', function (req, res, next) {
  res.render('index', {
    title  : 'Title',
    message: ''
  });
});

app.post('/', function(req, res, next){
  var url = req.body.theme_name.split('?')[0];
  var error = null;
  // Check URL format
  if ( !/^https:\/\/wordpress\.org\/themes\/download\//.test(url) ) {
    error = new Error( 'Bad URL!' );
    error.status = 400;
    return next(error);
  }
  // Grab theme name and version
  var matched = url.match(/^https:\/\/wordpress\.org\/themes\/download\/([^.]*)\.(.*)\.zip/);
  if ( ! matched ) {
    error = new Error( 'Cannot get theme name and version. Your URL must be malformed.' );
    error.status = 400;
    return next(error);
  }
  var themeName = matched[1];
  var version    = matched[2];
  try {
    // Make directory
    var dir = appRoot + '/public/themes/' + themeName;
    if (!fs.existsSync(dir)) {
      if ( ! mkdirp.sync(dir) ){
        throw new Error('Failed to create directory');
      }
    }
    // Get data
    var endpoint = url + '?nostats=1';
    // Download data
    var file = fs.createWriteStream(dir + '/' + themeName + '.' + version + '.zip');
    console.log('Retrieve', endpoint);
    var request = https.get(endpoint, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        console.log('Finish!');
        file.close(function(){
          var theme = new Theme({
            name: themeName,
            version: version,
            success: false,
            url: url
          });
          theme.save(function (err) {
            if (err) {
              throw new Error(err);
            } else {
              // Data was successfully saved. Do shell command
              exec(command, function(err, stdout, stderr){
                if(err){
                  theme.message = stderr;
                }else{
                  theme.success = true;
                  theme.message = stdout;
                }
                theme.updated  = new Date();
                theme.finished = new Date();
                theme.save(function(err){
                  if (err) {
                    console.log(err);
                  }
                });
              });
              // Do transaction
              res.redirect('/theme/' + themeName);
            }
          });
        });
      });
    }).on('error', function(err){
      throw new Error(err);
    });
  } catch (err) {
    error = new Error(err);
    err.status = 500;
    return next(error);
  }
});

app.get('/reviews', function(req, res, next){
  var error = null;
  Theme.find( {}, function (err, doc) {
    if (err) {
      error = new Error(err);
      error.status = 404;
      return next(error);
    } else {
      var moment = require('moment');
      res.render('list', {
        title: 'Reviewed Themes',
        moment: moment,
        reviews: doc
      });
    }
  });
});

app.get('/theme/:theme_name', function(req, res, next){
  var error = null;
  Theme.find({
    name: req.params.theme_name
  }, function (err, doc) {
    if (err) {
      error = new Error(err);
      error.status = 404;
      return next(error);
    } else {
      var moment       = require('moment');
      res.render('list', {
        title: 'Current Reviews for ' + req.params.theme_name,
        reviews: doc,
        moment: moment
      });
    }
  });
});

app.get('/review/:id', function(req, res, next){
  var error = null;
  Theme.findOne({
    _id: req.params.id
  }, function (err, doc) {
    if (err) {
      error = new Error(err);
      error.status = 404;
      return next(error);
    } else {
      var moment       = require('moment');
      res.render('review', {
        title : 'Review Result of ' + doc.name,
        review: doc,
        moment: moment
      });
    }
  });
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      title  : 'Error ' + err.status + ' | ',
      message: err.message,
      error  : err
    });
  });
}

// production error handler
// no stack-traces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    title  : 'Error ' + (err.status || 500) + ' | ',
    message: err.message,
    error  : false
  });
});


module.exports = app;
