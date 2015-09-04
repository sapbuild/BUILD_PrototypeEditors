'use strict';
var commonServer = require('norman-common-server');
var services = require('./lib/services');
var api = require('./lib/api');

var logger = commonServer.logging.createLogger('norman-ui-composer-server');
commonServer.logging.manager.on('configure', function () {
    logger = commonServer.logging.createLogger('norman-ui-composer-server');
});

module.exports = {
    name: 'UIComposer',
    initialize: function (done) {
        logger.info('Initializing norman-ui-composer-server service');
        services.initialize(function (err) {
            if (err) {
                done(err);
            }
            else {
                // api.initialize();
                done();
            }
        });
    },
    onInitialized: function (done) {
        services.onInitialized(done);
        logger.info('Sample service post-initialization');
    },
    checkSchema: function (done) {
        services.checkSchema(done);
    },
    onSchemaChecked: function () {
        services.onSchemaChecked();
    },
    initializeSchema: function (done) {
        services.initializeSchema(done);
    },
    onSchemaInitialized: function () {
        services.onSchemaInitialized();
    },
    prepareSchemaUpgrade: function (version, done) {
        logger.debug({version: version}, 'prepareSchemaUpgrade');
        services.prepareSchemaUpgrade(version, done);
    },
    upgradeSchema: function (version, done) {
        logger.debug({version: version}, 'upgradeSchema');
        services.upgradeSchema(version, done);
    },
    onSchemaUpgraded: function (version, done) {
        logger.debug({version: version}, 'onSchemaUpgraded');
        services.onSchemaUpgraded(version, done);
    },
    shutdown: function (done) {
        logger.info('Stopping norman-ui-composer-server service');
        api.shutdown();
        services.shutdown(done);
    },
    getHandlers: function () {
        logger.debug('Get norman-ui-composer-server service handlers');
         api.initialize();
        return api.getHandlers();
    }
};

