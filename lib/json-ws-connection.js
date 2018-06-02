const chalk = require('chalk');
const makeDomLikeObservable = require('dom-like-observable');

let connectionCounter = 0;

const logColor = {
    info: "gray",
    error: "red",
    log: "green",
    warn: "yellow"
}

function wsLogger(id, level, message) {
    if (level != "info" && level != "error" && level != "log" && level != "warn")
        throw new Error("the log level needs one of the log levels ['info','error','log','warn']");

    const prefixString = chalk[logColor[level]]("[WebSocket Server]");
    const conIdStr = (typeof id == "number" ? " " + chalk.gray("[" + (("" + id).padStart(3, '0')) + "]") : "");
    console[level](prefixString + conIdStr + " " + message);
}

function JSONWsConnection(wsConnection) {
    Object.defineProperties(this, {
        id: {
            value: ++connectionCounter
        },
        connection: {
            value: wsConnection
        }
    })

    /**
     * Those events will be invoked by the handling ws server (server-instances.js)
     */
    makeDomLikeObservable(this, ['message', 'connect', 'disconnect']);
}

JSONWsConnection.prototype.send = function send(obj) {
    this.connection.sendUTF(JSON.stringify(obj));
};

JSONWsConnection.prototype.log = function log() {
    wsLogger(connectionCounter, 'log', ...arguments);
};
JSONWsConnection.prototype.error = function error() {
    wsLogger(connectionCounter, 'error', ...arguments);
};
JSONWsConnection.prototype.info = function info() {
    wsLogger(connectionCounter, 'info', ...arguments);
};
JSONWsConnection.prototype.warn = function warn() {
    wsLogger(connectionCounter, 'warn', ...arguments);
};

module.exports = JSONWsConnection;