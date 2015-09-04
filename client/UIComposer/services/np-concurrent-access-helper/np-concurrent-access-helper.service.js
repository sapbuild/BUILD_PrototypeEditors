'use strict';

var npConcurrentAccessHelper = ['$window', '$rootScope', 'npPageMetadata',
    function ($window, $rootScope, npPageMetadata) {
        var self = {},
            unlockMonitoringEnabled = false;

        self.handleUnlock = function () {
            npPageMetadata.flushUpdates(true);
            self.disableUnlockMonitoring();
        };

        self.enableUnlockMonitoring = function () {
            if (!unlockMonitoringEnabled) {
                $window.addEventListener('beforeunload', onBeforeUnload);
                unlockMonitoringEnabled = true;
            }
        };

        self.disableUnlockMonitoring = function () {
            if (unlockMonitoringEnabled) {
                $window.removeEventListener('beforeunload', onBeforeUnload);
                unlockMonitoringEnabled = false;
            }
        };

        /**
         * @description
         * Ensure prototype is unlocked on close of window.
         * $rootScope.$apply ensures that the pending request is actually flushed.
         */
        var onBeforeUnload = function () {
            npPageMetadata.flushUpdates(true);
            $rootScope.$apply();
        };

        return self;
    }
];

module.exports = npConcurrentAccessHelper;
