'use strict';

/**
 * The npUserInfo service provides some basic user information such as the user's operating system.
 *
 * @namespace npUserInfo
 */

var npMessaging = ['$log', '$timeout', 'uiError', 'npConstants',
    function ($log, $timeout, uiError, npConstants) {

        var showBusy = false,
            showBusyTimeoutPromise,
            timeBeforeShowingBusy = 1000;


        var clearAllMsgs = function(){
            uiError.dismiss();
        }

        var showError = function (displayError, logError) {
            
            uiError.create({
                content: displayError,
                dismissOnTimeout: false
            });
            $log.error(displayError, logError);
            hideBusyIndicator();
        };


        var isShowingBusyIndicator = function () {
            return showBusy;
        };

        var showBusyIndicator = function (noDelay) {
            // remove the time delay when we want to see it immediately
            var timeDelay = (noDelay) ? 0 : timeBeforeShowingBusy;
            if (npConstants.busyIndicator.enabled) {
                $timeout.cancel(showBusyTimeoutPromise);
                showBusyTimeoutPromise = $timeout(function () {
                    showBusy = true;
                }, timeDelay);
            }
        };

        var hideBusyIndicator = function () {
            $timeout.cancel(showBusyTimeoutPromise);
            showBusy = false;
        };

        return {
            clearAllMsgs:clearAllMsgs,
            showError: showError,
            isShowingBusyIndicator: isShowingBusyIndicator,
            showBusyIndicator: showBusyIndicator,
            hideBusyIndicator: hideBusyIndicator
        };
    }
];

module.exports = npMessaging;
