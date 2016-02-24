/**
 * 执行gulp clean 命令，清理开发，发布，debug等目录，并清理gulp-cache留下的缓存文件
 * @type {*|exports|module.exports}
 */
var del = require('del');
var cache = require("gulp-cache");

module.exports = function (gulp, config) {

    function delDir() {
        return del([config.devDest, config.releaseDest, config.debugDest, config.imageMinDest]);
    }

    function clearCache(cb) {
        cache.clearAll();
        cb();
    }

    gulp.task('clean', gulp.series(
        clearCache,
        delDir
    ));
}