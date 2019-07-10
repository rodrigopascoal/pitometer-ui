const Pitometer = require("@keptn/pitometer").Pitometer;
const DynatraceSource = require("@keptn/pitometer-source-dynatrace").Source;
const ThresholdGrader = require("@keptn/pitometer-grader-threshold").Grader;
const MongoDbAccess = require("@keptn/pitometer").MongoDbAccess;
const Reporter = require("./dist/Reporter").Reporter;
const fs = require('fs');
var http = require('http');

// Load Secrets and Config!
const dynatraceSecrets = require("./secrets.json");
const config = require("./config.json");
var mongodb = null;

// 1: Create Pitometer and add optionally add MongoDB Data Store
const pitometer = new Pitometer();
if (config.mongodb && config.mongodb != null) {
  mongodb = new MongoDbAccess(pitometer, config.mongodb);
  pitometer.setDatastore(mongodb);
}

// 2: Add Dynatrace Data Source
if (dynatraceSecrets.DynatraceUrl && dynatraceSecrets.DynatraceToken) {
  pitometer.addSource(
    "Dynatrace",
    new DynatraceSource({
      baseUrl: dynatraceSecrets.DynatraceUrl,
      apiToken: dynatraceSecrets.DynatraceToken
      // log: console.log,
    })
  );
} else {
  dynatraceSecrets = { DynatraceUrl: "https://yourdynatracetenant", DynatraceToken: "YOUR_API_TOKEN" };
  console.log("No Dynatrace Credentials provided in secrets.json. Expecting the following format: " + JSON.stringify(dynatraceSecrets));
  return;
}

// 3: Add Threshold Grader
pitometer.addGrader("Threshold", new ThresholdGrader());

// 4: Create the Options object
function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

/**
 * This creates the options object to pass into Pitometer. It will connect context & runId
 * @param {*} start
 * @param {*} end
 * @param {*} context
 * @param {*} runId
 * @param {*} compareContext
 * @param {*} individualResults
 */
function getOptions(start, end, context, runId, compareContext, individualResults) {
  return {
    context: context + "/" + runId,
    compareContext: compareContext,
    individualResults: individualResults,
    timeStart: +start / 1000,
    timeEnd: +end / 1000,
  }
}

/**
 * testRun executes the actual pitometer run and returns. The special feature is that it parses the PERFSPEC file and replaces TAG_PLACEHOLDER with the Dynatrace Tags you can pass in tags
 * @param {*} perfspecfile filename of the perfspec file
 * @param {*} tags array of dynatrace tags that will replace the TAG_PLACEHOLDER placeholder in the perfspec file
 * @param {*} options
 */
async function testRun(perfspecfile, tags, options) {
  var perfSpecContent = fs.readFileSync(perfspecfile).toString('utf-8')
  perfSpecContent = perfSpecContent.replace(new RegExp("TAG_PLACEHOLDER", 'g'), JSON.stringify(tags));

  var perfSpecJSON = JSON.parse(perfSpecContent);

  // run PerfSpec
  return pitometer.run(perfSpecJSON, options);
}

/**
 * Generates a report file - the filename will be returned
 * @param {*} context
 * @param {*} compareContext if null will default to 5 (=last 5 runs). also allows you to specify any compareContext query, e.g: last 5 passed runs
 * @param {*} reportId
 * @param {*} outputfile if specified the output will be written to this file
 * @param {*} callback function(err, outputstring): will be called with the output string as param
 */
function testReport(context, compareContext, reportId, outputfile, callback) {
  if (compareContext == null) compareContext = 5;
  var options = getOptions(null, null, context, "dummy", compareContext, true);

  // 6: Generate Report of previous test runs
  pitometer.query(options).then(results => {
    var reporter = new Reporter();
    var timeseriesResults = reporter.generateTimeseriesForReport(results);
    // console.log(JSON.stringify(timeseriesResults));

    // reading report template files!
    var mainReport = fs.readFileSync("./report/report.html").toString('utf-8');
    var seriesTemplate = fs.readFileSync("./report/r_template.html").toString('utf-8');

    // replacing placeholders and generating HTML
    mainReport = mainReport.replace("reportTitlePlaceholder", "Pitometer report: " + reportId);
    var outputString = reporter.generateHtmlReport(mainReport, seriesTemplate, "<div id=\"placeholder\"/>", timeseriesResults);

    // writing to outpout
    if (outputfile && outputfile != null) {
      fs.writeFileSync(outputfile, outputString);
    }

    if (callback) {
      callback(null, outputString);
    }
  }
  )
    .catch(err => callback(err, null));
}

/**
 * This function allows you to run multiple pitometer tests sequentially. It starts the first evaluation with startTime and length as time period.
 * testRunIx is the index that is used for a single run and will be incremented each time this method gets called. This will be used as a post for TestRun_XX to uniquely identify each run
 * count will be decreased with each run and the recursive calls will end if count is down to 0
 * @param {*} perfSpecFile perfspec.json filename
 * @param {*} startTime date object from when we start
 * @param {*} length time length in milliseconds
 * @param {*} testRunIx current test run
 * @param {*} count last test run to be executed
 * @param {*} context
 * @param {*} tags dynatrace tags that will replace TAG_PLACEHOLDER in spec file
 * @param {*} compareContext allows you to specify a compare context passed to pitometer. if null or not provided it will default to compare with last successful run
 */
