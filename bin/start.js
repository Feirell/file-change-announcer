#!/usr/bin/env node

const FileChangeAnnouncer = require('../lib/file-change-announce-server.js').FileChangeAnnouncer;


function start(port) {
    new FileChangeAnnouncer(port);
}

start(40255);