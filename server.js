const express = require('express');

const app = express();
const fs = require('fs');

const parser = require('xml2json');

const androidDevResultDir = '/mnt/vdb/jenkins/jobs/CombineAndroidUIDevTestsResults/builds'
const androidStagingResultDir = '/mnt/vdb/jenkins/jobs/CombineAndroidUIStagingTestsResults/builds'

const webDevResultDir = '/mnt/vdb/jenkins/jobs/CombineWebUIDevTestsResults/builds'
const webStagingResultDir = '/mnt/vdb/jenkins/jobs/CombineWebUIStagingTestsResults/builds'

const iosDevResultDir = '/mnt/vdb/jenkins/jobs/CombineIosUIDevTestsResults/builds'
const iosStagingResultDir = '/mnt/vdb/jenkins/jobs/CombineIosUIStagingTestsResults/builds'

const clubDevResultDir = '/mnt/vdb/jenkins/jobs/CombineClubUIDevTestsResults/builds'
const clubStagingResultDir = '/mnt/vdb/jenkins/jobs/CombineClubUIStagingTestsResults/builds'

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
        case 'club_dev':
            rootDir = clubDevResultDir;
            break;
        case 'club_staging':
            rootDir = clubStagingResultDir;
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
            case 'club_dev':
                path = `${clubDevResultDir}/${buildId}/archive/diffResult.json`;
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
            case 'club_staging':
                path = `${clubStagingResultDir}/${buildId}/archive/diffResult.json`;
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
            case 'club_dev':
                path = `${clubDevResultDir}/${buildId}/archive/new/${screenshot}`;
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
            case 'club_staging':
                path = `${clubStagingResultDir}/${buildId}/archive/new/${screenshot}`;
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

                        if (!!buildJson.replaced) {
                            buildJson.replacedScreenshotsCount = buildJson.replaced.length;
                        }
                        else {
                            buildJson.replacedScreenshotsCount = 0;
                        }

                        if (!!buildJson.failedData) {
                            if (Array.isArray(buildJson.failedData)) {
                                buildJson.failedScreenshotsCount = buildJson.failedData.length;
                            }
                            else {
                                buildJson.failedScreenshotsCount = (Object.keys(buildJson.failedData)).length;
                            }
                        }
                        else {
                            buildJson.failedScreenshotsCount = 0;
                        }

                        delete buildJson.data;
                        delete buildJson.failedData;
                        delete buildJson.replaced;

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

function replaceScreenshot(client, buildId, screenshot) {
    if (!fs.existsSync(`screenshots/${client}/backup/${buildId}`)) {
        fs.mkdirSync(`screenshots/${client}/backup/${buildId}`);
    }

    if (fs.existsSync(`screenshots/${client}/base/${screenshot}`)) {
        fs.copyFileSync(`screenshots/${client}/base/${screenshot}`, `screenshots/${client}/backup/${buildId}/${screenshot}`);
    }

    fs.copyFileSync(getClientResultScreenshotPath(client, buildId, screenshot), `screenshots/${client}/base/${screenshot}`);


    let buildInfoPath = getClientDiffJSONPath(client, buildId);
    let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

    if (!buildInfo.replaced) {
        buildInfo.replaced = []
    }

    if (!buildInfo.replaced.includes(screenshot)) {
        buildInfo.replaced.push(screenshot);
        fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo));
    }

    return buildInfo;
}

function passCaseByScreenshot(client, buildId, screenshot, passOrFail) {
    let buildInfoPath = getClientDiffJSONPath(client, buildId);
    let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

    var names = (screenshot.split(".")[0]).split("_");
    var caseIds = [];

    for (let name of names) {
      if (name.startsWith('SPND')) {
        caseIds.push(name.replace('SPND', 'SPND-'));
      }
    }

    var result = passOrFailCases(client, buildId, caseIds, passOrFail)

    buildInfo.failedCount = result.failedCount
    buildInfo.passedCount = result.passedCount

    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo));

    return buildInfo;
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