async function runPitometerTests(perfSpecFile, startTime, length, testRunIx, count, context, tags, compareContext, callback) {
  if (count <= 0) {
    if (callback)
      callback(null, "Finished runs!");
    return;
  }

  var endTime = new Date(startTime.getTime() + length);

  // compareContext for last successful run
  // compareContext = 1;
  if (!compareContext || compareContext == null || compareContext == "")
    compareContext = { find: { result: "pass" }, sort: { timestamp: -1 }, limit: 1 }
  if (typeof (compareContext) == "string" && compareContext.startsWith("{"))
    compareContext = JSON.parse(compareContext);
  var options = getOptions(startTime, endTime, context, "testrun_" + testRunIx, compareContext, true);

  // run it for the current timeframe!
  testRun(perfSpecFile, tags, options).then(result => {
    // move start time to the next iteration slot
    startTime = endTime;
    runPitometerTests(perfSpecFile, startTime, length, testRunIx + 1, count - 1, context, tags, compareContext, callback);
  }).catch(error => {
    if (callback)
      callback(error, null);
    return;
  });
}


// Context for Pitometer -> this is the mongo collection data ends up
// const context = "/keptn-sample/simplenodeservice/prod-keptnsample";

function logHttpResponse(res, err, result) {
  if (err) {
    res.write(err.toString());
  } else
    if (result) {
      res.write(result);
    }
  res.end();
}

// ======================================================================
// This is our main HttpServer Handler
// ======================================================================
var server = http.createServer(function (req, res) {
  if (req.method === 'GET') {
    res.writeHead(200, 'OK', { 'Content-Type': 'text/html' });
    console.log(req.url);
    var url = require('url').parse(req.url, true);

    if (req.url.startsWith("/api/cleardb")) {
      var context = url.query["context"];
      console.log("/cleardb:" + context);

      if (mongodb) {
        mongodb.removeAllFromDatabase(context, function (err, result) {
          logHttpResponse(res, err, result);
        });
      } else {
        logHttpResponse(res, "No database configured. Nothing cleaned!", null);
      }
    } else
      if (req.url.startsWith("/api/run")) {
        var context = url.query["context"];
        var start = new Date(url.query["start"]);
        var length = parseInt(url.query["length"]);
        var count = parseInt(url.query["count"]);
        var testRunIx = parseInt(url.query["testRunIx"]);
        var tags = JSON.parse(url.query["tags"]);
        var compareContext = url.query["comparecontext"];
        var specFile = url.query["perfspec"];
        // var specFile = "./perfspec.json";
        // start = new Date("2019-06-18T08:00:00+00:00");
        // length = 60000 * 10; // 10 Minutes
        // count = 6
        // testRunIx = 1
        // tags = ["environment:prod-keptnsample","service:simplenodeservice"];
        console.log("/api/run: " + specFile + ", " + start + ", " + length + ", " + count + ", " + testRunIx + ", " + JSON.stringify(tags) + ", " + compareContext);
        runPitometerTests(specFile, start, length, testRunIx, count, context, tags, compareContext, function (err, result) {
          logHttpResponse(res, err, result);
        });
      } else
        if (req.url.startsWith("/api/report")) {
          // context can either be a string, number of JSON object
          var context = url.query["context"];
          var reportquery = url.query["reportquery"];
          if(reportquery != null) {
            if(reportquery.startsWith("{")) {
              try {
                reportquery = JSON.parse(reportquery);
              }
              catch(error) {
                console.log("Invalid JSON passed: " + error);
                logHttpResponse(res, error, null);
                return;
              }
            } else {
              var intValue = parseInt(reportquery);
              if(!isNaN(intValue)) {
                reportquery = intValue;
              }  
            }
          } else {
            reportquery = 10; // default to last 10 results
          }

          console.log("/api/report: " + context + ", " + reportquery)

          testReport(context, reportquery, "report1", null, function (err, result) {
            logHttpResponse(res, err, result);
          });
        } else {
          var finalHtml = "";
          if (req.url.startsWith("/empty")) {
            // just return an empty html
            finalHtml = "<html></html>"
          }
          else {
            // replace buildnumber and background color
            indexhtml = fs.readFileSync('./resources/index.html').toString()
            finalHtml = indexhtml.replace("MONGODB", config.mongodb).replace("DYNATRACEURL", dynatraceSecrets.DynatraceUrl).replace("SELFURL", "http://localhost:" + config.port);
          }

          res.write(finalHtml);
          res.end();
        }
  }
});

// Listen on port 80, IP defaults to 127.0.0.1
if (!config.port) config.port = 8000;
server.listen(config.port);

// Put a friendly message on the terminal
console.log('Server running at http://127.0.0.1:' + config.port + '/');

// =========================================================================================
// Run one of the following scenarios by commenting them out
// make sure to have your mongodb and your secrets.json ready!
// =========================================================================================

// 1: Remove old data
// testDropData(context);

// 2: create new data for a certain timeframe
/*
start = new Date("2019-06-18T08:00:00+00:00");
length = 60000 * 10; // 10 Minutes
count = 6
runPitometerTests(start, length, 1, count, context, ["environment:prod-keptnsample","service:simplenodeservice"]);
*/

// 3: generate a test report
// testReport(context, null, "report1", "./report1.html");