/*
 * //******************************************************************
 * //
 * // Copyright 2017 Samsung Electronics All Rights Reserved.
 * //
 * //-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 * //
 * // Licensed under the Apache License, Version 2.0 (the "License");
 * // you may not use this file except in compliance with the License.
 * // You may obtain a copy of the License at
 * //
 * //      http://www.apache.org/licenses/LICENSE-2.0
 * //
 * // Unless required by applicable law or agreed to in writing, software
 * // distributed under the License is distributed on an "AS IS" BASIS,
 * // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * // See the License for the specific language governing permissions and
 * // limitations under the License.
 * //
 * //-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 */
const coap = require('../CoapWebsocketCodec').coap;
const parse = require('../CoapWebsocketCodec').parse;
const path = require('../CoapWebsocketCodec').path;
var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();

var readline = require('readline');
var r = readline.createInterface({
	input : process.stdin,
	output : process.stdout
});

var arg = new Array();
var deviceId = "ac59e41e-4444-bfd0-9292-20a95af72863";

process.argv.forEach(function(val, index, array) {
	arg[index] = val;
});

client.on('connectFailed', function(error) {
	console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
	console.log('WebSocket Client Connected');

	connection.on('error', function(error) {
		console.log("Connection Error: " + error.toString());
	});
	connection.on('close', function() {
		console.log('echo-protocol Connection Closed');
	});
	connection.on('message', function(message) {
		if (message.type != 'binary')
			console.log("message type is not binary!!");

		var packet = parse(message.binaryData);

		// console.log();
		// console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
		// console.log('received Token : ' + packet.getToken);
		console.log('received uriPath : ' + packet.getUriPath);
		// console.log('received UriQuery : ' + packet.getUriQuery);
		console.log('received payload : ' + packet.getPayloadString);
		// console.log('received getMethod : ' + packet.getMethod);
		// console.log('received getCode : ' + packet.getCode);
		console.log('received getSequenceNumber : ' + packet.getSequenceNumber);
		// console.log();

		if (packet.getCode < 70) {
			switch(packet.getUriPath) {
			case path.ACCOUNT_FULL_URI:
				console.log('STEP 2 : Sign in');
				var payload = {
					di : deviceId,
					uid : packet.getPayloadObject.uid,
					accesstoken : packet.getPayloadObject.accesstoken,
					login : true
				};
				connection.sendBytes(signIn(payload));
				break;

			case path.ACCOUNT_SESSION_FULL_URI:
				console.log('STEP 3 : findResource rt');

				connection.sendBytes(findResource(null));
			//61646d69-6e44-6576-6963-234231423441 2aaad9a5-a034-62e7-9d39-efd7ec9203d9  ac59e41e-cf97-bfd0-9292-20a95af72863
			case path.RD_FULL_URI:
				break;

			case path.WELL_KNOWN_FULL_URI:
				if (packet.getPayloadObject[0].links.length == 1) {
				} else {
					console.log('STEP 4 : Send Observe Presence');
					connection.sendBytes(observePresence('di=' + packet.getPayloadObject[0].di));

					console.log('STEP 5-1 : Send GET Message');
					connection.sendBytes(getMessage(packet.getPayloadObject[0].links[2].href, 'if=' + packet.getPayloadObject[0].links[2].if[2]));
					//+ ';rt=' + packet.getPayloadObject[0].links[2].rt[0], null));

				}
				break;

			case path.DEVICE_PRESENCE_FULL_URI:
				console.log('response for DEVICE_PRESENCE_FULL_URI');
				break;
			}

			if (packet.getUriPath.indexOf(path.ROUTE_FULL_URI) > -1) {
				if (packet.getUriPath.indexOf('aircon') > -1) {
					connection.sendBytes(observeMessage(packet.getPayloadObject[1].href, 'if=' + packet.getPayloadObject[1].if[0] + ';rt=' + packet.getPayloadObject[1].rt[0], null));
				} else {
					console.log("power value : " + packet.getPayloadObject.value);
				}
			}
		} else {
			console.log("error : " + packet.getMethod);
		}
	});

	function sendCoapPacketforSignUpIn() {
		if (connection.connected) {
			var count = process.argv.length;
			switch(count) {
			case 4:
				console.log('STEP 1 : sign Up');
				var payload = {
					di : deviceId,
					authprovider : "github",
					authcode : arg[3],
					devicetype : "device"
				};
				connection.sendBytes(signUp(payload));
				break;
			case 5:
				console.log('STEP 2 : Sign in');
				var payload = {
					di : deviceId,
					uid : arg[3],
					accesstoken : arg[4],
					login : true
				};
				connection.sendBytes(signIn(payload));
				break;
			default:
				console.log("argument is not valid!!");
				break;
			}
		}
	}

	sendCoapPacketforSignUpIn();
});

function signUp(payload) {
	return postMessage(path.ACCOUNT_FULL_URI, null, payload);
}

function signIn(payload) {
	return postMessage(path.ACCOUNT_SESSION_FULL_URI, null, payload);
}

function findResource(uriQury) {
	return getMessage(path.WELL_KNOWN_FULL_URI, uriQury, null);
}

function publishResource(uriQury, payload) {
	return postMessage(path.RD_FULL_URI, uriQury, payload);
}

function observePresence(uriQury) {
	return observeMessage(path.DEVICE_PRESENCE_FULL_URI, uriQury, null);
}

function postMessage(uriPath, uriQury, payload) {
	return coap.createRequest("POST", uriPath, uriQury, payload);
}

function getMessage(uriPath, uriQury, payload) {
	return coap.createRequest("GET", uriPath, uriQury, payload);
}

function observeMessage(uriPath, uriQury, payload) {
	return coap.createRequest("GET OBSERVE", uriPath, uriQury, payload);
};

function observeCancelMessage(token, uriPath, uriQury, payload) {
	return coap.createTokenRequest(token, "GET OBSERVE CANCEL", uriPath, uriQury, payload);
};

//client.connect('ws://52.78.151.180:8080/.well-known/coap', 'coap');
client.connect('ws://' + arg[2] + '/.well-known/coap', 'coap');
