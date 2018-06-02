const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.italic.gray('working dir: ' + path.resolve('./')));

const getJsonWsServer = require('./json-ws-server').getJsonWsServer;

const MESSAGE_TYPES = {
    CLIENT: {
        EXTEND_SUBSCRIPTION: 'extend-subscription'
    },
    SERVER: {
        ERROR: 'error',
        INFO: 'info',
        ANNOUNCE_CHANGE: 'announce-change',
        SUBSCRIBE_FEEDBACK: 'subscribe-feedback'
    }
}

// connection extension

function sendError(connection, message) {
    connection.send({
        type: "error",
        message: message
    });
    connection.error(message)
}

function sendSubscribeFeedback(connection, allSubscribedFiles, succededFiles, duplicateFiles, failedFiles) {
    connection.send({
        type: MESSAGE_TYPES.SERVER.SUBSCRIBE_FEEDBACK,
        allSubscribedFiles: allSubscribedFiles,
        succededFiles: succededFiles,
        duplicateFiles: duplicateFiles,
        failedFiles: failedFiles
    })
}

function sendAnnounceChange(connection, file) {
    connection.send({
        type: MESSAGE_TYPES.SERVER.ANNOUNCE_CHANGE,
        file: file
    })
    connection.info('announcing change of: ' + path.parse(file).base);
}

// function extendConnection(connection) {
//     connection.files = [];
//     connection.watcher = [];
//     connection.sendError = sendError.bind(connection);
//     connection.sendAnnounceChange = sendAnnounceChange.bind(connection);
//     connection.sendSubscribeFeedback = sendSubscribeFeedback.bind(connection);
// }

// 

function defaultFileListener(connection, filename, eventType) {
    sendAnnounceChange(connection, filename);
}

function extendSubscription(connection, request) {
    const files = request.files.map(p => path.resolve(p));

    const succFiles = [];
    const failedFiles = [];
    const dupFiles = [];

    for (const file of files)
        if (connection.files.indexOf(connection.files) == -1) {
            try {
                connection.watcher[connection.watcher.length] = fs.watch(file, {
                    persistent: false
                }, defaultFileListener.bind(undefined, connection, file))

                succFiles[succFiles.length] = file;
                connection.files[connection.files.length] = file;
            } catch (err) {
                if (err.code == 'ENOENT')
                    failedFiles[failedFiles.length] = file;
            }
        } else {
            dupFiles[dupFiles.length] = file;
        }

    sendSubscribeFeedback(connection, connection.files, succFiles, dupFiles, failedFiles);
}

// command map

const cmdMap = new Map();
cmdMap.set(MESSAGE_TYPES.CLIENT.EXTEND_SUBSCRIPTION, extendSubscription);

function onMessage(ev) {
    const connection = ev.connection;
    const request = ev.message;

    if (cmdMap.has(request.type))
        cmdMap.get(request.type)(connection, request);
    else {
        // connection.error('client requested message type "' + request.type + '" which is not registered');
        sendError(connection, 'message type "' + request.type + '" is unknown');
    }
}

function FileChangeAnnouncer(port) {
    port = parseInt(port) | 40255;

    getJsonWsServer(port)
        .then(observable => {
            observable.addEventListener('connect', (ev) => {
                ev.connection.files = [];
                ev.connection.watcher = [];

            });
            observable.addEventListener('message', onMessage);
            observable.addEventListener('disconnect', (ev) => {
                for (let w of ev.connection.watcher)
                    try {
                        w.close();
                    } catch (err) {}
            });
        })
}

module.exports = {
    FileChangeAnnouncer: FileChangeAnnouncer
}