function getXml(client, buildId) {
    var rootDir = getClientRootDir(client)
    var xmlPath = `${rootDir}/${buildId}/archive/TestlinkResult.xml`
    if (!fs.existsSync(xmlPath)) {
        return undefined
    }
    var xml = fs.readFileSync(xmlPath)
    var json = parser.toJson(xml, {    object: true,
                                        reversible: true,
                                        coerce: false,
                                        sanitize: true,
                                        trim: true,
                                        arrayNotation: false,
                                        alternateTextNode: false})

    //console.dir(caseIds, {depth: null, colors: true});

    return json;
}


function passOrFailCases(client, buildId, caseIds, passOrFail) {
    var result = {
        failedCount: 0,
        passedCount: 0
    };

    var json = getXml(client, buildId);
    if (!!!json) {
        return result
    }

    for (let testcase of json.results.testcase) {
        if (caseIds.indexOf(testcase.external_id) > -1) {
            if (passOrFail) {
                testcase.result.$t = 'p'
            }
            else {
                testcase.result.$t = 'f'
            }
            
        }

        if (testcase.result.$t == 'p') {
            result.passedCount++
        }
        else {
            result.failedCount++
        }
    }

    var rootDir = getClientRootDir(client)

    fs.writeFileSync(`${rootDir}/${buildId}/archive/TestlinkResult.xml`, parser.toXml(JSON.stringify(json)))

    return result
}


function passCaseIfAllReplaced(client, buildId, screenshot) {
    let buildInfoPath = getClientDiffJSONPath(client, buildId);
    let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

    var caseName = screenshot.split(".")[0];
    console.log('replace case name: ' + caseName);
    //Check if it is the last screenshot of the cases, if so, pass the result
    const failedCasesWithoutReplaced = Object.keys(buildInfo.failedData).filter(obj=>!buildInfo.replaced.includes(obj));
    if (-1 == failedCasesWithoutReplaced.findIndex(obj=>obj.includes(caseName))) {
        console.log('all case has been replaced');
        buildInfo = passCaseByScreenshot(client, buildId, screenshot, true);
    }

    return buildInfo;
}


function removeBaseFile(client, screenshot) {
    if (fs.existsSync(`screenshots/${client}/base/${screenshot}`)) {
        fs.unlinkSync(`screenshots/${client}/base/${screenshot}`);
    }

    var clientRootDir = getClientRootDir(client)

    fs.readdir(clientRootDir, function (err, files) {
        if (err) {
            return console.error(err);
        }

        var baseFileCount = fs.readdirSync(`screenshots/${client}/base`).length;

        files.forEach(function(file, index) {
            let fstat = fs.lstatSync(`${clientRootDir}/${file}`);
            if (file != '.DS_Store' && fstat.isDirectory()) {
                let path = getClientDiffJSONPath(client, file);
                if (fs.existsSync(path)) {
                    data = fs.readFileSync(path);
                    //console.log('JSON to be modified->%s', data);

                    let buildJson = JSON.parse(data);
                    buildJson.baseFileCount = baseFileCount;
                    
                    if (buildJson.replaced) {
                        buildJson.replaced = buildJson.replaced.filter(obj=> obj !== screenshot);
                    }

                    if (buildJson.failedData) {
                        if (Array.isArray(buildJson.failedData)) {
                            buildJson.failedData = buildJson.failedData.filter(obj=> obj !== screenshot);
                        }
                        else if (buildJson.failedData[screenshot]) {
                            delete buildJson.failedData[screenshot];
                        }
                        
                    }

                    //console.dir(buildJson, {depth: null, colors: true});

                    fs.writeFileSync(path, JSON.stringify(buildJson));
                }
            }
        });
    });
}

app.route('/:client/base').get((req, res) => {
    const client = req.params['client']
    res.send(getBaseFiles(client, undefined)); 
});

