var through2 = require('through2');
var gutil = require('gulp-util');
var path = require('path');
var fs = require('fs');
var Q = require('q');
var diff = require('node-folder-diff');

function incremental_update(options){
	return through2.obj(function (file, enc, cb) {
		var msg,
			me = this;
		if(!options.publish_folder  || !options.name || !options.version){
			msg = 'config option miss.';
			gutil.log('gulp-assets-incremental-update: ' + msg);
      		this.emit('error', new gutil.PluginError('gulp-assets-incremental-update', msg));
      		this.push(file);
      		cb();
		}
		var version = options.version,
			tasks = genDiffTasks(options.publish_folder, version, options.name),
			q_tasks = [];
		try{
			for(var i=0, len=tasks.length; i<len; i++){
				q_tasks.push((function(i){
					return function(){
						return diff.diff(tasks[i][0], tasks[i][1]).then(function(archive){
	                        if(!fs.existsSync(path.dirname(tasks[i][2]))){
	                          fs.mkdirSync(path.dirname(tasks[i][2]));
	                        }
	                        var output = fs.createWriteStream(tasks[i][2]);
	                        archive.pipe(output);
	                        gutil.log('gulp-assets-incremental-update: ' + 'success build patch '+tasks[i][2]);
	                        if(i===len-1){
	                        	this.push(file);
								cb();
	                        }
	                    });
					}
				})(i));
			}
			q_tasks.reduce(function (soFar, f) {
			    return soFar.then(f);
			}, Q());
		}catch(e){
			gutil.log('gulp-assets-incremental-update: ' + e.message);
			this.emit('error', new gutil.PluginError('gulp-assets-incremental-update', e.message));
      		this.push(file);
      		cb();
		}
	});
}

function genDiffTasks(folder, version, basename){
    function genPath(folder, version, basename){
        return path.resolve(folder, './'+version + '/'+basename);
    }
    function genDestPath(folder, oldVersion, newVersion, basename){
        return path.resolve(folder, './'+oldVersion + '/'+ newVersion + '/'+basename);
    }
    var tasks = [];
    version = parseInt(version);
    for(var i=1; i<version; i++){
        tasks.push([genPath(folder, i, basename), genPath(folder, version, basename), genDestPath(folder, i, version, basename)]);
        tasks.push([genPath(folder, version, basename), genPath(folder, i, basename), genDestPath(folder, version, i, basename)]);
    }
    return tasks;
}

function genVersion(config_path, name){
	var config;
    if(fs.existsSync(config_path) ) {
        var content = fs.readFileSync(config_path, {
            encoding : 'utf8'
        });
        config = JSON.parse(content);
    }else{
    	config = {};
    }
    if(!config[name]){
    	config[name] = {
    		cur_version : 1,
    		Last_version : 0
    	};
    }
    config[name].Last_version++;
    fs.writeFileSync(config_path, JSON.stringify(config));
    return config[name].Last_version;
}

function assets_incremental_update(gulp, config){
	if(!config.config_path || !config.publish_folder || !config.name || !config.assets_folder){
		throw new Error('must provide config_path, publish_folder, name, assets_folder in config options');
	}
	var config_path = path.resolve(config.publish_folder, './config.json');
	gulp.task('assets-incremental-update', function(){
		var version = genVersion(config_path, config.name);
	    var zip = require('gulp-zip'),
	        assets_incremental_update = require('gulp-assets-incremental-update');
	   	gulp.src(config.assets_folder+'/**')
	        .pipe(zip(config.name))
	        .pipe(gulp.dest(config.publish_folder+'/'+version))
	        .pipe(incremental_update({
	            publish_folder : config.publish_folder,
	            name : config.name,
	            version : version
	        }));
	});
	return incremental_update;
}


module.exports = assets_incremental_update;
