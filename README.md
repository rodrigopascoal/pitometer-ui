# pitometer-test
WORK IN PROGRESS. Plan is to merge this into the keptn project!

## How to run
* also clone pitometer, pitometer-grader-thresholds, pitometer-source-dynatrace from my grabnerandi repositories
* compile all these projects in their directories with npx tsc
* create a secrets.json (for dynatrace url & token) & config.json (port and mongo reference)
* have a mongodb ready, e.g: using docker as described [here](https://www.thachmai.info/2015/04/30/running-mongodb-container/|here)
* then run node index.js from this repo
* open your browers to http://localhost:YOURPORT

## Necessary Config files
You need to create the following config files
```javascript
secrects.json:
{
    "DynatraceToken" : "YOUR_TOKEN",
    "DynatraceUrl" : "https://XXXXX.live.dynatrace.com"
}

config.json:
{
    "port" : 8000,
    "mongodb" : "mongodb://MONGOSERVER:MONGOPORT/"    
}
```