app.route('/batchRemoveBase').post((req, res) => {
    const caseId = req.body.caseId;
    const platform = req.body.platform;
    var removedFiles = [];

    const shouldRemoveIOS = !!!platform || platform == 'ios'
    const shouldRemoveAndroid = !!!platform || platform == 'android'
    const shouldRemoveWeb = !!!platform || platform == 'web'
    const shouldRemoveClub = platform == 'club'

    console.log("case ID to be remove -> %s", caseId);

    var formattedCaseId = 'SPND' + caseId + '_'

    if (shouldRemoveIOS) {
        var iOSDevBases = getBaseFiles('ios_dev', formattedCaseId);
        console.log("ios dev cases to be removed -> %s", iOSDevBases);

        iOSDevBases.forEach(function(file, index) {
            removeBaseFile('ios_dev', file);
            removedFiles.push('ios_dev:'+file);
        });

        var iOSStagingBases = getBaseFiles('ios_staging', formattedCaseId);
        console.log("ios staging cases to be removed -> %s", iOSStagingBases);

        iOSStagingBases.forEach(function(file, index) {
            removeBaseFile('ios_staging', file);
            removedFiles.push('ios_staging:'+file);
        });     
    }

    if (shouldRemoveAndroid) {
        var androidDevBases = getBaseFiles('android_dev', formattedCaseId);
        console.log("android dev cases to be removed -> %s", androidDevBases);

        androidDevBases.forEach(function(file, index) {
            removeBaseFile('android_dev', file);
            removedFiles.push('android_dev:'+file);
        });

        var androidStagingBases = getBaseFiles('android_staging', formattedCaseId);
        console.log("android staging cases to be removed -> %s", androidStagingBases);

        androidStagingBases.forEach(function(file, index) {
            removeBaseFile('android_staging', file);
            removedFiles.push('android_staging:'+file);
        });
    }

    if (shouldRemoveWeb) {
        var webDevBases = getBaseFiles('web_dev', formattedCaseId);
        console.log("web dev cases to be removed -> %s", webDevBases);

        webDevBases.forEach(function(file, index) {
            removeBaseFile('web_dev', file);
            removedFiles.push('web_dev:'+file);
        });

        var webStagingBases = getBaseFiles('web_staging', formattedCaseId);
        console.log("web staging cases to be removed -> %s", webStagingBases);

        webStagingBases.forEach(function(file, index) {
            removeBaseFile('web_staging', file);
            removedFiles.push('web_staging:'+file);
        });
    }

    if (shouldRemoveClub) {
        var clubDevBases = getBaseFiles('club_dev', formattedCaseId);
        console.log("club dev cases to be removed -> %s", clubDevBases);

        clubDevBases.forEach(function(file, index) {
            removeBaseFile('club_dev', file);
            removedFiles.push('club_dev:'+file);
        });

        var clubStagingBases = getBaseFiles('club_staging', formattedCaseId);
        console.log("club staging cases to be removed -> %s", clubStagingBases);

        clubStagingBases.forEach(function(file, index) {
            removeBaseFile('cub_staging', file);
            removedFiles.push('club_staging:'+file);
        });
    }

    // var iOSBases = getBaseFiles('ios_dev', formattedCaseId);
    // console.log("ios cases to be removed -> %s", iOSBases);
    // var iOSBases = getBaseFiles('ios_dev', formattedCaseId);
    // console.log("ios cases to be removed -> %s", iOSBases);

    res.send(removedFiles); 
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

app.route('/build/:client/:id/stringKeyMap').get((req, res) => {
    const buildId = req.params['id']
    const client = req.params['client']

    var rootDir = getClientRootDir(client)
    var keyMapPath = `${rootDir}/${buildId}/archive/UiKeyScreenMap.json`

    fs.readFile(keyMapPath, function read(err, data) {
        if (err) {
            throw err;
        }

        res.send(JSON.parse(data));
    });
});

app.route('/build/:client/:id/xml').get((req, res) => {
    const buildId = req.params['id']
    const client = req.params['client']

    res.send(getXml(client, buildId));
});

app.route('/build/:client/:id/batchPassSimilar').post((req, res) => {
    const buildId = req.params['id']
    const client = req.params['client']

    const screenshots = req.body.screenshots;

    let buildInfoPath = getClientDiffJSONPath(client, buildId);
    let buildInfo = {};

    screenshots.forEach(function(screenshot, index) {
        buildInfo = replaceScreenshot(client, buildId, screenshot);

        if (buildInfo.similarData1) {
            buildInfo.similarData1 = buildInfo.similarData1.filter(obj=> obj !== screenshot);
        }

        fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo));

        buildInfo = passCaseIfAllReplaced(client, buildId, screenshot);
    });

    res.send(buildInfo);
});

