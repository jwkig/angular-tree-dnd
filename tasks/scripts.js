'use strict';

module.exports = function (gulp, $, pkg, through) {

    var fnUglify, fnReplace;
    fnUglify = function () {
        return gulp.src('dist/ng-tree-dnd.js')
            .pipe($.sourcemaps.init())
            .pipe(
            $.uglify(
                {
                    preserveComments: 'some'
                }
            )
        ).pipe($.replace(/\s*\*\s*@preserve/gi, ''))
            .pipe($.rename('ng-tree-dnd.min.js'))
            .pipe($.sourcemaps.write("/"))
            .pipe(gulp.dest('dist'));
    };
    fnReplace = function (stream, streamSrc, pattern, before, after) {
        return stream.pipe(
            through.obj(
                function (fileInput, enc, cb) {
                    if (fileInput.isStream()) {
                        return cb();
                    }

                    if (fileInput.isBuffer()) {
                        var replace = "";
                        if (before) {
                            replace += before + fileInput.contents;
                        } else {
                            replace += fileInput.contents;
                        }

                        if (after) {
                            replace += after;
                        }

                        streamSrc.pipe(
                            $.replace(
                                pattern, function (match) {
                                    return replace;
                                }
                            )
                        )
                            .pipe(
                            through.obj(
                                function (f, e, c) {

                                    if (f.isStream()) {
                                        return c();
                                    }

                                    if (f.isBuffer()) {
                                        fileInput.contents = f.contents;
                                        cb(null, fileInput);
                                    }
                                }
                            )
                        ).on('end', cb);
                    }
                }
            )
        );
    };

    gulp.task(
        'jshint', function () {
            return gulp.src(
                [
                    'src/**/*.js'
                ]
            )
                .pipe($.jshint())
                .pipe($.jshint.reporter('jshint-stylish'))
                .pipe($.jshint.reporter('fail'));
        }
    );

    gulp.task(
        'jshint-dist', function () {
            return gulp.src(
                [
                    'dist/**/*.js',
                    '!dist/**/*.min.js'
                ]
            )
                .pipe($.jshint())
                .pipe($.jshint.reporter('jshint-stylish'))
                .pipe($.jshint.reporter('fail'));
        }
    );

    gulp.task(
        'release', function () {
            return gulp.src(
                [
                    'dist/**/*'
                ]
            )
                .pipe(gulp.dest(pkg.version));
        }
    );

    gulp.task(
        'concat', function () {
            // init files includ
            var streamInject = gulp.src(
                [
                    'src/**/*.js',
                    '!src/**/*.spec.js',
                    '!src/**/*.append.js',
                    '!src/main.js'
                ]
            )
                .pipe($.replace(/^\s*angular\.module\('ntt\.TreeDnD'\)\s*((.|\s)+\))[\s;]*/gm, '$1'))
                .pipe($.concat('ng-tree-dnd.js', {newLine: ''}));

            // replace `version` by `version` of package.json in file `main.js`
            var streamMain = gulp.src(['src/main.js'])
                .pipe($.replace(/\/\/<!--Version-->/gi, pkg.version));

            // join all file `*.append.js` to  file `ng-tree-dnd.js`
            var streamAppend = gulp.src(['src/**/*.append.js'])
                .pipe($.concat('ng-tree-dnd.js'))

            // replace
            streamMain = fnReplace(
                streamAppend, // stream insert
                streamMain, // insert into stream
                /;?\s*\/\/<!--Replace_Concat-->/gi, // parent to insert stream
                ';\/\/<!--Replace_Concat-->;\n\n' // insert after place
            );
            var cloneSink = $.clone.sink();
            // return stream final concated
            return fnReplace(
                streamInject,
                streamMain,
                /;?\s*\/\/<!--Replace_Concat-->/gi
            )
                .pipe(concat("ng-tree-dnd.debug.js")) //<- rename file
                .pipe($.removeCode({debug: true})) // keep debug
                .pipe(cloneSink) //<- clone objects streaming through this point

                .pipe(concat("ng-tree-dnd.js")) //<- restore file name
                .pipe($.removeCode({debug: false})) // clear all debug in file main.

                .pipe(cloneSink.tap()) //<- output cloned objects + ng-tree-dnd.debug.js
                .pipe(gulp.dest('dist')) // move to dist
        }
    );

    gulp.task(
        'uglify', ['concat'], fnUglify
    );

    gulp.task(
        'uglify-noconcat', fnUglify
    );

    gulp.task(
        'test', function (cb) {
            return $.karma.server.start(
                {
                    configFile: __dirname + '/../karma.conf.js',
                    singleRun:  true,
                    autoWatch:  true,
                }, function (exitCode) {
                    $.util.log('Karma has exited with ' + exitCode);
                    cb();
                }
            );
        }
    );
}
;
