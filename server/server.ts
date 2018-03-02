import * as express from 'express';
import * as ws from 'express-ws';
import * as luis from './luis';

function insertPhrase(db, startTime, duration, phrase: string | undefined) {
	var text = "";
	if (phrase !=undefined) {
		text = phrase;
	}
	db.collection('interviews').insertOne( {
		"id": "testInterview",
		"startTime": startTime,
		"duration": duration,
		"phrase": text
	}).then(function(result) {
		console.log("Inserted a phrase in the phrase collection");
	}).catch(function(err) {
		console.log("Could not insert record");
	});
		
}

function sendTextToLUIS(text: string | undefined) {
	let response: string;
	response = "";
	if (text != undefined) {
		response = luis.getLuisIntent(text);
	}
	return response;
}
function generateGUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}


const app = express();
const expressWs = ws(app);

app.use(express.static(__dirname + '/..'));

app.ws('/interviewer', (ws, req) => {
	var mongoClient = require("mongodb").MongoClient;
	var password = encodeURIComponent("RFtVpFkJ3uR4MTptTTrIvOtHKLOVSRhxSqD51mEMvUnbL3FxHSRtEkqoRAQZ3i3iDpV3qDkOlf3G4rVI5a9jBw==");
	mongoClient.connect("mongodb://interviewtranscript:" + password + "@interviewtranscript.documents.azure.com:10255/?ssl=true")
	.then(function (database) {
		var db = database.db('interviewtranscript');
		console.log("db connection opened");
		let duration: number | undefined = undefined;
		let text: string | undefined = undefined;
		let startTimeText: string | undefined = undefined;
		ws.on('message', async msg => {
				const parsedMsg = JSON.parse(msg);
				duration = parsedMsg.duration;
				startTimeText = parsedMsg.startTimeText;
				text = parsedMsg.text;
				//Send message to LUIS service
				const response = sendTextToLUIS(text);
				console.log("received " + response.toString());
				//const msg1 = "Hello. You asked a leading question: " + text;
				insertPhrase(db, startTimeText, duration, text);
				if (response != "") {
					console.log(response);
					ws.send(JSON.stringify(response));
				}
				});
	})
	.catch(function (err) {
		console.log("Database connection was not created properly");
		console.log("error opening", err);
	});
});

app.ws('/handshake', (ws, req) =>{
	const id = generateGUID();
	app.ws('/' + id, (ws, req) =>{
		ws.on('message', function(t){
			var aWss = expressWs.getWss('/' + id);
			const data = JSON.parse(t);
			console.log(data);
			if(!data.interviewer){
				aWss.clients.forEach(function (c) {
					console.log("hi:" + t);
					ws.send(t);
				});
			}
		});
	});
	ws.send(id);
});

app.ws('/interviewee', (ws, req) =>{

});

app.listen(8080, () => {
	console.log('Web server running in http://localhost:8080');
});