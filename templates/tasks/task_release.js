var path = require('path'),
    del = require('del'),
    fs = require("fileutil"),
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
    sftp = require("gulp-sftp"),
    svn  = require("svn-interface"),
    rename = require('gulp-rename'),
    yargs = require("yargs");


module.exports = function (gulp, config) {
    var baseUrl = path.join(process.cwd(), config.releaseDest);
    var args = yargs.argv,
        cssName = args.n;
    var processor = [
        autoprefix({browsers: ['last 2 Chrome versions', '> 5%'], add: false})
    ];
    var modifiedFiles = {
            css:[],
            slice: [],
            img: []
        };

    var pathConfig = {
        slice: "./slice/",
        img: "./img/",
        css: "./css/",
        html: "./html/",
        cpImg: "img/**",
        cpSlice: "slice/**",
        cpCss: "./css/*.css",
        sprite: "./sprite/"
    };

    /**
     *  判断是否传入样式文件名字，有则直接取对应的资源，没有读取svn处理
     * @param cb
     */
    function getFiles(cb) {
        if (cssName) {
            modifiedFiles.css.push("./css/" + cssName + ".scss");
            modifiedFiles.slice.push("./slice/" + cssName + "/**");
            modifiedFiles.img.push("./img/" + cssName + "/**");
            return cb();
        } else {
            readSvn(cb);
        }
    }

    /**
     * 从SVN读取变化的文件
     * @param cb
     */
    function readSvn(cb) {
        svn.status([pathConfig.img, pathConfig.slice, pathConfig.css], function (err, data) {
            if(!err) {
                var targets = data.status.target;
                // 循环获取每个目录下的文件列表
                targets.forEach(function (target) {
                    // 有entry说明文件有更新或没有加入版本控制
                    var entry = target.entry;
                    if(entry) {
                        //console.log(Array.isArray(entry));
                        //target.entry只有一个文件有改动或未提交时为对象，多个对象时为对象数组
                        if (Array.isArray(entry)) {
                            entry.forEach(function (ent) {
                                addChangeFile({path: ent._attribute.path});
                            });
                        } else {
                            addChangeFile({path: entry._attribute.path});
                        }
                    }
                });
                modifiedFiles.css = modifiedFiles.css.unique();
                modifiedFiles.img = modifiedFiles.img.unique();
                modifiedFiles.slice = modifiedFiles.slice.unique();
                //console.log(modifiedFiles);
                return cb();
            }
        });
        function addChangeFile(obj) {
            var file = obj.path;
            console.log("file--->" + file);
            var dirArr = file.split(path.sep);
            var dirName = dirArr[0];
            switch (dirName) {
                case "css":
                    // 是scss文件更改了，重新编译该文件以及涉及到的全部图片
                    modifiedFiles.css.push("./" + file);
                    modifiedFiles.slice.push("./slice/" + path.basename(file, '.scss') + "/**");
                    modifiedFiles.img.push("./img/" + path.basename(file, '.scss') + "/**");
                    break;
                case "img":
                    modifiedFiles.img.push(file);
                    break;
                case "slice":
                    modifiedFiles.css.push("./css/" + dirArr[1] +".scss");
                    modifiedFiles.slice.push("./slice/" + dirArr[1]  + "/**");
                    break;
            }
        };
    }

    /**
     * 编译sass文件
     * @returns {*}
     */
    function compileSass(cb) {
        if(!modifiedFiles.css.length) {
            util.log(util.colors.red('no scss file modified, returning'));
            return cb();
        }
        util.log(util.colors.blue('compiling scss file to css'+ modifiedFiles.css));
        var dest = path.join(baseUrl, pathConfig.css);
        console.log(modifiedFiles.css);
        return gulp.src(modifiedFiles.css)
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
    function copyImg(cb) {
        if(modifiedFiles.img.length > 0) {
            util.log(util.colors.blue('coping image file to release directory'));
            return gulp.src(modifiedFiles.img)
                .pipe(copy(baseUrl));
        } else {
            util.log(util.colors.red('no img file modified'));
            return cb();
        }
    }

    /**
     * 拷贝图片到release目录下
     * @returns {*}
     */
    function copySlice(cb) {
        if(modifiedFiles.slice.length > 0) {
            util.log(util.colors.blue('coping slice file to release directory'));
            return gulp.src(modifiedFiles.slice)
                .pipe(copy(baseUrl));
        } else {
            util.log(util.colors.red('no slice file modified'));
            return cb();
        }
    }

    /**
     * 生成雪碧图
     */
    function generateSprite(cb) {
        if(!modifiedFiles.css.length) {
            util.log(util.colors.red('no css file generated.'));
            return cb();
        }
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
        if(!modifiedFiles.css.length) {
            util.log(util.colors.red('no css file need to be compress.'));
            return cb();
        }
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

    function svnSubmitDev(cb) {
        util.log(util.colors.green("submit dev files"));
        //提交SVN
        return svn.add([pathConfig.slice, pathConfig.css, pathConfig.img, pathConfig.html], {force: true}, function(err, data) {
            if(!err) {
                svn.commit([pathConfig.slice, pathConfig.css, pathConfig.img, pathConfig.html], {
                    "m": config.svn.comment || 'commit new content'
                }, function(err) {
                    if(!err) {
                        util.log(util.colors.green("提交构建稿svn成功"));
                    } else {
                        util.log(util.colors.red("提交构建稿文件失败，请手动提交"));
                    }
                    svn.cleanup("./",{}, cb);
                })
            } else {
                util.log(util.colors.red("添加构建稿文件失败，请手动提交"));
            }
        });
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
                        svn.cleanup(config.svn.copyPath,{}, cb);
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

    Array.prototype.unique = function() {
        if(!this.length) {
            return [];
        }
        this.sort();
        var re=[this[0]];
        for(var i = 1; i < this.length; i++) {
            if( this[i] !== re[re.length-1]) {
                re.push(this[i]);
            }
        }
        return re;
    }

    gulp.task('release', gulp.series(
        getFiles,
        delRelease,
        compileSass,
        copyImg,
        copySlice,
        generateSprite,
        cssMin,
        delSlice,
        imgMin,
        copyToPublish,
        gulp.parallel(
            svnSubmitDev,
            svbSubmit,
            ftpUpload
        )
    ));
}
