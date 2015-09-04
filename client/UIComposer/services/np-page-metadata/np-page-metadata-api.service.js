'use strict';

var _ = require('norman-client-tp').lodash;

module.exports = npPageMetadataAPI;

npPageMetadataAPI.$inject = ['$rootScope', '$resource', '$q', '$log', 'ActiveProjectService', 'npControlMetadataPrototype'];

/**
 * @ngdoc factory
 * @name npPageMetadataAPI
 * @namespace uiComposer:services:npPageMetadata:API
 */
function npPageMetadataAPI($rootScope, $resource, $q, $log, ActiveProjectService, controlMdPrototype) {
    var pageAPI = {
        _pageMdCache: null,
        $resource: null,
        getPageMetadata: getPageMetadata,
        invalidateCachedPages: invalidateCachedPages,
        invalidateAllCachedPages: invalidateAllCachedPages
    };

    init();

    return pageAPI;

    /**
     * @private
     * @description
     * Initialize the service when it is first instantiated.
     */
    function init() {
        pageAPI._pageMdCache = {};
        updateParams();

        $rootScope.$on('projectChanged', function () {
            invalidateAllCachedPages();
            updateParams();
        });

        $rootScope.$on('UIComposer/onEnter', invalidateAllCachedPages);
        $rootScope.$on('npPrototype/recreatingPrototype', invalidateAllCachedPages);
        $rootScope.$on('pageDeleted', invalidateAllCachedPages);
    }

    /**
     * @private
     * @description
     * Update API parameters according to currently selected project.
     */
    function updateParams() {
        var pageUrl = '/api/projects/:projectId/prototype/page/';

        pageAPI.$resource = $resource(pageUrl, {
            projectId: ActiveProjectService.id
        }, {
            updatePage: {
                method: 'PUT',
                // for correct multipart sending
                headers: {
                    'Content-Type': undefined
                }
            },
            getAvailableMainEntities: {
                method: 'GET',
                url: pageUrl + 'mainEntities',
                isArray: true
            }
        });
    }

    /**
     * @name getPageMetadata
     * @memberof uiComposer:services:npPageMetadata:API
     * @description
     * Retrieve page metadata for a given page. Will return a cached version if available.
     *
     * @param {string} pageName
     * @returns {Promise} Promise object that will be resolved with the page's metadata.
     */
    function getPageMetadata(pageName) {
        if (!_.isUndefined(pageAPI._pageMdCache[pageName])) {
            return pageAPI._pageMdCache[pageName];
        }

        var pageMdPromise = pageAPI.$resource.get({
                pageName: pageName
            }).$promise
            .then(function (pageMd) {
                controlMdPrototype.setControlMdPrototype(pageMd.controls, pageMd);
                cleanPageMd(pageMd);
                return pageMd;
            })
            .catch(function (err) {
                $log.error('npPageMetadata service: failed to retrieve page metadata for page: ', pageName, ' with error: ', err);
                pageAPI._pageMdCache[pageName] = undefined;
                return $q.reject(err);
            });

        pageAPI._pageMdCache[pageName] = pageMdPromise;
        return pageMdPromise;
    }

    // ensure the property types are correct
    // TODO this should come from server
    function cleanPageMd(pageMd) {
        _.forEach(pageMd.controls, function (controlMd) {
            // clean MongoDB Ids
            delete controlMd._id;
            _.forEach(controlMd.properties, checkPropertyType);
            _.forEach(controlMd.designProperties, checkPropertyType);
            _.forEach(controlMd.floorplanProperties, checkPropertyType);
        });
    }

    function checkPropertyType(propertyMd) {
        if (_.contains(['int', 'float', 'boolean'], propertyMd.type)) {
            try {
                var parsedValue = JSON.parse(propertyMd.value);
                propertyMd.value = parsedValue;
            }
            catch (err) {
                $log.info('tried to parse', propertyMd);
            }
        }
    }

    /**
     * @name invalidateCachedPages
     * @memberof uiComposer:services:npPageMetadata:API
     *
     * @param {string[]} pageNames
     */
    function invalidateCachedPages(pageNames) {
        _.forEach(pageNames, function (pageName) {
            pageAPI._pageMdCache[pageName] = undefined;
            delete pageAPI._pageMdCache[pageName];
        });
    }

    /**
     * @name invalidateAllCachedPages
     * @memberof uiComposer:services:npPageMetadata:API
     */
    function invalidateAllCachedPages() {
        pageAPI._pageMdCache = {};
    }
}
