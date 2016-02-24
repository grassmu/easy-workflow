
var util = require("gulp-util");

module.exports = function (gulp, config) {

    gulp.task('help', function (cb) {
        util.log(util.colors.green('gulp clean -------------------清理开发和发布目录以及图片缓存'));
        util.log(util.colors.green('gulp compileHtml -------------编译HTML文件，替换资源路径以及base64的图片'));
        util.log(util.colors.green('gulp release -----------------编译本次修改过的文件'));
        util.log(util.colors.green('gulp releaseAll --------------编译该目录下所有的文件'));
        util.log(util.colors.green('gulp develop -----------------开启开发模式，启动本地服务器和watch自动刷新服务'));
        util.log(util.colors.green('gulp imgMin ------------------压缩img目录下的文件，可以指定目录名字 -n xxxx'));
        util.log(util.colors.green('gulp preview -----------------生成预览文件，并上传预览文件到服务器'));
        cb();
    });
}