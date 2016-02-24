# easy-workflow 
### 功能简介
基于gulp4.0的前端构建工作流，主要提供以下几个功能：
- scss预编译，暂不支持less，未来可加入
- 自动拷贝和提交svn
- 上传ftp
- 自动生成预览文件
- 开发模式：启动内置server：http://localhost:3000，监控文件变化，只编译修改过的文件，livereload
- 编译html文件：替换静态资源路径，编译指定图片为base64方式引用
- 压缩图片：基于目录的压缩，指定图片目录，或者压缩整个目录
- 发布模式：自动合成雪碧图，压缩所有的css，压缩所有图片（可选择编译所有文件和只编译更改过的文件）
- 命令行es

-----------------------------------
### 依赖
nodejs，gulp4.0

----------------------------------- 
### 安装
```sh
如果本机有安装过gulp，先卸载它
$ npm uninstall gulp -g

然后安装gulp4.0
$ npm install "gulpjs/gulp#4.0" -g

然后
$ npm install easy-workflow -g
```

-----------------------------------
### 使用方式
<b>1、命令行下切换到用于开发的目录，这一步首先要初始化工作流的运行环境，在该目录下执行</b>
```sh
$ es workspace <dirName>
```
<b>2、等待命令执行结束后，请按照命令行内的提示执行npm install命令安装所需依赖</b>或者<a target="_blank" href="http://pan.baidu.com/s/1jGSZdxs">直接下载</a>我打包好的node_modules
```sh
$ cd <dirName>
$ npm install
```
<b>运行环境目录结构如下</b>
```sh
|- dirName    ---------------------你刚刚执行workspace命令后面指定的目录名字
  |- common-scss-module -----------存放scss基础库 mixin和reset等公共scss模块
  |- node_modules   ---------------模块依赖
  |- tasks          ---------------存放gulp运行的所有task
  |- package.json   ---------------gulp的所有依赖
  |- readme.md
```
<b>3、在运行环境安装完毕后，就可以初始化开发环境了</b>
```sh
$ es init <dirName>
```
在这一步会生成若干文件，今后所有的构建文件的开发都会在这个目录下进行，这么设计的目的就是为了省事儿，譬如我有很多个开发目录，我就不需要<br/>
在每一个开发目录下都生成一份node_modules，所有的依赖都在父目录的tasks和node_modules里了。<br/>eg：easy init demo，那么：
<b>开发目录结构如下</b>
```sh
|- dirName
  |- common-scss-module -----------存放scss基础库 mixin和reset等公共scss模块
  |- demo               -----------刚刚生成的开发环境目录
    |- css            -------------存放scss文件
    |- img            -------------存放所有图片
    |- js             -------------脚本
    |- slice          -------------存放所有icon，用于合成雪碧图
    |- .easy-workflowrc -----------配置文件
    |- gulpfile.js    -------------gulp执行发起文件
|- node_modules   -----------------模块依赖
|- tasks          -----------------存放gulp运行的所有task
|- package.json   -----------------gulp的所有依赖
|- readme.md
 ```
 在开发的时候，只需要在demo目录内执行gulp相关的几个命令即可完成开发
 
 ---------------------------------
 ### 开发指南
- 1、推荐使用webstorm这个IDE，内置了grunt和gulp，可以比较方便的执行命令，<a href="http://pan.baidu.com/s/1i4x3jjZ" target="_blank">这里下载webstorm</a>
- 2、开发阶段，在开发目录下，执行gulp develop命令，开启开发模式
```sh
$ gulp develop
```
- 3、在html目录下新建xxx目录，再在该目录下新建xxxx.html文件，引用css，引用图片......
- 4、推荐使用按目录区分业务的方式，即不同的业务划分不同文件夹，清晰，详情见目录下的readme.md
- 5、打开浏览器，输入http:localhost:3000/html/xxx/xxxxx.html即可开始开发，在文件修改后浏览器会自动更新内容
- 6、css目录下的scss文件名字也是按照业务命令xxxx.scss
- 7、img，slice目录下的图片，按照scss文件的名字划分目录，这样便于浏览以及工作流程序查找文件，参考如下结构：
```sh
|- css
  |- accident.scss
|- img
  |- accident
    |- img1.png
    |- img2.png
    .....
|-slice
  |- accident
    |- arrow.png
    |- arrow@2x.png
    |- arrow@3x.png
    .....
```

-------------------------------------
### 配置文件说明
```json
{
    "devDest": "./_dev",                      // 开发模式下，存放编译后的开发文件的目录，html文件中的静态资源应当指向该目录
    "releaseDest": "./_release",              // 最终编译文件存放目录
    "debugDest": "./_dev",                    // debug模式下存放文件的目录 TODO
    "imageMinDest": "./_imageCompress/",      // 压缩图片命令存放压缩后图片路径
    "autoPreview": false,                     // 是否自动生成预览文件，在编译后，即执行release命令
    "compileHtml": true,                      // 是否自动编译HTML文件，TODO
    "htmlReplacePath": "/static/style/app/publish/",      // 编译html文件时，自动替换资源路径
    "svn": {
        "copyPath": "relative/path/xxxx",      // 在执行release后，将编译后的文件copy至该目录并提交
        "autoSubmit": true,
        "comment": "commit css&image"         // 静态资源提交日志
    },
    "ftp": {
        "host": "xxx.xxx.xxx.xxx",            // ftp的IP
        "port": "xxx",
        "remotePath": "/data/www/xxxx/xxxx/style/xxxxx",    // FTP路径
        "username": "xxxx",
        "password": "xxxxx",
        "autoUpload": true
    },
    "preview": {
        "host": "xxxx.xxxx.xxxx.xxxx",
        "port": "xxx",
        "username":"xxxx",
        "password":"xxxx",
        "remotePath":"/data/www/xxxxx"
    },
    "cdn": {

    }
}
```

### TODO
- 配置完善
- 生成操作日志，并有页面可以访问查询
- css模块管理
- 加入js编译以及js模块管理
- 自动发布至指定路径

