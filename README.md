# pitometer-ui
This is a standalone version of Pitometer that hosts Pitometer as a service, stores its result in a mongodb and provides an API and a simple WebUI to trigger the following actions
* Clear the Test Results in the Database
* Run 1 or multiple Pitometer evaluations based on a spec file
* Display the results of 1 or more results in a chart

## How to run
1. Clone this repository
2. Create a secrets.json (for dynatrace url & token) & config.json (port and mongo reference) as shown below
3. Have a mongodb ready, e.g: using docker as described [here](https://www.thachmai.info/2015/04/30/running-mongodb-container/)
4. Then execute the following in your command shell
```
npm install
npx tcs
node index.js
```
5. open your browers to http://localhost:YOURPORT


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