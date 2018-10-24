const express = require('express');

const app = express();
const fs = require('fs');

var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.route('/builds/:client').get((req, res) => {
		const client = req.params['client']
		let builds = [];
	    fs.readdir(`screenshots/${client}/results`, function (err, files) {
		    if (err) {
		        return console.error(err);
		    }

		    files.forEach(function( file, index ) {
		    	if (file != '.DS_Store') {
					data = fs.readFileSync(`screenshots/${client}/results/${file}/diffResult.json`);
			   		builds.push(JSON.parse(data));
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

	fs.readFile(`screenshots//${client}/results/${buildId}/diffResult.json`, function read(err, data) {
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

	fs.copyFileSync(`screenshots/${client}/base/${screenshot}`, `screenshots/${client}/backup/${screenshot}`);
	fs.copyFileSync(`screenshots/${client}/results/${buildId}/Screenshots/new/${screenshot}`, `screenshots/${client}/base/${screenshot}`);

	let buildInfo = JSON.parse(fs.readFileSync(`screenshots/${client}/results/${buildId}/diffResult.json`));

	if (!buildInfo.replaced) {
		buildInfo.replaced = [];
	}

	if (!buildInfo.replaced.includes(screenshot)) {
		buildInfo.replaced.push(screenshot);
		fs.writeFileSync(`screenshots/${client}/results/${buildId}/diffResult.json`, JSON.stringify(buildInfo));
	}

	res.send(buildInfo);
});

app.route('/build/:client/:id/undoReplace').post((req, res) => {
	const buildId = req.params['id']
	const client = req.params['client']

	const screenshot = req.body.screenshot;

	fs.copyFileSync(`screenshots/${client}/base/${screenshot}`, `screenshots/${client}/results/${buildId}/Screenshots/new/${screenshot}`);
	fs.copyFileSync(`screenshots/${client}/backup/${screenshot}`, `screenshots/${client}/base/${screenshot}`);

	let buildInfo = JSON.parse(fs.readFileSync(`screenshots/${client}/results/${buildId}/diffResult.json`));

	buildInfo.replaced = buildInfo.replaced.filter(obj=> obj !== screenshot);

	fs.writeFileSync(`screenshots/${client}/results/${buildId}/diffResult.json`, JSON.stringify(buildInfo));


	res.send(buildInfo);
});

app.use(express.static('screenshots'));

app.listen(8000, () => {
  console.log('Server started!');
});