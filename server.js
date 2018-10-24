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

app.route('/builds').get((req, res) => {

		let builds = [];
	    fs.readdir('screenshots/results', function (err, files) {
		    if (err) {
		        return console.error(err);
		    }

		    files.forEach(function( file, index ) {
		    	console.log('file:' + file);
		    	if (file != '.DS_Store') {
		    		console.log('start');
					data = fs.readFileSync('screenshots/results/' + file + '/diffResult.json');
					console.log(data);
			   		builds.push(JSON.parse(data));
		    	}
			});

		    console.log(builds);
		    console.log(JSON.stringify(builds));


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

app.route('/build/android/:id').get((req, res) => {
	const buildId = req.params['id']

	fs.readFile('screenshots/results/' + buildId + '/diffResult.json', function read(err, data) {
	    if (err) {
	        throw err;
	    }

	    res.send(JSON.parse(data));
	});
});

app.route('/build/android/:id/replace').post((req, res) => {
	const buildId = req.params['id']

	const screenshot = req.body.screenshot;
	
	console.log(req.params);

	fs.copyFileSync(`screenshots/base/${screenshot}`, `screenshots/backup/${screenshot}`);
	fs.copyFileSync('screenshots/results/' + buildId + '/Screenshots/new/' + screenshot, `screenshots/base/${screenshot}`);

	res.send('{}');
});

app.use(express.static('screenshots'));

app.listen(8000, () => {
  console.log('Server started!');
});