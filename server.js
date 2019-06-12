const express = require('express');

const app = express();
const fs = require('fs');

const androidDevResultDir = '/var/lib/jenkins/jobs/CombineAndroidUIDevTestsResults/builds'
const androidStagingResultDir = '/var/lib/jenkins/jobs/CombineAndroidUIStagingTestsResults/builds'

const webDevResultDir = '/var/lib/jenkins/jobs/WebUITest/builds'
const webStagingResultDir = '/var/lib/jenkins/jobs/WebUITest/builds'

const iosDevResultDir = '/var/lib/jenkins/jobs/CombineUIDevTestsResults/builds'
const iosStagingResultDir = '/var/lib/jenkins/jobs/CombineUIStagingTestsResults/builds'

const localBuildId = '99999'

var bodyParser = require('body-parser');
var multiparty = require('multiparty');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

function getClientRootDir(client) {
	let rootDir = undefined;
	switch (client) {
		case 'ios_dev':
			rootDir = iosDevResultDir;
			break;
		case 'web_dev':
			rootDir = webDevResultDir;
			break;
		case 'android_dev':
			rootDir = androidDevResultDir;
			break;
		case 'ios_staging':
			rootDir = iosStagingResultDir;
			break;
		case 'web_staging':
			rootDir = webStagingResultDir;
			break;
		case 'android_staging':
			rootDir = androidStagingResultDir;
			break;
		default:
			break;
	}

	return rootDir;
}

function getClientDiffJSONPath(client, buildId) {
	let path = undefined;

	if (buildId == localBuildId) {
		path = `screenshots/${client}/diffResult.json`;
	}
	else {
		switch (client) {
			case 'ios_dev':
				path = `${iosDevResultDir}/${buildId}/archive/diffResult.json`;
				break;
			case 'web_dev':
				path = `${webDevResultDir}/${buildId}/archive/diffResult.json`;
				break;
			case 'android_dev':
				path = `${androidDevResultDir}/${buildId}/archive/diffResult.json`;
				break;
			case 'ios_staging':
				path = `${iosStagingResultDir}/${buildId}/archive/diffResult.json`;
				break;
			case 'web_staging':
				path = `${webStagingResultDir}/${buildId}/archive/diffResult.json`;
				break;
			case 'android_staging':
				path = `${androidStagingResultDir}/${buildId}/archive/diffResult.json`;
				break;
			default:
				break;

		}
	}


	return path;
}

function getClientResultScreenshotPath(client, buildId, screenshot) {
	let path = undefined;
	if (buildId == localBuildId) {
		path = `screenshots/${client}/new/${screenshot}`;
	}
	else {
		switch (client) {
			case 'ios_dev':
				path = `${iosDevResultDir}/${buildId}/archive/new/${screenshot}`;
				break;
			case 'web_dev':
				path = `${webDevResultDir}/${buildId}/archive/new/${screenshot}`;
				break;
			case 'android_dev':
				path = `${androidDevResultDir}/${buildId}/archive/new/${screenshot}`;
				break;
			case 'ios_staging':
				path = `${iosStagingResultDir}/${buildId}/archive/new/${screenshot}`;
				break;
			case 'web_staging':
				path = `${webStagingResultDir}/${buildId}/archive/new/${screenshot}`;
				break;
			case 'android_staging':
				path = `${androidStagingResultDir}/${buildId}/archive/new/${screenshot}`;
				break;
			default:
				break;

		}
	}

	return path;
}

function getBaseFiles(client, searchString) {
	let clientRootDir = getClientRootDir(client);

	let baseFiles = fs.readdirSync(`screenshots/${client}/base`);
	let baseFilesJson = [];

    baseFiles.forEach(function(file, index) {
    	if (file != '.DS_Store' && (!!!searchString || file.includes(searchString))) {
    		baseFilesJson.push(file);
    	}
	});

	return baseFilesJson; 
}

function refreshCacheAndSendResponse(client, res) {
	let clientRootDir = getClientRootDir(client);
	let cachedInfo = getClientCachedBuildInfo(client);
	var builds = cachedInfo.builds;

	cachedInfo.baseFileCount = fs.readdirSync(`screenshots/${client}/base`).length;

    fs.readdir(clientRootDir, function (err, files) {
	    if (err) {
	        return console.error(err);
	    }

	    files.forEach(function(file, index) {
	    	let fstat = fs.lstatSync(`${clientRootDir}/${file}`);
	    	if (file != '.DS_Store' && fstat.isDirectory()) {
	    		let path = getClientDiffJSONPath(client, file);
	    		if (fs.existsSync(path)) {
					data = fs.readFileSync(path);
					let buildJson = JSON.parse(data);
					buildJson.baseFileCount = cachedInfo.baseFileCount;
			   		builds.push(buildJson);
	    		}
	    	}
		});

		console.log('**** builds:' + builds.length);

		builds.sort((a, b)=>{
			if (a.buildNumber > b.buildNumber) {
				return -1;
			}
			else if (a.buildNumber < b.buildNumber) {
				return 1;
			}
			else {
				return 0;
			}
		});

	
			res.send(JSON.stringify(builds));
		
		
	});
}

