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
			tasks = genDiffTasks(options.publish_folder, version, options.name, options.limit),
			q_tasks = [];
		try{
			for(var i=0, len=tasks.length; i<len; i++){
				q_tasks.push((function(i){
					return function(){
						return diff.diff(tasks[i][0], tasks[i][1], {bsdiff : options.bsdiff}).then(function(archive){
	                        if(!fs.existsSync(path.dirname(tasks[i][2]))){
	                          fs.mkdirSync(path.dirname(tasks[i][2]));
	                        }
	                        var output = fs.createWriteStream(tasks[i][2]);
	                        output.on('finish', function(){
	                        	options.onBuildSuccess && options.onBuildSuccess(tasks[i][2]);
	                        	gutil.log('gulp-assets-incremental-update: ' + 'success build patch '+tasks[i][2]);
	                        	console.log(i, len-1);
	                        	if(i===len-1){
		                        	me.push(file);
									cb();
		                        }
	                        });
	                        archive.pipe(output);
	                    });
					}
				})(i));
			}
			if(q_tasks.length===0){
				return cb();
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

function genDiffTasks(folder, version, basename, limit){
    function genPath(folder, version, basename){
        return path.resolve(folder, './'+version + '/'+basename);
    }
    function genDestPath(folder, oldVersion, newVersion, basename){
        return path.resolve(folder, './'+oldVersion + '/'+ newVersion + '/'+basename);
    }
    var tasks = [];
    version = parseInt(version);
    var i = 1;
    if(limit && !isNaN(parseInt(limit))){
    	i = Math.max(1, version-parseInt(limit));
    }
    for(; i<version; i++){
        tasks.push([genPath(folder, i, basename), genPath(folder, version, basename), genDestPath(folder, i, version, basename)]);
        tasks.push([genPath(folder, version, basename), genPath(folder, i, basename), genDestPath(folder, version, i, basename)]);
    }
    return tasks;
}

function genVersion(config_path, name, base_url){
	var config;
    if(fs.existsSync(config_path) ) {
        var content = fs.readFileSync(config_path, {
            encoding : 'utf8'
        });
        config = JSON.parse(content);
        config.last_version = config.Last_version;
    }else{
    	config = {
    		file_name : name,
    		cur_version : 1,
    		last_version : 0,
    		test_version : 1,
    		Last_version : 0,
    		base_url : base_url
    	};
    }
    config.last_version++;
    config.Last_version++;
    fs.writeFileSync(config_path, JSON.stringify(config));
    return config.last_version;
}

function assets_incremental_update(gulp, configs){
	var config;
	if(!configs.slice){
		configs = [configs];
	}
	for(var i=0,len=configs.length; i<len; i++){
		config = configs[i];
		(function(config){
			if(!config.publish_folder || !config.name || !config.assets_folder || !config.base_url){
				throw new Error('must provide publish_folder, name, assets_folder, base_url in config options');
			}
			var config_path = path.resolve(config.publish_folder, './config.json');
			gulp.task(config.task_name || 'assets-incremental-update', function(cb){
				var version = genVersion(config_path, config.name, config.base_url);
			    var zip = require('gulp-zip'),
			        assets_incremental_update = require('gulp-assets-incremental-update');
			   	gulp.src(config.assets_folder+'/**')
			        .pipe(zip(config.name))
			        .pipe(gulp.dest(config.publish_folder+'/'+version))
			        .pipe(incremental_update({
			            publish_folder : config.publish_folder,
			            name : config.name,
			            version : version,
			            limit : config.limit,
			            bsdiff : config.bsdiff || false,
			            onBuildSuccess : config.onBuildSuccess
			        }));
			});
		})(config);
	}
}

assets_incremental_update.incremental_update = incremental_update;

module.exports = assets_incremental_update;
