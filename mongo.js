var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("PitometerDB");
  /*var myobj = { name: "Company Inc", address: "Highway 37" };
  dbo.collection("customers").insertOne(myobj, function(err, res) {
    if (err) throw err;
    console.log("1 document inserted");
    db.close();
  });*/

  dbo.collection("/keptn-sample/simplenodeservice/prod-keptnsample").find({}).toArray(function(err, result) {
    if (err) throw err;
    console.log(JSON.stringify(result));
    db.close();
  });
});