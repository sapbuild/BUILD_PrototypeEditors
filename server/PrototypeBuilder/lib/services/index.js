'use strict';

var registry = require('norman-common-server').registry;
var PrototypeBuilderService = require('./builder');
var prototypeBuilderServiceInstance = new PrototypeBuilderService();
registry.registerModule(prototypeBuilderServiceInstance, 'PrototypeBuilder');


var PrototypeBuilderObserver = require('./builder/observer');
var prototypeBuilderObserverInstance = new PrototypeBuilderObserver();
registry.registerModule(prototypeBuilderObserverInstance, 'PrototypeBuilderObserver');

module.exports = {
    initialize: function (done) {
        prototypeBuilderServiceInstance.initialize(done);
    },
    onInitialized: function () {
        prototypeBuilderServiceInstance.onInitialized();
        prototypeBuilderObserverInstance.onInitialized();
    },
    upgradeSchema: function (version, done) {
        prototypeBuilderServiceInstance.upgradeSchema(version, done);
    },
    shutdown: function (done) {
        registry.unregisterModule('PrototypeBuilder');
        registry.unregisterModule('PrototypeBuilderObserver');
        done();
    }
};
