var path = require('path'),
    del = require('del'),
    fs = require("fileutil"),
    nfs = require("fs"),
    md5 = require("md5"),
    util = require("gulp-util"),
    gif = require("gulp-if"),
    base64 = require("gulp-base64"),
    sass = require('gulp-sass'),						//编译less
    copy = require('gulp-copy'),						//拷贝文件
    clean = require('gulp-clean'),						//清除文件
    notify = require('gulp-notify'),					//阻止任务发生错误的时候终止任务，并输出错误日志
    liveReload = require('gulp-livereload'),			//chrome中自动刷新网页,依赖liveReload插件
    cp = require("child_process"),
    connect = require("gulp-connect");


var paths = {
        src: {
            html: "./html/**/*.html",
            img: './img/**/*.{JPG,jpg,png,gif}',
            slice: './slice/**/*.png',
            sass: './css/*.scss',
            commonPath: './../common-module-rem-sass/*.scss'
        }
    },
    mapConfig;

module.exports = function (gulp, config) {

    var ptr;
    //
    //function readConfig() {
    //    fs.readFile(path.join(process.cwd(), './fileMap.json'), 'utf8', function (err, data) {
    //        if (err) {
    //            util.log("读取配置文件失败");
    //        } else {
    //            mapConfig = JSON.parse(data);
    //        }
    //    })
    //}
    //
    //function saveConfig() {
    //    nfs.writeFile('./fileMap.json', JSON.stringify(mapConfig, null, 4), 'utf8');
    //}

    /**
     * 编译sass文件
     * @param file
     * @returns {*}
     */
    function compileSass(file) {
        function handleErrors() {
            var args = Array.prototype.slice.call(arguments);
            notify.onError({
                title: 'compile error',
                message: '<%=error.message %>'
            }).apply(this, args);           //替换为当前对象
        }

        if (typeof file == 'string') {
            util.log("compiling file" + file);
        }
        return gulp.src(typeof file == 'string' ? [file] : [paths.src.sass])
            .pipe(sass({outputStyle: 'expanded'}))
            .on('error', handleErrors)
            .pipe(base64({
                extensions: [/\.*\.png\?base64/],
                maxImageSize: 20 * 1024,              // bytes
                debug: false
            }))
            .pipe(gulp.dest(config.devDest + "\\css\\"));
    }

    /**
     * 拷贝图片
     */
    function copyImage(file) {
        return gulp.src(typeof file == 'string' ? [file] : ['img/**', 'slice/**'])
            .pipe(copy(config.devDest));
    }

    /**
     * 启动本地服务器
     */
    function server(cb) {
        connect.server({
            root: "./",
            livereload: true
        });
        cb();
    }

    /**
     * 监听文件变化
     * @param callback
     */
    function watch(callback) {
        liveReload.listen();
        var watcher = gulp.watch([
                paths.src.sass,
                paths.src.commonPath,
                paths.src.slice,
                paths.src.img,
                paths.src.html
            ],
            {ignored: /[\/\\]\./}
        );
        watcher.on('change', function (file) {
            util.log(file + ' has been changed');
            watchHandler('changed', file);
        }).on('add', function (file) {
            util.log(file + ' has been added');
            watchHandler('add', file);
        }).on('unlink', function (file) {
            util.log(file + ' is deleted');
            watchHandler('removed', file);
        });
        callback();
    }

    function watchHandler(type, file) {
        clearTimeout(ptr);
        var dir = file.match(/(.*?)\\/)[1],
            fileName = path.basename(file),
            dirName = path.basename(path.dirname(file));
        // 标记该文件做了更新
        //if(!mapConfig[file]) {
        //    mapConfig[file] = {};
        //}
        //mapConfig[file].modify = true;
        // 更新文件对应的map
        switch (dir) {
            case "css":
                if (type === 'removed') {
                    // 删除dev目录下的文件
                    del(config.devDest + "\\" + file.replace('.scss', '.css'));
                } else {
                    // 编译sass文件
                    compileSass(file);
                }
                break;
            case "slice":
            case "img":
                if (type === 'removed') {
                    util.log("deleting " + config.devDest + "\\" + file);
                    // 删除dev目录下的文件
                    del(config.devDest + "\\" + file);
                } else {
                    // 拷贝更新过后的文件
                    copyImage(file);
                }
                break;
        }
        ptr = setTimeout(function () {
            liveReload.changed(file);
        }, 5000);
        //saveConfig();
    }

    /**
     * 启动前先删除开发目录
     * @returns {*}
     */
    function delDev() {
        return del(config.devDest);
    }

    /**
     * 判断是否存在fileMap.json文件
     */
    function runCmd(cb) {
        var exists = nfs.existsSync("./fileMap.json");
        if(!exists) {
            util.log(util.colors.blue("fileMap.json not exists, call 'gulp mapIndex' cmd now...."));
            // 不存在该文件，则调用命令创建该文件
            cp.exec('gulp mapIndex', function(err, stdout, stdin) {
                if(err) {
                    util.log(util.colors.red("build index error"));
                } else {
                    util.log(util.colors.green(stdout));
                    util.log(util.colors.blue("fileMap.json created"));
                    readConfig();
                    return cb();
                }
            });
        } else {
            readConfig();
            return cb();
        }
    }

    gulp.task('develop', gulp.series(
        delDev,
        copyImage,
        compileSass,
        watch,
        server
        //runCmd
    ));
};