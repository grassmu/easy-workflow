var path = require('path'),
    del = require('del'),
    fs = require("fileutil"),
    md5 = require("md5"),
    util = require("gulp-util"),
    gif = require("gulp-if"),
    autoprefix = require("autoprefixer"),
    postCss = require("gulp-postcss"),
    base64 = require("gulp-base64"),
    sass = require('gulp-sass'),						//编译less
    copy = require('gulp-copy'),						//拷贝文件
    copy2 = require("gulp-copy2"),
    cssmin = require('gulp-minify-css'),				//压缩css文件
    imagemin = require('gulp-imagemin'),				//压缩图片
    imageminPngquant = require('imagemin-pngquant'),	//压缩图片
    cache = require('gulp-cache'),						//缓存文件提高执行效率(生成雪碧图时)
    cssSprite = require('gulp-css-spritesmith'),
    svn = require("svn-interface"),
    sftp = require("gulp-sftp"),
    rename = require('gulp-rename');


module.exports = function (gulp, config) {
    var baseUrl = path.join(process.cwd(), config.releaseDest);
    var processor = [
        autoprefix({browsers: ['last 2 Chrome versions', '> 5%'], add: false})
    ];
    var pathConfig = {
        slice: "./slice/",
        img: "./img/",
        css: "/css/",
        cpImg: "img/**",
        cpSlice: "slice/**",
        cpCss: "./css/*.css",
        sprite: "./sprite/"
    };

    /**
     * 编译sass文件
     * @returns {*}
     */
    function compileSass() {
        var dest = path.join(baseUrl, pathConfig.css);
        return gulp.src(['./css/*.scss'])
            .pipe(sass({outputStyle: 'expanded'}))
            .pipe(base64({
                extensions: [/\.*\.png\?base64/],
                maxImageSize: 20 * 1024, // bytes
                debug: false
            }))
            .pipe(postCss(processor))
            .pipe(gulp.dest(dest));
    }

    /**
     * 拷贝图片到release目录下
     * @returns {*}
     */
    function copyImage() {
        return gulp.src([pathConfig.cpImg, pathConfig.cpSlice])
            .pipe(copy(baseUrl));
    }

    /**
     * 生成雪碧图
     */
    function generateSprite(cb) {
        util.log(util.colors.red('generating sprite file'));
        return gulp.src(path.join(baseUrl, pathConfig.cpCss))
            .pipe(cssSprite({
                // sprite背景图源文件夹，只有匹配此路径才会处理，默认 images/slice/
                imagepath: path.join(baseUrl, '/slice/'),
                // 雪碧图输出目录，注意，会覆盖之前文件！默认 images/
                spritedest: path.join(baseUrl, '/sprite/'),
                // 替换后的背景路径，默认 ../images/
                spritepath: '../sprite/',
                // 各图片间间距，如果设置为奇数，会强制+1以保证生成的2x图片为偶数宽高，默认 0
                padding: 2,
                // 给雪碧图追加时间戳，默认不追加
                spritestamp: true,
                // 在CSS文件末尾追加时间戳，默认不追加
                cssstamp: true,
                // 生成雪碧图的算法
                algorithm: 'top-down',
                // 增加rem方式的fontSize配置
                fontSize: config.fontSize
            }))
            .pipe(rename({dirname: ''}))
            .pipe(gif('*.png',
                gulp.dest(path.join(baseUrl, pathConfig.sprite)),
                gulp.dest(path.join(baseUrl, pathConfig.css))));

    }

    /**
     * 压缩图片
     */
    function imgMin() {
        util.log(util.colors.red('compress images'));
        return gulp.src([path.join(baseUrl, '/**/*.{png,jpg,gif,ico}')])
            .pipe(cache(imagemin({
                use: [imageminPngquant({
                    quality: '65-80',
                    speed: 4
                })]
            })))
            .pipe(gulp.dest(config.releaseDest));
    }

    function cssMin(cb) {
        util.log(util.colors.red('compress css files'));
        return gulp.src([path.join(baseUrl, '/css/*.css')])
            .pipe(cssmin({
                //类型：Boolean 默认：true [是否开启高级优化（合并选择器等）]
                advanced: true,
                //类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
                comatibility: '',
                //类型：Boolean 默认：false [是否保留换行]
                keepBreaks: false
            }))
            .pipe(gulp.dest(path.join(baseUrl, '/css/')));
    }


    function delCmd(dir) {
        return del([dir]);
    }

    function delRelease() {
        return delCmd(baseUrl);
    }

    function delSlice() {
        return delCmd(path.join(baseUrl, pathConfig.slice));
    }

    function svbSubmit(cb) {
        if(config.svn.autoSubmit) {
            util.log(util.colors.green("submit files"));
            //提交SVN
            return svn.add(path.join(__dirname, config.svn.copyPath), {force: true}, function(err, data) {
                if(!err) {
                    svn.commit(path.join(__dirname, config.svn.copyPath), {
                        "m": config.svn.comment || 'commit new content'
                    }, function(err) {
                        if(!err) {
                            util.log(util.colors.green("提交svn成功"));
                        } else {
                            util.log(util.colors.red("提交文件失败，请手动提交"));
                        }
                    })
                } else {
                    util.log(util.colors.red("添加文件失败，请手动提交"));
                }
            });
        } else {
            cb();
        }
    }

    function copyToPublish(cb) {
        if(config.svn.autoSubmit) {
            util.log(util.colors.green("coping files to "+config.svn.copyPath));
            var paths = [
                {
                    src: path.join(baseUrl, "./**/*"),
                    dest: path.join(__dirname, config.svn.copyPath)
                }
            ]
            return copy2(paths);
        } else {
            cb();
        }
    }

    function ftpUpload(cb) {
        if(config.ftp.autoUpload) {
            util.log(util.colors.green("auto uploading generated files by sftp"));
            return gulp.src([path.join(baseUrl, "./**/*")])
                .pipe(sftp({
                    host: config.ftp.host,
                    user: config.ftp.username,
                    pass: config.ftp.password,
                    remotePath: config.ftp.remotePath,
                    remotePlatform: 'linux'
                }))
        } else {
            cb();
        }
    }


    gulp.task('releaseAll', gulp.series(
        delRelease,
        compileSass,
        copyImage,
        generateSprite,
        cssMin,
        delSlice,
        imgMin,
        copyToPublish,
        gulp.parallel(
            svbSubmit,
            ftpUpload
        )
    ));
}