function responseWithAllBuilds(client, res)  {
	let clientRootDir = getClientRootDir(client);
	var builds = [];

	if (clientRootDir) {

		var baseFileCount = fs.readdirSync(`screenshots/${client}/base`).length;

	    fs.readdir(clientRootDir, function (err, files) {
		    if (err) {
		        return console.error(err);
		    }

		    files.forEach(function(file, index) {
		    	let fstat = fs.lstatSync(`${clientRootDir}/${file}`);
		    	if (file != '.DS_Store' && fstat.isDirectory()) {
		    		let path = getClientDiffJSONPath(client, file);
		    		if (fs.existsSync(path)) {
						data = fs.readFileSync(path);
						let buildJson = JSON.parse(data);
						buildJson.baseFileCount = baseFileCount;
				   		builds.push(buildJson);
		    		}
		    	}
			});

			builds.sort((a, b)=>{
				if (a.buildNumber > b.buildNumber) {
					return -1;
				}
				else if (a.buildNumber < b.buildNumber) {
					return 1;
				}
				else {
					return 0;
				}
			});
			res.send(JSON.stringify(builds));
			
		});
	}
	else {
		res.send('[]');
	}
}


function emptyDirectory(buildPath) {
    var files=fs.readdirSync(buildPath);
    for(var i=0;i<files.length;i++){
        var pathf=buildPath+'/'+files[i];//拼接子文件路径
        var stats=fs.statSync(pathf)
        if(stats.isFile()){
            fs.unlinkSync(pathf);     //若为文件则删除
        }else{
            emptyDirectory(pathf);
        }
    };
    fs.rmdirSync(buildPath);
}

app.route('/:client/base').get((req, res) => {
	const client = req.params['client']
	res.send(getBaseFiles(client, undefined)); 
});

app.route('/:client/base/:searchString').get((req, res) => {
	const client = req.params['client']
	const searchString = req.params['searchString']
	res.send(getBaseFiles(client, searchString)); 
});


app.route('/builds/:client').get((req, res) => {
	const client = req.params['client']

	console.log(client);

	responseWithAllBuilds(client, res);
});

app.route('/build/:client/:id').get((req, res) => {
	const buildId = req.params['id']
	const client = req.params['client']

	fs.readFile(getClientDiffJSONPath(client, buildId), function read(err, data) {
	    if (err) {
	        throw err;
	    }

	    res.send(JSON.parse(data));
	});
});

app.route('/build/:client/upload').post((req, res) => {
	const client = req.params['client']

	var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
      console.log(fields);
      if (fields.type == 'json') {
      	let diffFilePath = `screenshots/${client}/${files.json[0].originalFilename}`;
		if (fs.existsSync(diffFilePath)) {
			fs.unlinkSync(diffFilePath);
		}
      	fs.copyFileSync(files.json[0].path, diffFilePath);

      	let resultPath = `screenshots/${client}/result`;
	    fs.readdir(resultPath, function (err, files) {
		    if (err) {
		    	res.send(err);
		        return console.error(err);
		    }

		    files.forEach(function(file, index) {
		    	if (file != '.DS_Store') {
		    		fs.unlinkSync(`${resultPath}/${file}`);
		    	}
			});
		});

      	let newPath = `screenshots/${client}/new`;
	    fs.readdir(newPath, function (err, files) {
		    if (err) {
		    	res.send(err);
		        return console.error(err);
		    }

		    files.forEach(function(file, index) {
		    	if (file != '.DS_Store') {
		    		fs.unlinkSync(`${newPath}/${file}`);
		    	}
			});
		});

      	let backupPath = `screenshots/${client}/backup/${localBuildId}`;
	    fs.readdir(backupPath, function (err, files) {
		    if (err) {
		    	res.send(err);
		        return console.error(err);
		    }

		    files.forEach(function(file, index) {
		    	if (file != '.DS_Store') {
		    		fs.unlinkSync(`${backupPath}/${file}`);
		    	}
			});
		});


	    res.send([]);

      }
	  else {
		
		let keys = Object.keys(files);

	    keys.forEach(function(key, index) {
	    	console.log('****' + key);
	    	console.log(fields.type);
			let destPath = fields.type == 'result' ? `screenshots/${client}/result/${files[key][0].originalFilename}` : `screenshots/${client}/new/${files[key][0].originalFilename}`; 
	    	fs.copyFileSync(files[key][0].path, destPath);
		});

		res.send([]);
	  }
    });

	return;
});

