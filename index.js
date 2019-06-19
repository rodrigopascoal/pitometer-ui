const Pitometer = require("../pitometer").Pitometer;
const DynatraceSource = require("../pitometer-source-dynatrace").Source;
const ThresholdGrader = require("../pitometer-grader-thresholds").Grader;
const MongoDbAccess = require("../pitometer").MongoDbAccess;
const Reporter = require("../pitometer").Reporter;
const fs = require('fs');


// TODO: define your secrets in secrets.json
const dynatraceSecrets = require("./secrets.json");

// 1: Create Pitometer and add MongoDB Data Store
const pitometer = new Pitometer();
const mongodb = new MongoDbAccess(pitometer, "mongodb://localhost:27017/");
pitometer.setDatastore(mongodb);

// 2: Add Dynatrace Data Source
pitometer.addSource(
  "Dynatrace",
  new DynatraceSource({
    baseUrl: dynatraceSecrets.DynatraceUrl,
    apiToken: dynatraceSecrets.DynatraceToken
    // log: console.log,
  })
);

// 3: Add Threshold Grader
pitometer.addGrader("Threshold", new ThresholdGrader());

// 4: Create the Options object
function S4() {
  return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}

function getOptions(start, end, context, runId, compareContext, individualResults) {
  return {
    context: context + "/" + runId,
    compareContext : compareContext, // "keptn-project-1/keptn-service-1/stageabc/" + keptn_context_guid,
    individualResults : individualResults,
    timeStart: +start / 1000,
    timeEnd: +end / 1000,
  }
}

keptn_context_guid = (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
var end = new Date();
var start = new Date(new Date().setDate(new Date().getDate() - 2));

keptn_context_guid = "85c4dee1-663d-42c0-b78a-044a1ead4eff";
start = new Date("2019-06-18T10:50:29+00:00");
end = new Date("2019-06-18T11:00:29+00:00");


function testDropData(context) {
  mongodb.removeAllFromDatabase(context, function(err,result) {
    console.log("remove all from database: " + result);
  });
}

// 5: Run Pitomter and pull in data -> plus: store to Mongo
/**
 * 
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
 * @param {*} reportId 
 * @param {*} outputfile if specified the output will be written to this file
 * @param {*} callback function(err, outputstring): will be called with the output string as param
 */
function testReport(context, reportId, outputfile, callback) {
  var options = getOptions(null, null, context, "dummy", 5, true);

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
    if(outputfile) {
      fs.writeFileSync(outputfile, outputString);
    }

    if(callback) {
      callback(null, outputString);
    }
  }
  )
  .catch(err => callback(err, null));
}

/**
 * 
 * @param {*} startTime date object from when we start
 * @param {*} length time length in milliseconds
 * @param {*} count how many iterations
 * @param {*} context 
 */
async function runPitometerTests(startTime, length, from, to, context, tags) {
  if(from == to) return;

  var endTime = new Date(startTime.getTime() + length);

  // compareContext for last successful run
  compareContext = { find : {result : "pass"}, sort : {timestamp : -1}, limit : 1}
  var options = getOptions(startTime, endTime, context, "testrun_" + from, compareContext, true);

  // run it for the current timeframe!
  testRun("./perfspec.json", tags, options).then(result => {
    console.log("run done:" + from + JSON.stringify(result));

    // move start time
    startTime = endTime;
    runPitometerTests(startTime, length, from+1, to, context, tags);
  });
}

// Context for Pitometer -> this is the mongo collection data ends up
const context = "/keptn-sample/simplenodeservice/prod-keptnsample";

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
// testReport(context, "report1", "./report1.html");