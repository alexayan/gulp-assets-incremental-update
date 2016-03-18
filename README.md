# gulp-assets-incremental-update

A gulp plugin for assets incremental update

## Install 

```shell
npm install gulp-assets-incremental-update --save-dev
```

## Usage

```javascript
require('gulp-assets-incremental-update')(gulp, {
    publish_folder : publish_folder,//资源发布目录
    name : 'article_detail.zip',//zip包名
    assets_folder : assets //本地资源目录
});

gulp.task('publish', ['assets-incremental-update'] , function(){});
```