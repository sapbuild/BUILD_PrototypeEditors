'use strict';

var fs = require('fs');
var path = require('path');
var AppServer = require('node-sap-app-server');
var commonServer = require('norman-common-server');
require('norman-server-tp');
var _ = require('norman-server-tp').lodash;
var logger = commonServer.logging.createLogger('importUI5Catalog');
var registry = commonServer.registry;
var mongoose = commonServer.db.mongoose;
var INIT_TIMEOUT = 480;

var configFile = path.join(__dirname, 'ui5config.json'),
    filePath = path.join(__dirname, 'sapui5-dist-1.30.3-opt-static.zip'),
    libraryType = 'sapui5',
    libVersion = '1.30.3',
    file;

var k, n;
for (k = 2, n = process.argv.length; k < n; ++k) {
    if ((process.argv[k] === '--config') && (k < n - 1)) {
        configFile = process.argv[k + 1];
    }

    if ((process.argv[k] === '--filePath') && (k < n - 1)) {
        filePath = process.argv[k + 1];
    }

    if ((process.argv[k] === '--libVersion') && (k < n - 1)) {
        libVersion = process.argv[k + 1];
    }
}

var config = commonServer.config.initialize(configFile);
if (config.server && config.server.workers) {
    // Ensure that we are not running in cluster mode
    delete config.server.workers;
}

var server = new AppServer.Server(config);
server.start()
    .then(function () {
        logger.info({filePath: filePath, libVersion: libVersion}, 'Starting import >>');

        return Promise.invoke(fs.readFile, path.resolve(filePath));
    })
    .then(function (data) {
        file = [{buffer: data}];

        return new Promise(function (resolve, reject) {
            var model = mongoose.model('UICatalogGrid');
            var conditions = {
                $and: [
                    {'metadata.libraryType': libraryType},
                    {'metadata.libraryVersion': libVersion}
                ]
            };

            logger.debug('remove ui catalog grid >>');
            model.find(conditions).lean().exec(function (err, files) {

                if (files.length > 0) {
                    var commonService = require('norman-ui-catalog-manager-server/lib/services/common/common.service.js');
                    var gfs = commonService.getGridFs();

                    var promises = _.transform(files, function (result, element) {
                        result.push(Promise.invoke(gfs, 'remove', {_id: element._id}));
                    });

                    Promise.all(promises)
                        .then(function () {
                            model.remove(conditions).lean().exec(function (err, file) {
                                logger.debug('<< removed ui catalog grid - file number: ' + file);
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve(file);
                                }
                            });
                        })
                        .catch(reject);
                }
                else {
                    logger.debug('<< removed ui catalog grid - file number: ' + files.length);
                    resolve();
                }
            });
        });
    })
    .then(function () {
        return new Promise(function (resolve, reject) {
            var model = mongoose.model('UICatalog');
            var conditions = {
                $or: [
                    {'catalogName': 'st' + libVersion},
                    {'catalogName': 'stc' + libVersion}
                ]
            };

            logger.debug('remove ui catalog >>');
            model.remove(conditions).lean().exec(function (err, file) {
                logger.debug('<< removed ui catalog - file number: ' + file);
                if (err) {
                    reject(err);
                }
                else {
                    resolve(file);
                }
            });
        });
    })
    .then(function () {
        var service = registry.getModule('UICatalog');
        return service.uploadUILibrary(file, libraryType, libVersion, false);
    })
    .then(function () {
        logger.info('<< end');
    })
    .catch(function (err) {
        logger.error(err);
    })
    .setTimeout(INIT_TIMEOUT * 1000, function () {
        logger.error('Import UI5 catalog timeout, closing process.');
        throw new Error('Timeout expired');
    })
    .always(function () {
        server.appServer.shutdown();
    });
