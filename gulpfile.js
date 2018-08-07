const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const eslint = require('gulp-eslint');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');
const responsive = require('gulp-responsive');
const source = require("vinyl-source-stream");
// const browserify = require("browserify");


gulp.task('default', ['copy-html', 'copy-images', 'copy-manifest', 'styles', 'scripts', 'service-worker'], function() {
	gulp.watch('sass/**/*.scss', ['styles', browserSync.reload]);
	gulp.watch('js/**/*.js', ['scripts', browserSync.reload]);
	gulp.watch('manifest.json', ['copy-maifest']);
	gulp.watch('serviceWorker.js', ['service-worker']);
	// gulp.watch('js/**/*.js', ['lint']);
	gulp.watch('*.html', ['copy-html']);
	gulp.watch('./dist/*.html').on('change', browserSync.reload);

	browserSync.init({
		server: {
			baseDir: './dist'
		}
	});
});


gulp.task('scripts', function() {
	gulp.src('js/**/*.js')
		.pipe(gulp.dest('dist/js'));
	
});

gulp.task('service-worker', () => {
	// const browserifyObject = browserify({
	// 	debug: true
	//   });
	
	// return browserifyObject
	// 	.require('serviceWorker.js', {entry: true})
	// 	.bundle()
	// 	.pipe(source('serviceWorker.js'))
	// 	.pipe(gulp.dest('dist/'));
	gulp.src('serviceWorker.js')
		.pipe(gulp.dest('dist/'));
});

gulp.task('scripts-dist', function() {
	gulp.src('js/**/*.js')
		.pipe(sourcemaps.init())
		.pipe(concat('all.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'));
});

gulp.task('copy-html', function() {
	gulp.src('./*.html')
		.pipe(gulp.dest('dist/'));
});

gulp.task('copy-manifest', function() {
	gulp.src('manifest.json')
		.pipe(gulp.dest('dist/'));
});

gulp.task('copy-images', function() {
	gulp.src('img/*')
		.pipe(gulp.dest('dist/img'));
});

gulp.task('styles', function() {
	gulp.src('sass/**/*.scss')
		.pipe(sass({
			outputStyle: 'compressed'
		}).on('error', sass.logError))
		.pipe(autoprefixer({
			browsers: ['last 2 versions']
		}))
		.pipe(gulp.dest('dist/css'));
});

gulp.task('lint', function () {
	return gulp.src(['js/**/*.js'])
		// eslint() attaches the lint output to the eslint property
		// of the file object so it can be used by other modules.
		.pipe(eslint())
		// eslint.format() outputs the lint results to the console.
		// Alternatively use eslint.formatEach() (see Docs).
		.pipe(eslint.format())
		// To have the process exit with an error code (1) on
		// lint error, return the stream and pipe to failOnError last.
		.pipe(eslint.failOnError());
});

gulp.task('crunch-images', function() {
    return gulp.src('img/*')
        .pipe(imagemin([
			imagemin.gifsicle({interlaced: true}),
			imagemin.jpegtran({progressive: true}),
			imagemin.optipng({optimizationLevel: 5})
		]))
        .pipe(gulp.dest('dist/img'));
});

gulp.task('images', () => {
	return gulp.src('img/*.{jpg,png}') 
		.pipe(imagemin([
			imagemin.gifsicle({interlaced: true}),
			imagemin.jpegtran({progressive: true}),
			imagemin.optipng({optimizationLevel: 5})
		]))
	  	.pipe(responsive({
		// Convert all images to JPEG format
		'*': [{
		  width: 400,
		  rename: {
			suffix: '_small_1x',
			extname: '.jpg',
		  },
		}, {
		  width: 800,
		  rename: {
			suffix: '_medium_1x',
			extname: '.jpg',
		  },
		}
	],
	  }))
	  .pipe(gulp.dest('dist/img'));
  });