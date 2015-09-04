'use strict';
var services = require('./lib/services');

module.exports = {
    name: 'PrototypeBuilders',
    initialize: function () {
        services.initialize(function () {

        });
    },
    onInitialized: function () {
        services.onInitialized();
    },
    upgradeSchema: function (version, done) {
        services.upgradeSchema(version, done);
    },
    // FIXME Shutdown is not yet called by the AppServer so ignore it for now
    // shutdown: function () {
    //    services.shutdown();
    // },
    getHandlers: function () {
        return {};
    }
};
