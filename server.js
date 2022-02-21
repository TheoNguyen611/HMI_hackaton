/*eslint-env node*/
/**
 * MAIN BACKEND FUNCTION
 * This function creates the server and bind it to the app.
 * It creates all communication protocol (web socket and UDP)
 * It is used as a relay between the front end and the java app.
 * --> Whenever a message is received on the websocket from the frontEnd,
 * it forwards it to the server java app through UDP protocol on the  JAVA_PORT
 * --> Whenever a message is received on the JAVA_PORT , it forwards it to the frontend via
 * the websocket.
 * --> At the first connection, it calls the functions to parse the output directory of the  java app
 * and send to the front end the list of the constellations availaible.
 * @author: Theo Nguyen
 */
(function () {
    'use strict';

    //////////////////////////////////////////////////////////////////////////
    //Load useful modules
    //////////////////////////////////////////////////////////////////////////
    const serverServices = require('./BackEnd/serverServices');
    const config = require('./BackEnd/config');
    var express = require('express');
    var compression = require('compression');
    var url = require('url');
    var request = require('request');
    var dgram = require('dgram');// for udp connection
    var parseOutput = require('./BackEnd/parseOutput');
    //////////////////////////////////////////////////////////////////////////
    //Launch configuration
    //////////////////////////////////////////////////////////////////////////
    var yargs = require('yargs').options({
        'port': {
            'default': config.WS_PORT,
            'description': 'Port to listen on.'
        },
        'public': {
            'type': 'boolean',
            'description': 'Run a public server that listens on all interfaces.'
        },
        'upstream-proxy': {
            'description': 'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:8000".'
        },
        'bypass-upstream-proxy-hosts': {
            'description': 'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"'
        },
        'help': {
            'alias': 'h',
            'type': 'boolean',
            'description': 'Show this help.'
        }
    });

    var argv = yargs.argv;

    if (argv.help) {
        return yargs.showHelp();
    }

    // eventually this mime type configuration will need to change
    // https://github.com/visionmedia/send/commit/d2cb54658ce65948b0ed6e5fb5de69d022bef941
    // *NOTE* Any changes you make here must be mirrored in web.config.
    var mime = express.static.mime;
    mime.define({
        'application/json': ['czml', 'json', 'geojson', 'topojson'],
        'image/crn': ['crn'],
        'image/ktx': ['ktx'],
        'model/gltf+json': ['gltf'],
        'model/gltf.binary': ['bgltf', 'glb'],
        'text/plain': ['glsl']
    });

    //////////////////////////////////////////////////////////////////////////
    //APP BINDING
    //////////////////////////////////////////////////////////////////////////

    var app = express();
    app.use(compression());
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    app.use(express.static(__dirname));

    function getRemoteUrlFromParam(req) {
        var remoteUrl = req.params[0];
        if (remoteUrl) {
            // add http:// to the URL if no protocol is present
            if (!/^https?:\/\//.test(remoteUrl)) {
                remoteUrl = 'http://' + remoteUrl;
            }
            remoteUrl = url.parse(remoteUrl);
            // copy query string
            remoteUrl.search = url.parse(req.url).search;
        }
        return remoteUrl;
    }

    var dontProxyHeaderRegex = /^(?:Host|Proxy-Connection|Connection|Keep-Alive|Transfer-Encoding|TE|Trailer|Proxy-Authorization|Proxy-Authenticate|Upgrade)$/i;

    function filterHeaders(req, headers) {
        var result = {};
        // filter out headers that are listed in the regex above

        Object.keys(headers).forEach(function (name) {

            if (!dontProxyHeaderRegex.test(name)) {
                result[name] = headers[name];
            }
        });
        return result;
    }

    var upstreamProxy = argv['upstream-proxy'];
    var bypassUpstreamProxyHosts = {};
    if (argv['bypass-upstream-proxy-hosts']) {

        argv['bypass-upstream-proxy-hosts'].split(',').forEach(function (host) {

            bypassUpstreamProxyHosts[host.toLowerCase()] = true;
        });
    }


    app.get('/proxy/*', function (req, res, next) {

        // look for request like http://localhost:8080/proxy/http://example.com/file?query=1
        var remoteUrl = getRemoteUrlFromParam(req);
        if (!remoteUrl) {
            // look for request like http://localhost:8080/proxy/?http%3A%2F%2Fexample.com%2Ffile%3Fquery%3D1
            remoteUrl = Object.keys(req.query)[0];
            if (remoteUrl) {
                remoteUrl = url.parse(remoteUrl);
            }
        }

        if (!remoteUrl) {
            return res.status(400).send('No url specified.');
        }

        if (!remoteUrl.protocol) {
            remoteUrl.protocol = 'http:';
        }

        var proxy;
        if (upstreamProxy && !(remoteUrl.host in bypassUpstreamProxyHosts)) {
            proxy = upstreamProxy;
        }

        // encoding : null means "body" passed to the callback will be raw bytes

        request.get({

            url: url.format(remoteUrl),
            headers: filterHeaders(req, req.headers),
            encoding: null,
            proxy: proxy
        }, function (error, response, body) {

            var code = 500;

            if (response) {
                code = response.statusCode;
                res.header(filterHeaders(req, response.headers));
            }

            res.status(code).send(body);
        });
    });

    //////////////////////////////////////////////////////////////////////////
    //SERVER
    //////////////////////////////////////////////////////////////////////////

    //create the server on the chosen port

    var server = app.listen(argv.port, argv.public ? undefined : 'localhost', function () {

        if (argv.public) {
            console.log('Cesium development server running publicly.  Connect to http://localhost:%d/', server.address().port);
        } else {
            console.log('Cesium development server running locally.  Connect to http://localhost:%d/', server.address().port);
        }
    });

    //error detection
    server.on('error', function (e) {
        //port already used
        if (e.code === 'EADDRINUSE') {
            console.log('Error: Port %d is already in use, select a different port.', argv.port);
            console.log('Example: node server.js --port %d', argv.port + 1);
        }
        //access denial
        else if (e.code === 'EACCES') {
            console.log('Error: This process does not have permission to listen on port %d.', argv.port);
            if (argv.port < 1024) {
                console.log('Try a port number higher than 1024.');
            }
        }
        console.log(e);
        process.exit(1);
    });

    //close the server
    server.on('close', function () {

        console.log('Cesium development server stopped.');
    });

    //force to kill
    var isFirstSig = true;

    process.on('SIGINT', function () {
        if (isFirstSig) {
            console.log('Cesium development server shutting down.');
            server.close(function () {
                process.exit(0);

            });
            isFirstSig = false;
        } else {
            console.log('Cesium development server force kill.');
            process.exit(1);
        }
    });

    //////////////////////////////////////////////////////////////////////////
    //WEBSOCKET COMMUNICATION
    //////////////////////////////////////////////////////////////////////////

    //UDP port and client to connect to the Java app


    //client to receive data from java
    var udpClient_JAVA_TO_JS = dgram.createSocket('udp4');
    udpClient_JAVA_TO_JS.bind(config.JAVA_TO_JS_PORT);

    // client to send data to java
    var udpClient_JS_TO_JAVA = dgram.createSocket('udp4');
    //udpClient_JS_TO_JAVA.bind(config.JS_TO_JAVA);


    // websocket object to connect to to the frontend
    const wss = serverServices.createWebSocket(server);

    // each time the client frontend connects to the WS, this function is called.

    wss.on('connection', function (ws) {
        //send a simple response to the connection
        try {
            ws.send(JSON.stringify({"request": "firstConnection"}));

            //parse the existing constellations in the output file and send it to the front.
            parseOutput.createJsonFromOutputFiles(config.OUTPUT_PATH, ws);


        } catch (e) {

            console.log('send first connection failed' + e);
        }

        //forward a message  to the front end through the websocket when a message is received from java

        udpClient_JAVA_TO_JS.on('message', function (msg, rinfo) {
            try {

                var data = JSON.parse(msg);
                ws.send(JSON.stringify(data));
                console.log("\n\n **** message received from java app.**** \n Type of the request: " + data.request + '\n\n');
            } catch (e) {

                console.log('//////////--------FAILED TO RECEIVE DATA FROM JAVA APP--------//////////\n' + e);
            }

        });


        //listening to a message from the frontend and forward it to the java app server
        ws.on('message', function (msg) {
            console.log(msg);
            var data = JSON.parse(msg);
            msg = JSON.stringify(data);
            udpClient_JS_TO_JAVA.send(msg, 0, msg.length, config.JS_TO_JAVA_PORT, config.HOST, function (err, bytes) {
                if (err) throw err;
                console.log('UDP message sent to ' + config.HOST + ':' + config.JS_TO_JAVA_PORT);
                console.log('**** message sent to java app ****\n Type of the request: ' + data.request + '\n\n');
            });


            ws.on('error', function () {
                ws.close();
            });
        })

    });

})();
