'use strict';

/**
 * The npNavBarHelper service provides helper functions to update the navbar with status information.
 *
 * @namespace npNavBarHelper
 */
var npNavBarHelper = ['$rootScope', '$filter', '$interval', 'npPageMetadata', 'NavBarService', 'npMessaging', 'ProjectFactory', 'ActiveProjectService',
    function ($rootScope, $filter, $interval, npPageMetadata, NavBarService, npMessaging, ProjectFactory, ActiveProjectService) {
        var unregisterWatchSaveStatus;

        /**
         * @name enableUpdateSaveStatus
         * @memberof npNavBarHelper
         */
        var enableUpdateSaveStatus = function () {
            unregisterWatchSaveStatus = $rootScope.$watch(function () {
                return npPageMetadata.getSaveStatus();
            }, function (newVal) {
                switch (newVal) {
                    case npPageMetadata.saveStatuses.SAVE_SUCCESSFUL:
                        var changesSavedMessage = 'All Changes Saved.';
                        NavBarService.updateSaveMessage(changesSavedMessage);
                        break;
                    case npPageMetadata.saveStatuses.SAVE_FAILED:
                        NavBarService.updateSaveMessage('Failed to save changes.');
                        npMessaging.showError('Project not saved. Something went wrong');
                        break;
                    case npPageMetadata.saveStatuses.SAVE_PENDING:
                        NavBarService.updateSaveMessage('Saving...');
                        break;
                    case npPageMetadata.saveStatuses.SAVE_IDLE:
                        NavBarService.updateSaveMessage('');
                }
            });
        };

        /**
         * @name disableUpdateSaveStatus
         * @memberof npNavBarHelper
         */
        var disableUpdateSaveStatus = function () {
            if (unregisterWatchSaveStatus) {
                unregisterWatchSaveStatus();
                NavBarService.updateSaveMessage('');
            }
        };

        var updateHeading = function () {
            if (!NavBarService.heading) {
                ProjectFactory.get({
                    id: ActiveProjectService.id
                }).$promise
                    .then(function (res) {
                        NavBarService.updateHeading(res.name);
                    });
            }
        };

        return {
            enableUpdateSaveStatus: enableUpdateSaveStatus,
            disableUpdateSaveStatus: disableUpdateSaveStatus,
            updateHeading: updateHeading
        };
    }
];

module.exports = npNavBarHelper;
