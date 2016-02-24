/**
 * 执行gulp compileHtml 命令，编译html文件，存放至distHtml目录
 * 主要作用是编译html文件内的base64标记，以及替换js，css ，图片路径
 * @type {*|exports|module.exports}
 */
var del = require('del');
var cache = require("gulp-cache");
var through = require('through2');
var path = require('path');
var replace = require('gulp-replace');
var cheerio = require("cheerio");
var base64Img = require('base64-img');

module.exports = function (gulp, config) {

    var cdnPath = config.htmlReplacePath;

    function imgToBase64() {
        return gulp.src("html/**/*.html")
            .pipe(image2Base64())
            .pipe(gulp.dest("./dest"));
    }

    function image2Base64(opt) {
        var stream = through.obj(function(file, enc, cb) {
            if (file.isStream()) {
                this.emit('error', new PluginError(PLUGIN_NAME, 'Streams not supported!'));
                return cb();
            }
            if (file.isBuffer()) {
                file.contents = analyseInlineImage(file.contents, opt);
                this.push(file);
                return cb();
            }
            return cb(null, file);
        });

        return stream;
    }

    function replaceHTML() {
        return gulp.src(["html/**/*.html"])
            .pipe(image2Base64())
            .pipe(replace(/\.\.\/\.\.\/_dev\//gim, cdnPath))
            .pipe(replace(/\.\.\/\.\.\//gim, cdnPath))
            .pipe(replace(/\s*<\s*script.*autoPageSize.*><\/script>/, ""))
            .pipe(gulp.dest('distHtml/'));
    }

    /**
     * 分析页面内的image内容
     * @param content
     * @param option
     */
    function analyseInlineImage(content, option) {
        var html = content.toString();
        //decodeEntities 是否编码(默认为true)
        var $ = cheerio.load(html, {decodeEntities: false});
        $("img").each(function(index, item) {
            var ele = $(item);
            var srcValue = ele.attr("src");
            if (srcValue.indexOf("?base64") !== -1) {
                var pngPath = path.resolve("./", srcValue.replace(/(\s*[..\/]*)(.*)(\?base64.*)/, "$2"));
                var base64Result = base64Img.base64Sync(pngPath);
                ele.attr("src", base64Result);
            }
        });
        return new Buffer($.html());
    }

    gulp.task('compileHtml', gulp.series(
        replaceHTML
    ));
}