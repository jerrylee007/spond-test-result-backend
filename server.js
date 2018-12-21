const express = require('express');

const app = express();
const fs = require('fs');

const androidResultDir = '/var/lib/jenkins/jobs/Android-UITestOn8/builds'
const webResultDir = '/var/lib/jenkins/jobs/WebUITest/builds'
const iosResultDir = '/var/lib/jenkins/jobs/IOS-UITest/builds'

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
		case 'ios':
			rootDir = iosResultDir;
			break;
		case 'web':
			rootDir = webResultDir;
			break;
		case 'android':
			rootDir = androidResultDir;
			break;
		default:
			break;

	}

	return rootDir;
}

function getClientDiffJSONPath(client, build) {
	let path = undefined;
	switch (client) {
		case 'ios':
			path = `${iosResultDir}/${build}/archive/diffResult.json`;
			break;
		case 'web':
			path = `${webResultDir}/${build}/archive/diffResult.json`;
			break;
		case 'android':
			path = `${androidResultDir}/${build}/archive/diffResult.json`;
			break;
		default:
			break;

	}

	return path;
}

function getClientResultScreenshotPath(client, buildId, screenshot) {
	let path = undefined;
	switch (client) {
		case 'ios':
			path = `${iosResultDir}/${buildId}/archive/new/${screenshot}`;
			break;
		case 'web':
			path = `${webResultDir}/${buildId}/archive/new/${screenshot}`;
			break;
		case 'android':
			path = `${androidResultDir}/${buildId}/archive/new/${screenshot}`;
			break;
		default:
			break;

	}

	return path;
}

function getBaseFiles(client, searchString) {
	let clientRootDir = getClientRootDir(client);

	let baseFiles = fs.readdirSync(`screenshots/${client}/base/`);
	let baseFilesJson = [];

    baseFiles.forEach(function(file, index) {
    	if (file != '.DS_Store' && (!!!searchString || file.includes(searchString))) {
    		baseFilesJson.push(file);
    	}
	});

	return baseFilesJson; 
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
		let builds = [];

		let clientRootDir = getClientRootDir(client);

		let baseFileCount = fs.readdirSync(`screenshots/${client}/base/`).length;

		if (clientRootDir) {
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

				let results = builds.sort((a, b)=>{
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
			res.send('{}');
		}
	    

	// fs.readFile('results/builds.json', function read(err, data) {
	//     if (err) {
	//         throw err;
	//     }

	//     var builds = [];

	//     fs.stat('results', function (err, stats) {
	// 	    if (err) {
	// 	        return console.error(err);
	// 	    }
	// 	    console.log(stats);
	// 	    console.log("Got file info successfully!");

	// 	    if (stats.isDirectory()) {

	// 	    }

	// 	    // // Check file type
	// 	    // console.log("isFile ? " + stats.isFile());
	// 	    // console.log("isDirectory ? " + stats.isDirectory());
	// 	});

	//     res.send(JSON.parse(data));
	// });
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
      console.log(files);
	  if (fields.value == 'result') {
	  	console.log(files.image);
	  	console.log((files.image[0]).path);
	  	console.log((files.image[0]).originalFilename);
		fs.copyFileSync(files.image[0].path, `screenshots/${client}/result/${files.image[0].originalFilename}`);
	  }
	  else {
	  	fs.copyFileSync(files.image[0].path, `screenshots/${client}/new/${files.image[0].originalFilename}`);
	  }

      res.send([]);
    });

	return;
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

app.route('/build/:client/removeBase').post((req, res) => {
	const client = req.params['client']

	const screenshot = req.body.screenshot;

	if (fs.existsSync(`screenshots/${client}/base/${screenshot}`)) {
		fs.unlinkSync(`screenshots/${client}/base/${screenshot}`);
	}

	res.send([]);
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
app.use('/android', express.static('/var/lib/jenkins/jobs/Android-UITestOn8/builds/'));
app.use('/web', express.static('/var/lib/jenkins/jobs/WebUITest/builds/'));
app.use('/ios', express.static('/var/lib/jenkins/jobs/IOS-UITest/builds/'));

app.listen(8000, () => {
  console.log('Server started!');
});