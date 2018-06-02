(function () {
    {
        const logColor = {
            error: {
                fontIdentifier: "red",
                font: null
            }
        }

        const base = ["%c[%cReloader%c]%c ", "", "", "", ""];

        function logger(level) {
            const colorSet = logColor[level] || {};
            base[1] = base[3] = "color:" + (colorSet.bracket || "grey");
            base[2] = "color:" + (colorSet.fontIdentifier || "white");
            base[4] = "color:" + (colorSet.font || "unset");

            const args = base.concat(Array.prototype.slice.call(arguments, 2));

            if (typeof arguments[1] == 'string')
                args[0] += arguments[1];

            console[level].apply(console, args);
        }
    }

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

    const info = logger.bind(undefined, 'info');
    const error = logger.bind(undefined, 'error');
    const log = logger.bind(undefined, 'log');
    const warn = logger.bind(undefined, 'warn');
    const debug = logger.bind(undefined, 'debug');

    const scriptsource = (function () {
        if (document.currentScript) {
            const a = document.createElement('a');
            a.href = document.currentScript.src;
            return a.href;
        } else
            throw new Error('[Reloader] can not access the document.currentScript for configuration')
    })();

    let filesToWatch = [];
    let newFilesToWatch = [];

    let unloading = false;
    let connection;

    window.autoreloader = {
        subscribe: (files) => {
            newFilesToWatch = newFilesToWatch.concat(files);
            updateFilesToWatch()

        }
    }

    let unloadhandler = function () {};
    addEventListener('unload', unloadhandler)

    function tryToConnect(loop) {
        // log('trying to connect')
        loop = loop != false;

        connection = new WebSocket(scriptsource.replace('http', 'ws'), "file-change-announce-protocol");

        const onOpen = (ev) => {
            detach();
            unloadhandler = function () {
                connection.close();
            }
            // log('connection succeeded')
            openHandler(ev);

            connection.addEventListener('open', openHandler);
            connection.addEventListener('message', messageHandler);
            connection.addEventListener('error', errorHandler);
            connection.addEventListener('close', closeHandler);
        }

        const onClose = () => {
            detach();
            // log('connection failed');
            if (loop)
                setTimeout(tryToConnect.bind(undefined, loop), 1000);
        }

        const detach = () => {
            connection.removeEventListener('open', onOpen);
            connection.removeEventListener('close', onClose);
        }

        connection.addEventListener('open', onOpen);
        connection.addEventListener('close', onClose);
    }

    function updateFilesToWatch() {
        if (connection.readyState == 1) {
            filesToWatch = filesToWatch.concat(newFilesToWatch);
            newFilesToWatch = [];
            connection.send(JSON.stringify({
                type: MESSAGE_TYPES.CLIENT.EXTEND_SUBSCRIPTION,
                files: filesToWatch
            }))
        }
    }

    function openHandler(ev) {
        debug('connection established')
        updateFilesToWatch();
    }

    function closeHandler(ev) {
        debug('the connection was closed')
        newFilesToWatch = newFilesToWatch.concat(filesToWatch);
        filesToWatch = [];

        tryToConnect(true);
    }

    function errorHandler(ev) {
        // error("there was an error");
    }

    function messageHandler(ev) {
        let msg;

        try {
            msg = JSON.parse(ev.data);
        } catch (err) {
            error('was not able to parse response from server');
        }

        if (msg) {
            if (msg.type == MESSAGE_TYPES.SERVER.ANNOUNCE_CHANGE) {
                info('reloading the page because of' + msg.file);
                location.reload(true);
            } else if (msg.type == MESSAGE_TYPES.SERVER.SUBSCRIBE_FEEDBACK) {
                msg.allSubscribedFiles.length;
                let params = ['currently subscribed to %i file' + (msg.allSubscribedFiles.length > 1 ? 's' : ''), msg.allSubscribedFiles.length];

                if (msg.succededFiles.length > 0) {
                    params[0] += '\n  %2i file' + (msg.succededFiles.length > 1 ? 's' : '') + ' added';
                    params[params.length] = msg.succededFiles.length;
                }

                if (msg.duplicateFiles.length > 0) {
                    params[0] += '\n  %2i file' + (msg.duplicateFiles.length > 1 ? 's' : '') + ' duplicated:';
                    params[0] += '\n  %o';
                    params[params.length] = msg.duplicateFiles.length;
                    params[params.length] = msg.duplicateFiles;
                }

                if (msg.failedFiles.length > 0) {
                    params[0] += '\n  %2i file' + (msg.failedFiles.length > 1 ? 's' : '') + ' could not be watched:';
                    params[0] += '\n  %o';
                    params[params.length] = msg.failedFiles.length;
                    params[params.length] = msg.failedFiles;
                }

                debug.apply(undefined, params);
            } else
                warn('recieved a unexpected message ', msg);
        }
    }

    tryToConnect(true);
})()