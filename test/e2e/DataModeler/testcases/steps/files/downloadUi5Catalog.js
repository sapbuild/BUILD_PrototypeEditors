'use strict';

var Url = require('url');
var request = require('request');
require('../../../../../node_modules/node-sap-promise');
var htmlparser = require('../../../../../node_modules/htmlparser');
var _ = require('norman-server-tp').lodash;
var fs = require('fs');
var path = require('path');
var AppServer = require('node-sap-app-server');
var db = require('norman-common-server').db;
var mongoose = db.mongoose;
var commonServer = require('norman-common-server');
var registry = commonServer.registry;
var logger = commonServer.logging.createLogger('downloadUI5Catalog');

var INIT_TIMEOUT = 4800;

var configFile = path.join(__dirname, 'ui5config.json');


var config = commonServer.config.initialize(configFile);

var nexusUrl = '',
    libVersion = '',
    libraryType = '',
    lastVersion,
    fileZip,
    file,
    server, intSchema = false;

function requestData(options) {
    return new Promise(function (resolve, reject) {
        var requestOptions = {};
        requestOptions.url = options.protocol + '//' + options.hostname + ':' + options.port + options.path;
        if (options.protocol.toLowerCase().indexOf('https') >= 0) {
            requestOptions.agentOptions = options.agentOptions;
        }
        requestOptions.headers = options.headers;
        requestOptions.auth = options.auth;
        if (options.qs) {
            requestOptions.qs = options.qs;
            requestOptions.useQuerystring = true;
        }
        request(requestOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                resolve(body);
            }
            else {
                if (response) {
                    console.log('response.statusCode = ' + response.statusCode);
                    reject('Http status ' + response.statusCode);
                }
                else {
                    console.log('Http request failed');
                    reject('Http request failed');
                }
            }
        });

    });
}

// Command line management
var k, n;
for (k = 2, n = process.argv.length; k < n; ++k) {
    if ((process.argv[k] === '--config') && (k < n - 1)) {
        config = process.argv[k + 1];
    }
}

// MAIN
server = new AppServer.Server(config);
server.start()
    .then(function () {
        var urlParser = Url.parse(nexusUrl);

        var queryParameters = urlParser.query;

        var options = {
            protocol: urlParser.protocol,
            hostname: urlParser.hostname,
            port: urlParser.port,
            path: urlParser.path,
            qs: queryParameters,
            useQuerystring: queryParameters ? true : false,
            headers: {
                'Content-Type': 'application/xhtml+xml,application/xml'
            },
            method: 'GET'
        };

        requestData(options)
            .then(function (res) {
                try {
                    var handler = new htmlparser.DefaultHandler(function (error, dom) {
                        var resourceURIs = htmlparser.DomUtils.getElementsByTagName('resourceURI', dom);

                        resourceURIs.some(function (resourceURI) {
                            var url = resourceURI.children[0].data;
                            if (!lastVersion && _.endsWith(url, '-opt-static.zip')) {
                                lastVersion = url;
                                console.log('last version: ' + lastVersion + '\n');
                            }
                        });
                    }, {verbose: false, ignoreWhitespace: true});
                    var parser = new htmlparser.Parser(handler);
                    parser.parseComplete(res);
                    if (!lastVersion || 0 === lastVersion.length) {
                        throw new Error('Error : latest revision not found');
                    }
                    var urlParser = Url.parse(lastVersion);
                    var queryParameters = urlParser.query;

                    var options = {
                        protocol: urlParser.protocol,
                        hostname: urlParser.hostname,
                        port: urlParser.port,
                        path: urlParser.path,
                        qs: queryParameters,
                        useQuerystring: queryParameters ? true : false,
                        headers: {
                            'Content-Type': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                        },
                        method: 'GET'
                    };

                    var fileName = urlParser.path.substr(urlParser.path.lastIndexOf('/') + 1);
                    fileZip = path.join(__dirname, fileName);

                    console.log('file: ' + fileZip + '\n');

                    if (fs.existsSync(fileZip)) {
                        throw new Error('Error : a zip file is already existing');
                    }
                    else {
                        var requestOptions = {};
                        requestOptions.url = options.protocol + '//' + options.hostname + ':' + options.port + options.path;
                        if (options.protocol.toLowerCase().indexOf('https') >= 0) {
                            requestOptions.agentOptions = options.agentOptions;
                        }
                        requestOptions.headers = options.headers;
                        requestOptions.auth = options.auth;
                        if (options.qs) {
                            requestOptions.qs = options.qs;
                            requestOptions.useQuerystring = true;
                        }

                        request(requestOptions,
                            function (error, response) {
                                if (!error && response.statusCode === 200) {
                                    console.log('Latest version retrieved');
                                }
                                else {
                                    if (response) {
                                        console.log('Http status ' + response.statusCode);
                                        reject('Http status ' + response.statusCode)
                                    }
                                    else {
                                        console.log('Http request failed');
                                        reject('Http request failed');
                                    }
                                }
                            })
                            .pipe(fs.createWriteStream(fileZip));
                    }
                }
                catch (err) {
                    console.log('Error:' + err);
                    logger.error(err, 'Error');
                }
            })
            .catch(function (err) {
                console.log('Error:' + err);
                logger.error(err, 'Error');
            });
    })
    .timeout(INIT_TIMEOUT * 1000, function () {
        logger.error('Download UI5 catalog timeout, closing process.');
        throw new Error('Timeout expired');
    })
    .always(function () {
        server.appServer.shutdown();
    });