app.route('/build/:client/:id/batchReplace').post((req, res) => {
	const buildId = req.params['id']
	const client = req.params['client']

	const screenshots = req.body.screenshots;

	console.log('****' + screenshots);


	let buildInfoPath = getClientDiffJSONPath(client, buildId);
	let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

	if (!buildInfo.replaced) {
		buildInfo.replaced = [];
	}

	screenshots.forEach(function(screenshot, index) {
		if (!fs.existsSync(`screenshots/${client}/backup/${buildId}`)) {
			fs.mkdirSync(`screenshots/${client}/backup/${buildId}`);
		}

		fs.copyFileSync(`screenshots/${client}/base/${screenshot}`, `screenshots/${client}/backup/${buildId}/${screenshot}`);
		fs.copyFileSync(getClientResultScreenshotPath(client, buildId, screenshot), `screenshots/${client}/base/${screenshot}`);

		if (!buildInfo.replaced.includes(screenshot)) {
			buildInfo.replaced.push(screenshot);
			fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo));
		}
	});

	res.send(buildInfo);
});


app.route('/build/:client/:id/replace').post((req, res) => {
	const buildId = req.params['id']
	const client = req.params['client']

	const screenshot = req.body.screenshot;

	if (!fs.existsSync(`screenshots/${client}/backup/${buildId}`)) {
		fs.mkdirSync(`screenshots/${client}/backup/${buildId}`);
	}

	fs.copyFileSync(`screenshots/${client}/base/${screenshot}`, `screenshots/${client}/backup/${buildId}/${screenshot}`);
	fs.copyFileSync(getClientResultScreenshotPath(client, buildId, screenshot), `screenshots/${client}/base/${screenshot}`);


	let buildInfoPath = getClientDiffJSONPath(client, buildId);
	let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

	if (!buildInfo.replaced) {
		buildInfo.replaced = [];
	}

	if (!buildInfo.replaced.includes(screenshot)) {
		buildInfo.replaced.push(screenshot);
		fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo));
	}

	res.send(buildInfo);
});

app.route('/build/:client/:id/remove').post((req, res) => {
	const buildId = req.params['id']
	const client = req.params['client']

	let clientRootDir = getClientRootDir(client);
	let buildPath = `${clientRootDir}/${buildId}`

	if (fs.existsSync(buildPath)) {
		emptyDirectory(buildPath);
	}

	let clientComponents = client.split("_")

	let backupPath = `screenshots/${client}/backup/${buildId}`
	if (fs.existsSync(backupPath)) {
		emptyDirectory(backupPath);
	}

	responseWithAllBuilds(client, res);
});


app.route('/build/:client/:id/removeBase').post((req, res) => {
	const buildId = req.params['id']
	const client = req.params['client']

	const screenshot = req.body.screenshot;

	if (fs.existsSync(`screenshots/${client}/base/${screenshot}`)) {
		fs.unlinkSync(`screenshots/${client}/base/${screenshot}`);
	}

	let buildInfoPath = getClientDiffJSONPath(client, buildId);
	let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

	if (buildInfo.replaced) {
		buildInfo.replaced = buildInfo.replaced.filter(obj=> obj !== screenshot);
	}

	if (buildInfo.failedData) {
		buildInfo.failedData = buildInfo.failedData.filter(obj=> obj !== screenshot);
	}

	fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo));

	res.send(buildInfo);
});

app.route('/build/:client/:id/undoReplace').post((req, res) => {
	const buildId = req.params['id']
	const client = req.params['client']

	const screenshot = req.body.screenshot;

	fs.copyFileSync(`screenshots/${client}/base/${screenshot}`, getClientResultScreenshotPath(client, buildId, screenshot));
	fs.copyFileSync(`screenshots/${client}/backup/${buildId}/${screenshot}`, `screenshots/${client}/base/${screenshot}`);

	let buildInfoPath = getClientDiffJSONPath(client, buildId);
	let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

	if (buildInfo.replaced) {
		buildInfo.replaced = buildInfo.replaced.filter(obj=> obj !== screenshot);
	}

	fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo));


	res.send(buildInfo);
});

app.use('/screenshots', express.static('screenshots'));
app.use('/android_dev', express.static(androidDevResultDir));
app.use('/web_dev', express.static(webDevResultDir));
app.use('/ios_dev', express.static(iosDevResultDir));

app.use('/android_staging', express.static(androidStagingResultDir));
app.use('/web_staging', express.static(webStagingResultDir));
app.use('/ios_staging', express.static(iosStagingResultDir));

app.listen(8000, () => {
  console.log('Server started!');
});