##目录说明
- tasks目录是用于注册任务的目录，插件也在此目录下
- tasks和node_modules目录作为公共目录，以后需要建工程直接新建目录即可
- 构建目录规范
    |- css
       |- xxxx.scss
    |- img
       |- xxxx目录
    |- slice
       |- xxxx目录
    |- js
    |- .jybworkflowrc
    |- gulpfile.js
- css img slice三个目录下，所开发的业务需要使用相同的名字，如abc.scss，那么在img和slice目录下均需要新建abc目录存放图片，方便按名字查找，按需编译
- common-scss-module目录用于存放该工作空间内的构建样式所需要的公共scss文件，在业务scss文件中使用如@import "../../common-module-rem-scss/import-lib-mixins-rem"的方式使用
- 建议公共模块下所引用的图片均添加?base64，用以转换为base64方式，这样不占用雪碧图空间