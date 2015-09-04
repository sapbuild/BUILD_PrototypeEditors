'use strict';

var _ = require('norman-client-tp').lodash;
module.exports = npPrototype;

/**
 * The npPrototype service handles all prototype related interactions with the backend such as creating and retrieving prototypes,
 * modifying prototypes and creating snapshots.
 * @namespace npPrototype
 */

/**
 * @typedef {object} Snapshot
 * @memberof npPrototype
 * @property {number} projectId
 * @property {number} snapshotVersion
 * @property {string} snapshotDesc
 * @property {string} createdBy
 * @property {date} createdOn
 * @property {string} snapshotUrl
 * @property {DeepLink[]} deepLinks
 */

/**
 * @typedef {object} DeepLink
 * @memberof npPrototype
 * @property {string} pageName
 * @property {string} thumbnail
 * @property {string} pageUrl
 */

/**
 * @typedef {object} pageDef
 * @memberof npPrototype
 * @property {string} floorplan
 * @property {string} catalogId
 * @property {string} [pageId]
 * @property {string} [displayName]
 */

// @ngInject
function npPrototype($resource, $q, $interval, $document, $rootScope, $log, ActiveProjectService, uiCommandManager, npPageMetadataAPI) {
    var baseUrl = '/api/projects/:projectId/prototype/',
        prototypeAPI, snapshotAPI, prototypeLockAPI, pageMapAPI,
        _cachedPrototypePromise,
        _cachedPrototypeValid = false, // whether cached version is valid
        _prototypeViewModeData,
        shouldKeepAlive = false,
        ALIVE_CHECK_INTERVAL_MS = 10 * 60 * 1000;

    updateParams();

    $rootScope.$watch(function () {
        return ActiveProjectService.id;
    }, function () {
        updateParams();
        _cachedPrototypeValid = false;
    });

    return {
        createApplication: createApplication,
        getPrototype: getPrototype,
        createPage: createPage,
        deletePage: deletePage,
        createSnapshot: createSnapshot,
        getSnapshot: getSnapshot,
        getPages: getPages,
        getPrototypeMainUrl: getPrototypeMainUrl,
        getArtifactBaseUrl: getArtifactBaseUrl,
        getAssetUrl: getAssetUrl,
        getCatalogId: getCatalogId,
        getNavigationToPage: getNavigationToPage,
        getPrototypeLockStatus: getPrototypeLockStatus,
        lockPrototype: lockPrototype,
        unlockPrototype: unlockPrototype,
        setPrototypeViewModeData: setPrototypeViewModeData,
        getPrototypeViewModeData: getPrototypeViewModeData,
        setPositionsPageMap: setPositionsPageMap,
        setPageDisplayName: setPageDisplayName,
        getPageDisplayName: getPageDisplayName,
        // TODO find cleaner solution
        updateCachedPrototypePromise: setPrototypePromise
    };

    /**
     * @private
     * @description updates the params of the apis to ensure active prototype id is the correct one
     */
    function updateParams() {
        var projectId = ActiveProjectService.id,
            projectData = {
                projectId: projectId
            };
        prototypeAPI = $resource(baseUrl, projectData, {
            updateProto: {
                method: 'PUT'
            }
        });
        snapshotAPI = $resource(baseUrl + 'snapshot/', projectData);
        prototypeLockAPI = $resource(baseUrl + 'lock', projectData, {
            keepAlive: {
                method: 'PUT'
            }
        });
        pageMapAPI = $resource(baseUrl + 'page/coordinates', projectData, {
            save: {
                method: 'POST',
                isArray: true
            }
        });
    }


    /**
     * @private
     * @description Thumbnail urls are relative to artifact url. Adding the complete URL to each page makes binding easier.
     */
    function addFullUrls(proto) {
        _.forEach(proto.pages, function (page) {
            page.fullPageUrl = '/api/projects/' + ActiveProjectService.id + '/prototype/artifact/' + page.pageUrl;
            page.fullThumbnailUrl = '/api/projects/' + ActiveProjectService.id + '/prototype/artifact/' + page.thumbnailUrl;
            page.incomingNavigations = _.filter(proto.navigations, {
                pageTo: page.name
            }).length;
        });
        return $q.when(proto);
    }

    /**
     * @name createApplication
     * @memberof npPrototype
     * @description Create a new prototype.
     * @param {number} projectId Id of project for which prototype should be created. Note that each project only has one prototype associated with it.
     * @param {string} applicationType type of application to be generated.
     * @returns {object} Promise object that will be extended with the response data when promise is resolved.
     * Response data is the entire prototype in success case. Promise is accessible via the $promise property.
     */
    function createApplication(applicationType) {
        $rootScope.$broadcast('npPrototype/recreatingPrototype');
        var payload = {
            applicationType: applicationType
        };

        setPrototypePromise(prototypeAPI.save(payload).$promise);

        return _cachedPrototypePromise;
    }

    /**
     * @name getPrototype
     * @memberof npPrototype
     * @description Retrieve an existing prototype. Will cache the prototype object and resolve the returned promise with the cached version on subsequent calls until cache is invalidated.
     * @returns {object} Promise object that will be extended with the response data when promise is resolved.
     * Response data is the entire prototype in success case. Promise is accessible via the $promise property.
     */
    function getPrototype() {
        if (!_cachedPrototypeValid) {
            setPrototypePromise(prototypeAPI.get().$promise, 'npPrototype: could not get prototype');
        }
        return _cachedPrototypePromise;
    }

    /**
     * @name createPage
     * @memberof npPrototype
     * @description Create a page for the prototype.
     * Note: id is generated on server but we need it for undoing the create, therefore capturing empty reference
     * in unexecute and updating it once server response is available
     * @param {pageDef} pageDef
     * @returns {Promise}
     */
    function createPage(pageDef) {
        var createdPage = {};
        return uiCommandManager.execute({
            execute: performPageCreate.bind(this, pageDef),
            unexecute: function () {
                return performPageDelete(createdPage.name);
            }
        })
            .then(function (res) {
                _.extend(createdPage, _.last(res.pages));
                return res;
            });
    }

    /**
     * @name deletePage
     * @memberof npPrototype
     * @description Delete a page of the prototype.
     *
     * @param {string} pageName
     * @returns {Promise}
     */
    function deletePage(pageName) {
        var prototype;
        return getPrototype()
            .then(function (proto) {
                prototype = proto;
                return getAffectedPagesMd(pageName, proto);
            })
            .then(function (pageMdValues) {
                var pageIndex = _.findIndex(prototype.pages, {
                    name: pageName
                });

                return uiCommandManager.execute({
                    execute: performPageDelete.bind(this, pageName),
                    unexecute: performPageRestore.bind(this, prototype.pages[pageIndex], pageIndex, pageMdValues)
                });
            });
    }

    /**
     * @private
     * @description
     * Send the backend call that does the page create.
     */
    function performPageCreate(pageDef, skipNotify) {
        var payload = {
            pageArray: _.makeArray(pageDef)
        };
        return npPageMetadataAPI.$resource.save(payload).$promise
            .then(function (res) {
                setPrototypePromise(res.$promise);
                if (skipNotify !== true) {
                    $rootScope.$broadcast('pageCreated', _.last(res.pages).name);
                }
                return res;
            });
    }

    /**
     * @private
     * @description
     * Send the backend call that does the page delete.
     */
    function performPageDelete(pageName) {
        var payload = {
            pageName: pageName
        };
        return npPageMetadataAPI.$resource.delete(payload).$promise
            .then(function (res) {
                setPrototypePromise(res.$promise);
                $rootScope.$broadcast('pageDeleted', pageName);
                return res;
            });
    }

    /**
     * @private
     * @description
     * Perform a page restore by creating a new page with preset values and restoring the page metadata of that page and all
     * pages that were affected by the deletion of that page.
     */
    function performPageRestore(page, pageIndex, pageMdValues) {
        var pageDef = {
                floorplan: page.floorplan,
                catalogId: page.catalogId,
                pageId: page.name,
                pageIndex: pageIndex,
                displayName: page.displayName
            },
            pageMdHash = _.indexBy(pageMdValues, 'name');
        return performPageCreate(pageDef, true)
            .then(function () {
                return restorePageMetadataInfo(pageMdHash);
            })
            .then(function (res) {
                npPageMetadataAPI.invalidateCachedPages(Object.keys(pageMdHash));
                $rootScope.$broadcast('pageCreated', page.name);
                return res;
            });
    }

    /**
     * @private
     *
     * @param {string} targetPageName The page to be deleted
     * @param {object} prototype
     * @returns {Promise}
     */
    function getAffectedPagesMd(targetPageName, prototype) {
        var affectedPages = getNavigationSourcePages(targetPageName, prototype),
            pageMdPromises = [];
        affectedPages.push(targetPageName);

        _.forEach(affectedPages, function (pageName) {
            pageMdPromises.push(npPageMetadataAPI.getPageMetadata(pageName));
        });

        return $q.all(pageMdPromises);
    }

    /**
     * @description
     * Get the names of all pages that have navigations to a certain page
     *
     * @param {string} targetPageName
     * @param {object} prototype
     * @returns {string[]}
     */
    function getNavigationSourcePages(targetPageName, prototype) {
        return _.chain(prototype.navigations)
            .filter({
                pageTo: targetPageName
            })
            .pluck('pageFrom')
            .uniq()
            .value();
    }

    /**
     * @private
     * @description
     * Restore the page metadata of all pages's passed to this function.
     */
    function restorePageMetadataInfo(pageMdHash) {
        var payload = new FormData();
        payload.append('pages', JSON.stringify(pageMdHash));
        // Invalidate Prototype Cache to get all navigation paths
        _cachedPrototypeValid = false;
        return npPageMetadataAPI.$resource.updatePage(payload).$promise;
    }

    /**
     * @name createSnapshot
     * @memberof npPrototype
     * @description Create a snapshot for a prototype.
     * @param {number} projectId Id of project for which snapshot should be created.
     * @returns {object} Promise object that will be extended with the response data when promise is resolved.
     * Response data is a snapshot object. Promise is accessible via the $promise property.
     */
    function createSnapshot(bLatest) {
        var payload = {
            snapshotDesc: ''
        };

        if (bLatest === false) {
            payload.latest = bLatest;
        }
        return snapshotAPI.save(payload).$promise;
    }

    /**
     * @name getSnapshot
     * Response data is a snapshot object. Promise is accessible via the $promise property.
     */
    function getSnapshot() {
        return snapshotAPI.get({
            version: 'latest'
        }).$promise;
    }

    /**
     * @name getPages
     * @memberof npPrototype
     * @description Store the currently selected page.
     * @param {boolean} byRef, if to return the prototype reference.
     */
    function getPages(byRef) {
        return getPrototype().then(function (proto) {
            return byRef === true ? proto.pages : _.cloneDeep(proto.pages);
        });
    }


    /**
     * @name getPrototypeMainUrl
     * @memberof npPrototype
     * @description returns the index.html url of the current prototype
     */
    function getPrototypeMainUrl() {
        return '/api/projects/' + ActiveProjectService.id + '/prototype/artifact/index.html';
    }

    /**
     * @name getArtifactBaseUrl
     * @memberof npPrototype
     * @description returns the base url of the current prototype
     * @param {string} base url for the artifact
     */
    function getArtifactBaseUrl() {
        return '/api/projects/' + ActiveProjectService.id + '/prototype/artifact/';
    }

    /**
     * @name getAssetUrl
     * @memberof npPrototype
     * @description returns the asset url of the current prototype
     * @param {string} assetId
     */
    function getAssetUrl(assetId) {
        return '/api/projects/' + ActiveProjectService.id + '/document/' + assetId + '/1/render';
    }

    /**
     * @name getCatalogId
     * @memberof npPrototype
     * @description returns the catalog id of the prototype
     * @returns {object} promise returning catalogId
     */
    function getCatalogId() {
        return getPrototype().then(function (proto) {
            return proto.catalogId;
        });
    }

    /**
     * @name getNavigationToPage
     * @memberof npPrototype
     * @description gives the number of pages which has navigation to the page passed as param
     * @param {string} pageName
     */
    function getNavigationToPage(pageName) {
        return getPrototype().then(function (proto) {
            return _.filter(proto.navigations, function (navigation) {
                return navigation.pageTo === pageName;
            });
        });
    }

    /**
     * @name getPrototypeLockStatus
     * @memberof npPrototype
     * @description Get the status of the prototype lock
     */
    function getPrototypeLockStatus() {
        return prototypeLockAPI.get().$promise;
    }

    /**
     * @name lockPrototype
     * @memberof npPrototype
     * @description Attempt to lock the prototype
     */
    function lockPrototype() {
        var promise = prototypeLockAPI.save().$promise;
        promise.then(startKeepAlive);
        return promise;
    }

    /**
     * @name unlockPrototype
     * @memberof npPrototype
     * @description Attempt to unlock the prototype
     */
    function unlockPrototype() {
        stopKeepAlive();
        return prototypeLockAPI.delete().$promise;
    }

    /**
     * @name startKeepAlive
     * @private
     * @description will trigger keepAlive every X minutes in case there is user interaction
     */
    function startKeepAlive() {
        shouldKeepAlive = false;
        $document.on('keydown', setShouldKeepAlive);
        $document.on('mousedown', setShouldKeepAlive);
        $document.on('mousemove', setShouldKeepAlive);
        keepAlive.__interval = $interval(keepAlive, ALIVE_CHECK_INTERVAL_MS);
    }

    function stopKeepAlive() {
        shouldKeepAlive = false;
        $document.off('keydown', setShouldKeepAlive);
        $document.off('mousedown', setShouldKeepAlive);
        $document.off('mousemove', setShouldKeepAlive);
        $interval.cancel(keepAlive.__interval);
        delete keepAlive.__interval;
    }

    function keepAlive() {
        if (shouldKeepAlive) {
            shouldKeepAlive = false;
            prototypeLockAPI.keepAlive();
        }
    }

    function setShouldKeepAlive() {
        shouldKeepAlive = true;
    }

    /**
     * @name setPrototypeViewModeData
     * @memberof npPrototype
     * @description Set the prototype view mode data
     * @param {object}
     */
    function setPrototypeViewModeData(prototypeViewModeData) {
        _prototypeViewModeData = prototypeViewModeData;
    }

    /**
     * @name getPrototypeViewModeData
     * @memberof npPrototype
     * @description Get prototype view mode data
     */
    function getPrototypeViewModeData() {
        return _prototypeViewModeData;
    }

    function setPositionsPageMap(positionsPayload) {
        _cachedPrototypeValid = false;
        return pageMapAPI.save(positionsPayload).$promise;
    }

    /**
     * @name setPrototypePromise
     * @private
     * @description Set the prototype cached promise and logs the passed error in case of failure
     * @param {Promise} promise
     * @param {string} [errorMsg]
     * @returns {Promise}
     */
    function setPrototypePromise(promise, errorMsg) {
        _cachedPrototypePromise = promise;
        _cachedPrototypeValid = true;
        _cachedPrototypePromise.then(addFullUrls).catch(function (err) {
            _cachedPrototypeValid = false;
            if (errorMsg) {
                $log.error(errorMsg, err);
            }
        });
        return _cachedPrototypePromise;
    }

    function changePageDisplayName(displayName, pageMd) {
        return prototypeAPI.updateProto({
            displayNames: [{
                pageName: pageMd.name,
                displayName: displayName
            }]
        }).$promise.then(function () {
                pageMd.displayName = displayName;
                _cachedPrototypeValid = false;
                $rootScope.$broadcast('pageRenamed', pageMd.name, displayName);
            });
    }

    function setPageDisplayName(pageName, newDisplayName) {
        return getPages().then(function (pages) {
            var pageMd = _.find(pages, {
                name: pageName
            });
            if (_.isEmpty(pageMd)) {
                return $q.reject(pageName + ' not found');
            }
            var oldPageMdDisplayName = pageMd.displayName;
            if (oldPageMdDisplayName === newDisplayName) {
                return $q.when();
            }
            updateParams();
            return uiCommandManager.execute({
                execute: changePageDisplayName.bind(this, newDisplayName, pageMd),
                unexecute: changePageDisplayName.bind(this, oldPageMdDisplayName, pageMd)
            });
        });
    }

    function getPageDisplayName(pageName) {
        return getPages().then(function (pages) {
            var pageMd = _.find(pages, {
                    name: pageName
                }) || {};
            return pageMd.displayName;
        });
    }
}
