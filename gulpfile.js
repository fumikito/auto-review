var gulp        = require('gulp'),
    fs          = require('fs'),
    $           = require('gulp-load-plugins')(),
    pngquant    = require('imagemin-pngquant'),
    eventStream = require('event-stream');


// Sass task
gulp.task('sass', function () {
  return gulp.src(['./src/scss/**/*.scss'])
    .pipe($.plumber({
      errorHandler: $.notify.onError('<%= error.message %>')
    }))
    .pipe($.sourcemaps.init({loadMaps: true}))
    .pipe($.sassBulkImport())
    .pipe($.sass({
      errLogToConsole: true,
      outputStyle    : 'compressed',
      includePaths   : [
        './src/scss',
        './node_modules/materialize-css/sass'
      ]
    }))
    .pipe($.autoprefixer({browsers: ['last 2 version', '> 5%']}))
    .pipe($.sourcemaps.write('./map'))
    .pipe(gulp.dest('./public/assets/css'));
});


// Minify All
gulp.task('js', function () {
  return gulp.src(['./src/js/**/*.js'])
    .pipe($.sourcemaps.init({
      loadMaps: true
    }))
    .pipe($.uglify())
    .on('error', $.util.log)
    .pipe($.sourcemaps.write('./map'))
    .pipe(gulp.dest('./public/assets/js/'));
});


// JS Hint
gulp.task('jshint', function () {
  return gulp.src(['./src/js/**/*.js'])
    .pipe($.jshint('./src/.jshintrc'))
    .pipe($.jshint.reporter('jshint-stylish'));
});

// Copy libraries
gulp.task('copylib', function () {
  return eventStream.merge(
    gulp.src([
      './node_modules/materialize-css/dist/js/materialize.min.js',
      './node_modules/jquery/dist/jquery.min.js',
      './node_modules/jquery/dist/jquery.min.map'
    ])
      .pipe(gulp.dest('./public/assets/js')),
    gulp.src([
      './node_modules/materialize-css/dist/fonts/**/*'
    ]).
    pipe(gulp.dest('./public/assets/fonts'))
  );
});

// Image min
gulp.task('imagemin', function () {
  return gulp.src('./src/img/**/*')
    .pipe($.imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use        : [pngquant()]
    }))
    .pipe(gulp.dest('./public/assets/img'));
});


// watch
gulp.task('watch', function () {
  // Make SASS
  gulp.watch('./src/scss/**/*.scss', ['sass']);
  // JS
  gulp.watch(['./src/js/**/*.js'], ['js', 'jshint']);
  // Minify Image
  gulp.watch('./src/img/**/*', ['imagemin']);
});


// Build
gulp.task('build', ['copylib', 'jshint', 'js', 'sass', 'imagemin']);

// Default Tasks
gulp.task('default', ['watch']);
