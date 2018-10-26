const express = require('express');

const app = express();
const fs = require('fs');

const androidResultDir = '/var/lib/jenkins/jobs/Android-UITestOn8/builds'


var bodyParser = require('body-parser');

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
			break;
		case 'web':
			break;
		case 'android':
			rootDir = androidResultDir;
			break;
		default:
			break;

	}

	return rootDir;
}

app.route('/builds/:client').get((req, res) => {
		const client = req.params['client']
		let builds = [];

		let clientRootDir = getClientRootDir(client);

		if (clientRootDir) {
		    fs.readdir(clientRootDir, function (err, files) {
			    if (err) {
			        return console.error(err);
			    }

			    files.forEach(function(file, index) {
			    	console.log(file);
			    	let fstat = fs.lstatSync(`${clientRootDir}/${file}`);
			    	if (file != '.DS_Store' && fstat.isDirectory()) {
			    		let path = `${clientRootDir}/${file}/archive/client3.1/testng/diffResult.json`;
			    		if (fs.existsSync(path)) {
							data = fs.readFileSync(path);
					   		builds.push(JSON.parse(data));
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

	let clientRootDir = getClientRootDir(client); 

	fs.readFile(`${clientRootDir}/${buildId}/archive/client3.1/testng/diffResult.json`, function read(err, data) {
	    if (err) {
	        throw err;
	    }

	    res.send(JSON.parse(data));
	});
});

app.route('/build/:client/:id/replace').post((req, res) => {
	const buildId = req.params['id']
	const client = req.params['client']

	const screenshot = req.body.screenshot;

	let clientRootDir = getClientRootDir(client);

	if (!fs.existsSync(`screenshots/${client}/backup/${buildId}`)) {
		fs.mkdirSync(`screenshots/${client}/backup/${buildId}`);
	}

	fs.copyFileSync(`screenshots/${client}/base/${screenshot}`, `screenshots/${client}/backup/${buildId}/${screenshot}`);
	fs.copyFileSync(`${clientRootDir}/${buildId}/archive/client3.1/testng//Screenshots/new/${screenshot}`, `screenshots/${client}/base/${screenshot}`);


	let buildInfoPath = `${clientRootDir}/${buildId}/archive/client3.1/testng/diffResult.json`;
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

app.route('/build/:client/:id/undoReplace').post((req, res) => {
	const buildId = req.params['id']
	const client = req.params['client']

	const screenshot = req.body.screenshot;

	let clientRootDir = getClientRootDir(client);

	fs.copyFileSync(`screenshots/${client}/base/${screenshot}`, `${clientRootDir}/${buildId}/archive/client3.1/testng//Screenshots/new/${screenshot}`);
	fs.copyFileSync(`screenshots/${client}/backup/${buildId}/${screenshot}`, `screenshots/${client}/base/${screenshot}`);

	let buildInfoPath = `${clientRootDir}/${buildId}/archive/client3.1/testng/diffResult.json`;
	let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

	buildInfo.replaced = buildInfo.replaced.filter(obj=> obj !== screenshot);

	fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo));


	res.send(buildInfo);
});

app.use('/screenshots', express.static('screenshots'));
app.use('/android', express.static('/var/lib/jenkins/jobs/Android-UITestOn8/builds/'));


app.listen(8000, () => {
  console.log('Server started!');
});