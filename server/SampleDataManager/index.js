'use strict';

var commonServer = require('norman-common-server');
var services = require('./lib/services');
var api = require('./lib/api');

var logger = commonServer.logging.createLogger('sample-service');

module.exports = {
    name: 'SampleDataManager',
    initialize: function (done) {
        logger.info('Initializing Sample service');
        services.initialize(function (err) {
            if (err) {
                done(err);
            }
            else {
                done();
            }
        });
    },
    onInitialized: function () {
        logger.info('Sample service post-initialization');
        services.onInitialized();
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
        services.prepareSchemaUpgrade(version, done);
    },
    upgradeSchema: function (version, done) {
        services.upgradeSchema(version, done);
    },
    onSchemaUpgraded: function (version, done) {
        services.onSchemaUpgraded(version, done);
    },
    shutdown: function (done) {
        logger.info('Stopping sample service');
        api.shutdown();
        services.shutdown(done);
    },
    getHandlers: function () {
        api.initialize();
        logger.debug('Get sample service handlers');
        return api.getHandlers();
    }
};