app.route('/build/:client/:id/batchReplace').post((req, res) => {
    const buildId = req.params['id']
    const client = req.params['client']

    const screenshots = req.body.screenshots;
    const onlyChangeXml = req.body.onlyChangeXml;

    console.log('****' + screenshots);

    if (!onlyChangeXml) {
        let buildInfoPath = getClientDiffJSONPath(client, buildId);
        let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

        if (!buildInfo.replaced) {
            buildInfo.replaced = [];
        }

        screenshots.forEach(function(screenshot, index) {
            if (!fs.existsSync(`screenshots/${client}/backup/${buildId}`)) {
                fs.mkdirSync(`screenshots/${client}/backup/${buildId}`);
            }

            if (fs.existsSync(`screenshots/${client}/base/${screenshot}`)) {
                fs.copyFileSync(`screenshots/${client}/base/${screenshot}`, `screenshots/${client}/backup/${buildId}/${screenshot}`);
            }
            fs.copyFileSync(getClientResultScreenshotPath(client, buildId, screenshot), `screenshots/${client}/base/${screenshot}`);

            if (!buildInfo.replaced.includes(screenshot)) {
                buildInfo.replaced.push(screenshot);
            }
        });

        fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo))
    }

    buildInfo = passCaseByScreenshot(client, buildId, screenshots[0], true);

    res.send(buildInfo);
});


app.route('/build/:client/:id/replace').post((req, res) => {
    const buildId = req.params['id']
    const client = req.params['client']

    const screenshot = req.body.screenshot;

    let buildInfo = replaceScreenshot(client, buildId, screenshot);

    buildInfo = passCaseIfAllReplaced(client, buildId, screenshot);

    res.send(buildInfo);
});

app.route('/build/:client/:id/removeSimilar').post((req, res) => {
    const buildId = req.params['id']
    const client = req.params['client']

    const screenshot = req.body.screenshot;

    let buildInfoPath = getClientDiffJSONPath(client, buildId);
    let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

    if (buildInfo.similarData1) {
        buildInfo.similarData1 = buildInfo.similarData1.filter(obj=> obj !== screenshot);
    }

    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo))

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

    removeBaseFile(client, req.body.screenshot);

    let buildInfoPath = getClientDiffJSONPath(client, buildId);
    let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

    res.send(buildInfo);
});

app.route('/build/:client/:id/undoReplace').post((req, res) => {
    const buildId = req.params['id']
    const client = req.params['client']

    const screenshot = req.body.screenshot;
    const onlyChangeXml = req.body.onlyChangeXml;

    let buildInfoPath = getClientDiffJSONPath(client, buildId);
    let buildInfo = JSON.parse(fs.readFileSync(buildInfoPath));

    if (!onlyChangeXml) {
        fs.copyFileSync(`screenshots/${client}/base/${screenshot}`, getClientResultScreenshotPath(client, buildId, screenshot));
        fs.copyFileSync(`screenshots/${client}/backup/${buildId}/${screenshot}`, `screenshots/${client}/base/${screenshot}`);

        if (buildInfo.replaced) {
            buildInfo.replaced = buildInfo.replaced.filter(obj=> obj !== screenshot);
        }
    }

    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo));

    buildInfo = passCaseByScreenshot(client, buildId, screenshot, false);

    res.send(buildInfo);
});

app.use('/screenshots', express.static('screenshots'));
app.use('/android_dev', express.static(androidDevResultDir));
app.use('/web_dev', express.static(webDevResultDir));
app.use('/ios_dev', express.static(iosDevResultDir));
app.use('/club_dev', express.static(clubDevResultDir));

app.use('/android_staging', express.static(androidStagingResultDir));
app.use('/web_staging', express.static(webStagingResultDir));
app.use('/ios_staging', express.static(iosStagingResultDir));
app.use('/club_staging', express.static(clubStagingResultDir));

app.listen(8000, () => {
  console.log('Server started!');
});