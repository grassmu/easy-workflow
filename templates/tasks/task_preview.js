/**
 * 执行gulp preview 命令，生成预览文件
 * @type {*|exports|module.exports}
 */

var fs = require("fileutil");
var nfs = require("fs");
var path = require("path");
var util = require("gulp-util");
var sftp = require("gulp-sftp");
var openurl = require("openurl");

module.exports = function (gulp, config) {
    var html = ['<!DOCTYPE html>',
        '        <html lang="en">',
        '        <head>',
        '        <meta charset="UTF-8">',
        '        <title>构建稿预览页面列表</title>',
        '        <meta name="viewport" content="width=device-width,initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />',
        '        <link rel="stylesheet" charset="utf-8" type="text/css" href="http://172.16.1.8/static/style/rule/publish/css/preview.css" />',
        '        </head>',
        '        <body>',
        '        <div class="mod-preview-wrap">',
        '        <div class="title">文件列表</div>',
        '        <div class="content-wrap">'].join("");
    var dirTree = {};

    function generateIndex(cb) {
        util.log(util.colors.green("reading html files in html directory"));
        fs.walk('./html/', function (files, dirs) {
            files.forEach(function (file) {
                var dirName = path.dirname(file);
                if(!dirTree[dirName]) {
                    dirTree[dirName] = [];
                }
                dirTree[dirName].push(file);
            });
            for(var dir in dirTree) {
                html += '<div class="line dir"><div class="dir-name" onclick="toggleFileList(this)">【目录】：'+dir+'<i class="arrow-down"></i></div>';
                html += '<div class="file-list">';
                var fileList = dirTree[dir];
                fileList.forEach(function(file) {
                    html += '<div class="file"><a href="/'+config.projectName +"/"+ file.replace(/\\/g, "/")+'">- '+ file.replace(/\\/g, "/") +'</a><div class="qr-icon"></div></div>';
                });
                html += '</div></div>';
            }
            html += '</div></div><div id="qrCode"></div>'+
                '<script type=\'text/javascript\' src=\'http://cdn.staticfile.org/jquery/2.1.1/jquery.min.js\'></script>'+
                '<script type="text/javascript" src="http://cdn.staticfile.org/jquery.qrcode/1.0/jquery.qrcode.min.js"></script>'+
                '<script type="text/javascript">'+
                '    function utf16to8(str) {'+
                '        var out, i, len, c;'+
                '        out = "";'+
                '        len = str.length;'+
                '        for(i = 0; i < len; i++) {'+
                '            c = str.charCodeAt(i);'+
                '            if ((c >= 0x0001) && (c <= 0x007F)) {'+
                '                out += str.charAt(i);'+
                '            } else if (c > 0x07FF) {'+
                '                out += String.fromCharCode(0xE0 | ((c >> 12) & 0x0F));'+
                '                out += String.fromCharCode(0x80 | ((c >>  6) & 0x3F));'+
                '                out += String.fromCharCode(0x80 | ((c >>  0) & 0x3F));'+
                '            } else {'+
                '                out += String.fromCharCode(0xC0 | ((c >>  6) & 0x1F));'+
                '                out += String.fromCharCode(0x80 | ((c >>  0) & 0x3F));'+
                '            }'+
                '        }'+
                '        return out;'+
                '    }'+
                '    $(".qr-icon").on("mouseover", function () {'+
                '        var link = utf16to8("http://" + location.host + $(this).prev().attr("href"));'+
                '        $("#qrCode").show().empty();'+
                '        $(\'#qrCode\').qrcode({width:200,height:200,correctLevel:0,text: link});'+
                '    });'+
                '    $(document).on("click", function () {'+
                '        $("#qrCode").hide();'+
                '    });'+
                '    function toggleFileList(node) {'+
                '        var targetNode = node.parentNode.querySelector(".file-list");'+
                '        if(!node.getAttribute("close")) {'+
                '            var height = targetNode.scrollHeight;'+
                '            targetNode.style.height = height + "px";'+
                '            node.setAttribute("close", 1);'+
                '        } else {'+
                '            targetNode.style.height = 0;'+
                '            node.removeAttribute(\'close\');'+
                '        }'+
                '    }'+
                '</script>'+
                '</body>'+
                '</html>';

            util.log(util.colors.green("generating preview html file"));
            var out = nfs.createWriteStream('./previewIndex.html', {encoding: "utf8"});
            out.write(html, function (err) {
                if (err) console.log(err);
            });
            out.end();

            util.log(util.colors.green("uploading files to preview server"));
            // ftp到preview路径下
            gulp.src(['./previewIndex.html'])
                .pipe(sftp({
                    host: config.preview.host,
                    user: config.preview.username,
                    pass: config.preview.password,
                    remotePath: config.preview.remotePath + "/"+ config.projectName,
                    remotePlatform: 'linux'
                }));
            gulp.src(['./html/**'])
                .pipe(sftp({
                    host: config.preview.host,
                    user: config.preview.username,
                    pass: config.preview.password,
                    remotePath: config.preview.remotePath + "/"+ config.projectName+"/html",
                    remotePlatform: 'linux'
                }));
            gulp.src(['./js/**'])
                .pipe(sftp({
                    host: config.preview.host,
                    user: config.preview.username,
                    pass: config.preview.password,
                    remotePath: config.preview.remotePath + "/"+ config.projectName+"/js",
                    remotePlatform: 'linux'
                }));
            if(nfs.existsSync("./_dev")) {
                gulp.src(['./_dev/**'])
                    .pipe(sftp({
                        host: config.preview.host,
                        user: config.preview.username,
                        pass: config.preview.password,
                        remotePath: config.preview.remotePath + "/"+ config.projectName+"/_dev",
                        remotePlatform: 'linux',
                        callback: function () {
                            util.log(util.colors.green("upload files completed"));
                            fs.del('./previewIndex.html', function () {
                                util.log(util.colors.green("delete preview html file successful"));
                            });
                            openurl.open("http://preview.jtjr.com/"+config.projectName+"/previewIndex.html");
                            cb();
                        }
                    }));
            } else {
                setTimeout(function () {
                    util.log(util.colors.green("upload files completed"));
                    fs.del('./previewIndex.html', function () {
                        util.log(util.colors.green("delete preview html file successful"));
                    });
                    openurl.open("http://preview.jtjr.com/"+config.projectName+"/previewIndex.html");
                }, 1000);
                cb();
            }
        });
    }

    gulp.task('preview', gulp.series(
        generateIndex
    ));
}