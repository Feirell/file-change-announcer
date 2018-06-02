const fs = require('fs');
const http = require('http');

const chalk = require('chalk');
const makeDomLikeObservable = require('dom-like-observable');

const WebSocketServer = require('websocket').server;
const WebSocketConnection = require('websocket').connection;

const JSONWsConnection = require('./json-ws-connection');

const assembledObject = {};

const recScriptPath = __dirname + '/receiver-client-script.js';

function getJsonWsServer(port) {
    return new Promise((res, rej) => {
            fs.readFile(recScriptPath, 'utf8', (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res(data);
                }
            })
        })
        .then(data => {
            assembledObject.observable = makeDomLikeObservable({}, ['message', 'connect', 'disconnect']);
            assembledObject.webserver = startWebServer(data, port);
            assembledObject.webSocketServer = startWebSocketServer(assembledObject.webserver);
            return assembledObject;
        })
        .then(assembledObject => {
            return assembledObject.observable;
        })
}

function startWebServer(recieverScript, port) {
    port = parseInt(port);

    const header = {
        'Content-Type': 'text/javascript',
        'Content-Length': Buffer.byteLength(recieverScript)
    };

    const server = http.createServer((req, res) => {
        if (req.url == "/") {
            res.writeHead(200, header);
            res.write(recieverScript, 'utf8');
        } else {
            res.writeHead(404);
        }
        res.end();
    })

    server.listen(port);
    process.on('exit', () => server.close())

    console.log(chalk.green("[Web Server]") + " startet web server on " + port);
    return server;
}

function onOpen(jsonWsConnection) {
    jsonWsConnection.log("got a new connection");

    assembledObject.observable.dispatchEvent('connect', {
        connection: jsonWsConnection
    });

    jsonWsConnection.dispatchEvent('connect', {});
}

function onMessage(jsonWsConnection, parsedMessage) {
    // jsonWsConnection.info("got a message");

    assembledObject.observable.dispatchEvent('message', {
        connection: jsonWsConnection,
        message: parsedMessage
    });

    jsonWsConnection.dispatchEvent('message', {
        message: parsedMessage
    });
}

function onClose(jsonWsConnection) {
    jsonWsConnection.log("connection closed");

    assembledObject.observable.dispatchEvent('disconnect', {
        connection: jsonWsConnection
    });

    jsonWsConnection.dispatchEvent('disconnect', {});
}

function onRequestAccepted(connection) {
    const jsonWsConnection = connection.jsonWsConnection = new JSONWsConnection(connection);
    onOpen(jsonWsConnection);

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            let parsedMessage;
            try {
                parsedMessage = JSON.parse(message.utf8Data);
            } catch (err) {
                jsonWsConnection.error("recieved text frame which was not valid json, rejected frame");
            }

            if (parsedMessage)
                onMessage(jsonWsConnection, parsedMessage);

        } else if (message.type === 'binary') {
            jsonWsConnection.error("got a binary frame");
        } else
            throw new Error('got a frame which was neither of type binary nor utf8');
    });

    connection.on('close', function (reasonCode, description) {
        onClose(jsonWsConnection);
    });
}

function onRequestRejected() {
    console.error(chalk.red('[WebSocket Server]') + " rejected websocket connection request");
}

function startWebSocketServer(httpServer) {

    const webSocketServer = new WebSocketServer({
        httpServer: httpServer,
        // You should not use autoAcceptConnections for production
        // applications, as it defeats all standard cross-origin protection
        // facilities built into the protocol and the browser.  You should
        // *always* verify the connection's origin and decide whether or not
        // to accept it.
        autoAcceptConnections: false
    });

    console.log(chalk.green('[WebSocket Server]') + " startet WebSocket server");

    process.on('exit', () => webSocketServer.shutDown());

    webSocketServer.on('request', function (request) {
        request.on('requestAccepted', onRequestAccepted);
        request.on('requestRejected', onRequestRejected);

        // "null" == file://
        if (request.origin != "http://localhost" && request.origin != "http://127.0.0.1" && request.origin !== "null") {
            request.reject();
        } else {
            request.accept('file-change-announce-protocol', request.origin)
        }
    });

    return webSocketServer;
}

module.exports = {
    getJsonWsServer: getJsonWsServer,
}