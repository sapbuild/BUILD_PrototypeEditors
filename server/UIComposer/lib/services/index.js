'use strict';
require('norman-server-tp');
var commonServer = require('norman-common-server');
var registry = commonServer.registry;
var serviceLogger = commonServer.logging.createLogger('uicomposer-server');

var serviceFactories = {
    appMetadataService: require('./appMetadata'),
    pageMetadataService: require('./pageMetadata'),
    composerPrototypeService: require('./prototype'),
    processSwService: require('./processSwService'),
    composerCommonService: require('./common')
};

var serviceInstances = {};

function runOnServices(services, fnName, done, argObject) {
    var k, n, keys;
    keys = Object.keys(services);
    k = 0;
    n = keys.length;
    function nextService() {
        var key, service;
        if (k >= n) {
            return Promise.resolve(true);
        }
        key = keys[k++];
        service = services[key];
        serviceLogger.debug('Running ' + fnName + ' process on ' + key);
        if (typeof service[fnName] === 'function') {
            if (argObject) {
                return Promise.invoke(service, fnName, argObject).then(nextService);
            }
            else {
                return Promise.invoke(service, fnName).then(nextService);
            }
        }
        return nextService();
    }

    return nextService().callback(done);
}

module.exports = {
    initialize: function (done) {
        serviceLogger.debug('Initializing Auth services');
        Object.keys(serviceFactories).forEach(function (key) {
            serviceLogger.debug('Registering service ' + key);
            var service, ServiceClass = serviceFactories[key];
            service = new ServiceClass();
            serviceInstances[key] = service;
            registry.registerModule(service, key);
        });
        runOnServices(serviceInstances, 'initialize', done);
    },
    onInitialized: function (done) {
        runOnServices(serviceInstances, 'onInitialized', done);
    },
    checkSchema: function (done) {
        serviceLogger.debug('UIComposer services checkSchema');
        runOnServices(serviceInstances, 'checkSchema', done);
    },
    onSchemaChecked: function (done) {
        serviceLogger.debug('UIComposer services onSchemaChecked');
        runOnServices(serviceInstances, 'onSchemaChecked', done);
    },
    initializeSchema: function (done) {
        serviceLogger.debug('UIComposer services initializeSchema');
        runOnServices(serviceInstances, 'initializeSchema', done);
    },
    onSchemaInitialized: function (done) {
        serviceLogger.debug('UIComposer services onSchemaInitialized');
        runOnServices(serviceInstances, 'onSchemaInitialized', done);
    },
    prepareSchemaUpgrade: function (version, done) {
        serviceLogger.debug({version: version}, 'UIComposer services prepareSchemaUpgrade');
        runOnServices(serviceInstances, 'prepareSchemaUpgrade', done, version);
    },
    upgradeSchema: function (version, done) {
        serviceLogger.debug({version: version}, 'UIComposer services upgradeSchema');
        runOnServices(serviceInstances, 'upgradeSchema', done, version);
    },
    onSchemaUpgraded: function (version, done) {
        serviceLogger.debug({version: version}, 'UIComposer services onSchemaUpgraded');
        runOnServices(serviceInstances, 'onSchemaUpgraded', done, version);
    },
    shutdown: function (done) {
        Object.keys(serviceFactories).forEach(function (key) {
            registry.unregisterModule(key);
        });
        runOnServices(serviceInstances, 'shutdown', done);
        serviceInstances = {};
    },
    services: serviceFactories
};
