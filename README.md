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
    assets_folder : assets, //本地资源目录
    base_url : base_url //线上资源路径 {base_url}/1/2/{name},
    limit : number //生成增量包的版本范围,默认对所有版本生成增量包,
    bsdiff : true //是否使用bsdiff, 默认false
});

gulp.task('publish', ['assets-incremental-update'] , function(){});
```