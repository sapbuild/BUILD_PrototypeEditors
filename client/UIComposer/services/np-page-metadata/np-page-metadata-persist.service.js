'use strict';

var _ = require('norman-client-tp').lodash;

module.exports = npPageMetadataPersist;

npPageMetadataPersist.$inject = ['$rootScope', '$q', '$timeout', '$state', '$log', 'npPageMetadataAPI', 'npPrototype', 'npUiCanvasAPI', 'npConstants', 'uiError',
    'uiThumbnailGenerator'
];

/**
 * @ngdoc factory
 * @name npPageMetadataPersist
 * @namespace uiComposer:services:npPageMetadata:persist
 * @description
 * Handle saving of page metadata changes.
 */
function npPageMetadataPersist($rootScope, $q, $timeout, $state, $log, pageAPI, npPrototype, npUiCanvasAPI, npConstants, uiError, uiThumbnailGenerator) {
    var AUTO_SAVE_DELAY;

    var service = {
        _pendingUpdates: {}, // pageName - pageMetadata mapping, used to update backend with latest data
        _pendingPreviews: {}, // thumbnail url - thumbnail blob mapping, used to update thumbnail in backend
        saveStatuses: {
            SAVE_IDLE: 'SAVE_IDLE',
            SAVE_SUCCESSFUL: 'SAVE_SUCCESSFUL',
            SAVE_FAILED: 'SAVE_FAILED',
            SAVE_PENDING: 'SAVE_PENDING',
            _currentStatus: null
        },
        getSaveStatus: getSaveStatus,
        updatePage: updatePage,
        flushUpdates: flushUpdates
    };

    init.call(service);

    return service;

    function init() {
        setAutosaveDelay();

        service.saveStatuses._currentStatus = service.saveStatuses.SAVE_SUCCESSFUL;

        $rootScope.$on('pageDeleted', function (event, deletedPage) {
            service._pendingUpdates[deletedPage] = undefined;
            delete service._pendingUpdates[deletedPage];
        });

        $rootScope.$on('npPrototype/recreatingPrototype', function () {
            setAutosaveDelay();
        });

        $rootScope.$on('projectChanged', function () {
            setAutosaveDelay();
        });
    }

    function setAutosaveDelay() {
        var SMART_APP_AUTO_SAVE_DELAY = 0,
            STANDARD_APP_AUTO_SAVE_DELAY = 3000;

        AUTO_SAVE_DELAY = STANDARD_APP_AUTO_SAVE_DELAY;
        npPrototype.getPrototype().then(function (prototype) {
            if (prototype.isSmartApp) {
                AUTO_SAVE_DELAY = SMART_APP_AUTO_SAVE_DELAY;
            }
            else {
                AUTO_SAVE_DELAY = STANDARD_APP_AUTO_SAVE_DELAY;
            }
        });
    }

    /**
     * @name getSaveStatus
     * @memberof uiComposer:services:npPageMetadata
     * @description Get the current save status. Can be successful, failed or pending.
     * @returns {string} Current save status. Possible values can be found in npPageMetadata.saveStatuses.
     */
    function getSaveStatus() {
        return service.saveStatuses._currentStatus;
    }

    /**
     * @name updatePage
     * @memberof uiComposer:services:npPageMetadata:persist
     * @description Adds the pageMd to pending updates and resets the save timeout.
     * @param {Object} pageMd
     */
    function updatePage(pageMd) {
        service._pendingUpdates[pageMd.name] = pageMd;
        $timeout.cancel(flushUpdates.timeoutPromise);
        flushUpdates.timeoutPromise = $timeout(service.flushUpdates, AUTO_SAVE_DELAY);
        updateThumbnail();
    }

    /**
     * @name flushUpdates
     * @description Send all pending updates to backend. Will resolve immediately if no pending updates exist.
     * @param {Boolean} unlockPrototype
     * @returns {object} Promise object that resolves when updates are done.
     */
    function flushUpdates(unlockPrototype) {
        $timeout.cancel(flushUpdates.timeoutPromise);
        var response;
        if (!_.isEmpty(service._pendingUpdates)) {
            service.saveStatuses._currentStatus = service.saveStatuses.SAVE_PENDING;
            response = saveUpdates(unlockPrototype).then(function updated(res) {
                service.saveStatuses._currentStatus = service.saveStatuses.SAVE_SUCCESSFUL;
                $log.log('Artifacts saved successfully: ', res);
                if (res && res.isSmartApp) {
                    npUiCanvasAPI.refreshPageModel();
                }
            }, function notUpdated() {
                service.saveStatuses._currentStatus = service.saveStatuses.SAVE_FAILED;
            });
        }
        else {
            if (unlockPrototype) {
                // FIXME it is not the page metadata service's responsibility to unlock the prototype, this belongs somewhere else
                npPrototype.unlockPrototype();
            }
            response = $q.when();
        }
        return response;
    }


    /**
     * @private
     * @description Serializes all pending updates and previews and sends them to the backend.
     */
    function saveUpdates(unlockPrototype) {
        var payload = new FormData(),
            pages = JSON.stringify(service._pendingUpdates);
        _.forEach(service._pendingPreviews, function (content, path) {
            payload.append(path, content);
        });
        payload.append('pages', pages);
        payload.append('deleteLock', unlockPrototype === true);
        service._pendingUpdates = {};
        service._pendingPreviews = {};

        var deferred = $q.defer();
        // TODO remove this when we find cleaner solution
        npPrototype.updateCachedPrototypePromise(deferred.promise);

        pageAPI.$resource.updatePage(payload).$promise.then(deferred.resolve, deferred.reject);
        return deferred.promise.catch(function (err) {
            // TODO: invalidate pageMd cache
            // _pagesMd = {};
            $log.error('npPageMetadata service: failed to save updates to backend with error: ', err);
            if (err.data && err.data.error && err.data.error.code === npConstants.prototypeLockTimedOut.code) {
                $timeout(function () {
                    uiError.create({
                        content: err.data.error.message,
                        dismissOnTimeout: false
                    });
                    $state.go(npConstants.prototypeLockTimedOut.state);
                });
            }
        });
    }


    /**
     * @private
     * @description Generates a thumbnail for the currently selected page and adds the thumbnail to preding previews to save it to the backend.
     * Function is debounced by 400ms to optimize performance when there are multiple operations in quick succession.
     * Thumbnail generation is very slow...
     */
    function updateThumbnail() {
        _.debounce(function () {
            $q.all([npPrototype.getPages(true), npUiCanvasAPI.getCurrentViewName(), generatePreview()])
                .then(function (values) {
                    var pages = values[0],
                        currentPage = _.find(pages, {
                            name: values[1]
                        }),
                        thumbnail = values[2];
                    if (currentPage) {
                        var thumbnailUrl = currentPage.thumbnailUrl;
                        service._pendingPreviews[thumbnailUrl] = thumbnail;
                    }
                });
        }, 400)();
    }

    /**
     * @private
     * @description Generates a thumbnail for the currently selected page. Waits a short amout of time before starting the thumbnail
     * generation to give canvas time to finish animations/rendering of certian controls.
     */
    function generatePreview() {
        var deferred = $q.defer(),
            quality = 0,
            canvasBody = npUiCanvasAPI.getWindow().document.querySelector('body');
        uiThumbnailGenerator.generateFromHtml(canvasBody, 160, 240, function (thumbnailImageBlob) {
            deferred.resolve(thumbnailImageBlob);
        }, quality);
        return deferred.promise;
    }

    /**
     * @private
     * @description Log pending updates to console.
     */
    /*eslint-disable*/
    function logPendingUpdates() {
        /*eslint-enable*/
        var result = '\n';
        var treeControls = [];

        var checkBinding = function (element) {
            return !!(element.binding && element.binding.paths && element.binding.paths.length > 0);
        };

        var exploreFn = function (pageMd, controlId, tabs) {
            tabs = tabs || '';
            var controlMd = _.find(pageMd.controls, {
                controlId: controlId
            });
            var catalogControlName = controlMd ? controlMd.catalogControlName : '';
            result += tabs + controlId + ' ' + catalogControlName;
            var alreadyExploredId = _.find(treeControls, {
                controlId: controlId
            });
            if (controlMd && !alreadyExploredId) {
                treeControls.push({
                    controlId: controlId
                });
                var subTabs = tabs + '  ';
                var subSubTabs = tabs + '    ';

                _.forEach(controlMd.properties, function (property) {
                    var hasBinding = checkBinding(property);
                    result += ', ' + property.name + ': ' + hasBinding;
                });
                result += '\n';
                _.forEach(controlMd.groups, function (group) {
                    var hasBinding = checkBinding(group);
                    result += subTabs + 'group ' + group.groupId + ', bound:' + hasBinding + '\n';
                    _.forEach(group.children, function (subControlId) {
                        exploreFn(pageMd, subControlId, subSubTabs);
                    });
                });
            }
            else {
                if (alreadyExploredId) {
                    result += '\n==> Circularity!';
                }
                result += '\n';
            }
        };

        _.forEach(service._pendingUpdates, function (pageMd) {
            result += 'Page:' + pageMd.name + '\n';
            exploreFn(pageMd, pageMd.rootControlId, '  ');
            result += 'orphans:\n';
            _.forEach(pageMd.controls, function (controlMd) {
                var control = _.find(treeControls, {
                    controlId: controlMd.controlId
                });
                if (!control) {
                    exploreFn(pageMd, controlMd.controlId, '  ');
                }
            });
        });
        $log.log('Artifacts to save: ', result);
    }
}
