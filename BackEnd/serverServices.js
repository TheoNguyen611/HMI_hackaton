/**
 * Some functions for the network connection
 * @author: Theo Nguyen
 */

/** node module **/
const WebSocket = require('ws');// the websocket for the connection with the frontend
const http = require('http');

/**
 * create the server for the application
 * @param app  the app which needs a server.
 * @param port  the local port for the communication
 * @returns {Server} The Server
 */

module.exports.createServer = function (app, port) {
    const server = http.createServer(app);
    server.listen(port, function listening() {
    });
    return server;
}


/**
 * Create the websocket for the connection to the frontend.
 * @param server The server of the app
 * @returns {WebSocket.Server} The websocket server
 */

module.exports.createWebSocket = function (server) {

    const wss = new WebSocket.Server({server: server});

    wss.broadcast = function broadcast(data) {
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    //console.log('sending data ' + data);
                    client.send(data);
                } catch (e) {
                    //console.error(e);
                }
            }
        });
    };
    return wss;
}


