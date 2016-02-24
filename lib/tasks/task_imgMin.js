/**
 * 执行gulp imgMin 命令，压缩img目录下的文件，可以指定压缩目录名字
 * gulp imgMin -n accident
 * @type {*|exports|module.exports}
 */
var imagemin = require('gulp-imagemin'),				//压缩图片
    imageminPngquant = require('imagemin-pngquant'),	//压缩图片
    cache = require("gulp-cache"),
    util = require("gulp-util"),
    yargs = require("yargs");

module.exports = function (gulp, config) {

    var args = yargs.argv,
        dirName = args.n;

    function imageMin() {
        util.log(util.colors.red('compress images'));
        var dir = dirName ? './img/'+dirName+'/*.{png,jpg,gif,ico}' : './img/**/*.{png,jpg,gif,ico}';
        return gulp.src([dir])
            .pipe(imagemin({
                use: [imageminPngquant({
                    quality: '65-80',
                    speed: 4
                })]
            }))
            .pipe(gulp.dest(config.imageMinDest + (dirName ? dirName : '')));
    }

    gulp.task('imgMin', gulp.series(
        imageMin
    ));
}